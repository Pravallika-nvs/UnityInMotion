const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Campaign = require('../../models/Campaign');
const Donation = require('../../models/Donation');
const NGO = require('../../models/NGO');
const User = require('../../models/User');
const { createSuccessResponse, createErrorResponse } = require('../../utils/errorHandler');

// Get donor dashboard stats
router.get('/dashboard', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const [
            totalDonations,
            totalAmount,
            recentDonations,
            supportedCampaigns,
            supportedNgos
        ] = await Promise.all([
            Donation.countDocuments({ donorId: userId, status: 'Completed' }),
            Donation.aggregate([
                { $match: { donorId: userId, status: 'Completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Donation.find({ donorId: userId })
                .populate('campaignId', 'title')
                .sort({ createdAt: -1 })
                .limit(5),
            Donation.distinct('campaignId', { donorId: userId, status: 'Completed' }),
            Donation.aggregate([
                { $match: { donorId: userId, status: 'Completed' } },
                { $lookup: { from: 'campaigns', localField: 'campaignId', foreignField: '_id', as: 'campaign' } },
                { $unwind: '$campaign' },
                { $group: { _id: '$campaign.ngoId' } },
                { $count: 'total' }
            ])
        ]);

        const stats = {
            totalDonations,
            totalAmount: totalAmount[0]?.total || 0,
            supportedCampaigns: supportedCampaigns.length,
            supportedNgos: supportedNgos[0]?.total || 0,
            recentDonations
        };

        createSuccessResponse(res, 200, { stats });
    } catch (error) {
        createErrorResponse(res, 500, 'Failed to fetch dashboard stats', error.message);
    }
});

// Get donor's donations
router.get('/donations', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [donations, total] = await Promise.all([
            Donation.find({ donorId: userId })
                .populate('campaignId', 'title ngoId')
                .populate({
                    path: 'campaignId',
                    populate: {
                        path: 'ngoId',
                        select: 'organizationName'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Donation.countDocuments({ donorId: userId })
        ]);

        createSuccessResponse(res, 200, {
            donations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        createErrorResponse(res, 500, 'Failed to fetch donations', error.message);
    }
});

// Get available campaigns for donor
router.get('/campaigns', auth, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
        const skip = (page - 1) * limit;

        const search = String(req.query.search || '').trim();
        const category = String(req.query.category || '').trim();

        const query = {
            isActive: true,
            approvalStatus: 'approved',
            endDate: { $gte: new Date() }
        };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { campaignName: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        const [campaigns, total] = await Promise.all([
            Campaign.find(query)
                .populate('ngoId', 'ngoName email logo contactNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Campaign.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            campaigns,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Donor campaigns error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch campaigns',
            error: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
});

// Get NGOs for donor
router.get('/ngos', auth, async (req, res) => {
    try {
        console.log('🟣 NGO route started');

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
        const skip = (page - 1) * limit;

        const search = String(req.query.search || '').trim();

        const query = {
            isActive: true
        };

        if (search) {
            query.$or = [
                { ngoName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contactNumber: { $regex: search, $options: 'i' } },
                { address: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('🟣 NGO query:', JSON.stringify(query));

        const [ngos, total] = await Promise.all([
            NGO.find(query)
                .select('ngoName email contactNumber address website logo isActive')
                .sort({ ngoName: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            NGO.countDocuments(query)
        ]);

        console.log('🟢 NGO database query completed');
        console.log('🟢 NGOs found:', ngos.length);
        console.log('🟢 Total NGOs:', total);

        const formattedNgos = ngos.map((ngo) => ({
            _id: ngo._id,
            organizationName: ngo.ngoName,
            description: ngo.address || 'NGO organization',
            profileImage: ngo.logo || undefined,
            location: {
                city: '',
                state: ''
            },
            email: ngo.email,
            contactNumber: ngo.contactNumber,
            website: ngo.website
        }));

        console.log('🟢 Formatted NGOs:', formattedNgos);

        console.log('🟢 Sending NGO response');

        return res.status(200).json({
            success: true,
            data: {
                ngos: formattedNgos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('🔴 Donor NGOs error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch NGOs',
            error: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
});

// Get donor profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return createErrorResponse(res, 404, 'User not found');
        }

        createSuccessResponse(res, 200, { user });
    } catch (error) {
        createErrorResponse(res, 500, 'Failed to fetch profile', error.message);
    }
});

// Update donor profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { fullName, email, phone, bio } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { fullName, email, phone, bio, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        createSuccessResponse(res, 200, { user });
    } catch (error) {
        createErrorResponse(res, 500, 'Failed to update profile', error.message);
    }
});

// Get donation reports
router.get('/reports', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const [
            monthlyStats,
            categoryStats,
            topNgos,
            totalStats
        ] = await Promise.all([
            Donation.aggregate([
                {
                    $match: {
                        donorId: userId,
                        status: 'Completed',
                        createdAt: {
                            $gte: new Date(`${year}-01-01`),
                            $lte: new Date(`${year}-12-31`)
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id': 1 } }
            ]),

            Donation.aggregate([
                { $match: { donorId: userId, status: 'Completed' } },
                {
                    $lookup: {
                        from: 'campaigns',
                        localField: 'campaignId',
                        foreignField: '_id',
                        as: 'campaign'
                    }
                },
                { $unwind: '$campaign' },
                {
                    $group: {
                        _id: '$campaign.category',
                        amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { amount: -1 } }
            ]),

            Donation.aggregate([
                { $match: { donorId: userId, status: 'Completed' } },
                {
                    $lookup: {
                        from: 'campaigns',
                        localField: 'campaignId',
                        foreignField: '_id',
                        as: 'campaign'
                    }
                },
                { $unwind: '$campaign' },
                {
                    $lookup: {
                        from: 'ngos',
                        localField: 'campaign.ngoId',
                        foreignField: '_id',
                        as: 'ngo'
                    }
                },
                { $unwind: '$ngo' },
                {
                    $group: {
                        _id: '$ngo._id',
                        ngoName: { $first: '$ngo.organizationName' },
                        amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { amount: -1 } },
                { $limit: 5 }
            ]),

            Donation.aggregate([
                { $match: { donorId: userId, status: 'Completed' } },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' },
                        totalCount: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                }
            ])
        ]);

        createSuccessResponse(res, 200, {
            year,
            monthlyStats,
            categoryStats,
            topNgos,
            totalStats: totalStats[0] || {
                totalAmount: 0,
                totalCount: 0,
                avgAmount: 0
            }
        });
    } catch (error) {
        createErrorResponse(res, 500, 'Failed to fetch reports', error.message);
    }
});

module.exports = router;