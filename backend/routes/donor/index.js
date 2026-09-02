const express = require('express');
const router = express.Router();

const auth = require('../../middleware/auth');
const Campaign = require('../../models/Campaign');
const Donation = require('../../models/Donation');
const NGO = require('../../models/NGO');
const User = require('../../models/User');

const {
    createSuccessResponse,
    createErrorResponse
} = require('../../utils/errorHandler');


// ============================================================
// GET DONOR DASHBOARD STATS
// ============================================================

router.get('/dashboard', auth(), async (req, res) => {
    try {
        const mongoose = require('mongoose');

        console.log('📊 Dashboard request received');
        console.log('👤 User ID:', req.user.id);

        const userId = new mongoose.Types.ObjectId(req.user.id);

        console.log('🔍 Running totalDonations...');
        const totalDonations = await Donation.countDocuments({
            donorId: userId,
            status: 'Completed'
        });
        console.log('✅ totalDonations:', totalDonations);

        console.log('🔍 Running totalAmount...');
        const totalAmount = await Donation.aggregate([
            {
                $match: {
                    donorId: userId,
                    status: 'Completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: '$amount'
                    }
                }
            }
        ]);
        console.log('✅ totalAmount:', totalAmount);

        console.log('🔍 Running recentDonations...');
        const recentDonations = await Donation.find({
            donorId: userId
        })
            .populate('campaignId', 'title')
            .sort({ createdAt: -1 })
            .limit(5);

        console.log('✅ recentDonations:', recentDonations.length);

        console.log('🔍 Running supportedCampaigns...');
        const supportedCampaigns = await Donation.distinct('campaignId', {
            donorId: userId,
            status: 'Completed'
        });
        console.log('✅ supportedCampaigns:', supportedCampaigns.length);

        console.log('🔍 Running supportedNgos...');
        const supportedNgos = await Donation.aggregate([
            {
                $match: {
                    donorId: userId,
                    status: 'Completed'
                }
            },
            {
                $lookup: {
                    from: 'campaigns',
                    localField: 'campaignId',
                    foreignField: '_id',
                    as: 'campaign'
                }
            },
            {
                $unwind: '$campaign'
            },
            {
                $group: {
                    _id: '$campaign.ngoId'
                }
            },
            {
                $count: 'total'
            }
        ]);

        console.log('✅ supportedNgos:', supportedNgos);

        const stats = {
            totalDonations,
            totalAmount: totalAmount[0]?.total || 0,
            supportedCampaigns: supportedCampaigns.length,
            supportedNgos: supportedNgos[0]?.total || 0,
            recentDonations
        };

        console.log('🎯 Final dashboard stats:', stats);

        createSuccessResponse(res, 200, { stats });

    } catch (error) {
        console.error('❌ Dashboard Error:', error);

        createErrorResponse(
            res,
            500,
            'Failed to fetch dashboard stats',
            error.message
        );
    }
});

// ============================================================
// GET DONOR'S DONATIONS
// ============================================================

router.get('/donations', auth(), async (req, res) => {
    try {
        const userId = req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [donations, total] = await Promise.all([
            Donation.find({
                donorId: userId
            })
                .populate('campaignId', 'title ngoId')
                .populate({
                    path: 'campaignId',
                    populate: {
                        path: 'ngoId',
                        select: 'ngoName email'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            Donation.countDocuments({
                donorId: userId
            })
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
        createErrorResponse(
            res,
            500,
            'Failed to fetch donations',
            error.message
        );
    }
});


// ============================================================
// GET AVAILABLE CAMPAIGNS FOR DONOR
// ============================================================

router.get('/campaigns', auth(), async (req, res) => {
    try {
        console.log('🔵 Donor campaigns route reached');

        const page = Math.max(
            parseInt(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 12, 1),
            50
        );

        const skip = (page - 1) * limit;

        const search = String(
            req.query.search || ''
        ).trim();

        const category = String(
            req.query.category || ''
        ).trim();

        const query = {
            isActive: true,
            approvalStatus: 'approved',
            endDate: {
                $gte: new Date()
            }
        };

        if (search) {
            query.$or = [
                {
                    title: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    description: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    campaignName: {
                        $regex: search,
                        $options: 'i'
                    }
                }
            ];
        }

        if (category) {
            query.category = category;
        }

        console.log(
            '🔵 Donor campaigns: starting query',
            query
        );

        const [campaigns, total] = await Promise.all([
            Campaign.find(query)
                .populate(
                    'ngoId',
                    'ngoName email logo contactNumber'
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Campaign.countDocuments(query)
        ]);

        console.log(
            '🟢 Donor campaigns: query completed',
            {
                campaigns: campaigns.length,
                total
            }
        );

        return res.status(200).json({
            success: true,
            data: {
                campaigns,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error(
            '🔴 Donor campaigns error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch campaigns',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined
        });
    }
});


// ============================================================
// GET NGOs FOR DONOR
// ============================================================

router.get('/ngos', auth(), async (req, res) => {
    try {
        console.log('🟣 Donor NGOs route reached');

        const page = Math.max(
            parseInt(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 12, 1),
            50
        );

        const skip = (page - 1) * limit;

        const search = String(
            req.query.search || ''
        ).trim();

        const query = {
            isActive: true
        };

        if (search) {
            query.$or = [
                {
                    ngoName: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    email: {
                        $regex: search,
                        $options: 'i'
                    }
                },
                {
                    address: {
                        $regex: search,
                        $options: 'i'
                    }
                }
            ];
        }

        console.log(
            '🟣 Donor NGOs query:',
            query
        );

        const [ngos, total] = await Promise.all([
            NGO.find(query)
                .select(
                    'ngoName email contactNumber address website authorizedPerson logo ngoType is80GCertified is12ACertified'
                )
                .sort({
                    ngoName: 1
                })
                .skip(skip)
                .limit(limit)
                .lean(),

            NGO.countDocuments(query)
        ]);

        console.log(
            '🟢 Donor NGOs query completed:',
            {
                ngosFound: ngos.length,
                total
            }
        );

        const formattedNgos = ngos.map((ngo) => ({
            _id: ngo._id,
            organizationName: ngo.ngoName,
            description: '',
            profileImage: ngo.logo || null,
            email: ngo.email || '',
            contactNumber: ngo.contactNumber || '',
            website: ngo.website || '',
            location: {
                city: '',
                state: '',
                address: ngo.address || ''
            },
            ngoType: ngo.ngoType || null,
            is80GCertified: ngo.is80GCertified || false,
            is12ACertified: ngo.is12ACertified || false,
            authorizedPerson: ngo.authorizedPerson || null
        }));

        console.log(
            '🟢 Formatted NGOs:',
            formattedNgos.length
        );

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
        console.error(
            '🔴 Donor NGOs error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch NGOs',
            error:
                process.env.NODE_ENV === 'development'
                    ? error.message
                    : undefined
        });
    }
});


// ============================================================
// GET DONOR PROFILE
// ============================================================

router.get('/profile', auth(), async (req, res) => {
    try {
        const user = await User.findById(
            req.user.id
        ).select('-password');

        if (!user) {
            return createErrorResponse(
                res,
                404,
                'User not found'
            );
        }

        createSuccessResponse(
            res,
            200,
            { user }
        );

    } catch (error) {
        createErrorResponse(
            res,
            500,
            'Failed to fetch profile',
            error.message
        );
    }
});


// ============================================================
// UPDATE DONOR PROFILE
// ============================================================

router.put('/profile', auth(), async (req, res) => {
    try {
        const {
            fullName,
            email,
            phoneNumber
        } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                fullName,
                email,
                phoneNumber,
                updatedAt: new Date()
            },
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!user) {
            return createErrorResponse(
                res,
                404,
                'User not found'
            );
        }

        createSuccessResponse(
            res,
            200,
            { user }
        );

    } catch (error) {
        createErrorResponse(
            res,
            500,
            'Failed to update profile',
            error.message
        );
    }
});


// ============================================================
// GET DONATION REPORTS
// ============================================================

// ============================================================
// GET DONATION REPORTS
// ============================================================

router.get('/reports', auth(), async (req, res) => {
    try {
        const mongoose = require('mongoose');

        // Convert logged-in user's ID to MongoDB ObjectId
        // Aggregation does not automatically cast string IDs.
        const userId = new mongoose.Types.ObjectId(req.user.id);

        const year =
            parseInt(req.query.year) ||
            new Date().getFullYear();

        const [
            monthlyStats,
            categoryStats,
            topNgos,
            totalStats
        ] = await Promise.all([

            // ------------------------------------------------
            // MONTHLY DONATION STATISTICS
            // ------------------------------------------------
            Donation.aggregate([
                {
                    $match: {
                        donorId: userId,
                        status: 'Completed',
                        createdAt: {
                            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                            $lte: new Date(`${year}-12-31T23:59:59.999Z`)
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            $month: '$createdAt'
                        },
                        amount: {
                            $sum: '$amount'
                        },
                        count: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        '_id': 1
                    }
                }
            ]),

            // ------------------------------------------------
            // CATEGORY-WISE DONATION STATISTICS
            // ------------------------------------------------
            Donation.aggregate([
                {
                    $match: {
                        donorId: userId,
                        status: 'Completed'
                    }
                },
                {
                    $lookup: {
                        from: 'campaigns',
                        localField: 'campaignId',
                        foreignField: '_id',
                        as: 'campaign'
                    }
                },
                {
                    $unwind: '$campaign'
                },
                {
                    $group: {
                        _id: '$campaign.category',
                        amount: {
                            $sum: '$amount'
                        },
                        count: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        amount: -1
                    }
                }
            ]),

            // ------------------------------------------------
            // TOP NGOs
            // ------------------------------------------------
            Donation.aggregate([
                {
                    $match: {
                        donorId: userId,
                        status: 'Completed'
                    }
                },
                {
                    $lookup: {
                        from: 'campaigns',
                        localField: 'campaignId',
                        foreignField: '_id',
                        as: 'campaign'
                    }
                },
                {
                    $unwind: '$campaign'
                },
                {
                    $lookup: {
                        from: 'ngos',
                        localField: 'campaign.ngoId',
                        foreignField: '_id',
                        as: 'ngo'
                    }
                },
                {
                    $unwind: '$ngo'
                },
                {
                    $group: {
                        _id: '$ngo._id',
                        ngoName: {
                            $first: '$ngo.ngoName'
                        },
                        amount: {
                            $sum: '$amount'
                        },
                        count: {
                            $sum: 1
                        }
                    }
                },
                {
                    $sort: {
                        amount: -1
                    }
                },
                {
                    $limit: 5
                }
            ]),

            // ------------------------------------------------
            // TOTAL DONATION STATISTICS
            // ------------------------------------------------
            Donation.aggregate([
                {
                    $match: {
                        donorId: userId,
                        status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: {
                            $sum: '$amount'
                        },
                        totalCount: {
                            $sum: 1
                        },
                        avgAmount: {
                            $avg: '$amount'
                        }
                    }
                }
            ])
        ]);

        createSuccessResponse(res, 200, {
            year,
            monthlyStats,
            categoryStats,
            topNgos,
            totalStats:
                totalStats[0] || {
                    totalAmount: 0,
                    totalCount: 0,
                    avgAmount: 0
                }
        });

    } catch (error) {
        console.error('Reports Error:', error);

        createErrorResponse(
            res,
            500,
            'Failed to fetch reports',
            error.message
        );
    }
});


module.exports = router;