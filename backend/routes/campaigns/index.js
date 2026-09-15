const express = require("express");
const Campaign = require("../../models/Campaign");
const NGO = require("../../models/NGO");
const authMiddleware = require("../../middleware/auth");
const upload = require("../../middleware/uploadMiddleware");

const router = express.Router();


// ============================================================
// GET ALL APPROVED & ACTIVE CAMPAIGNS
// Used by donors/public campaign pages
// ============================================================
router.get("/", async (req, res) => {
    try {
        const {
            category,
            search,
            limit = 10,
            page = 1
        } = req.query;

        // Only campaigns approved by admin and activated
        let query = {
            isActive: true,
            approvalStatus: "approved"
        };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                {
                    title: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    campaignName: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: search,
                        $options: "i"
                    }
                }
            ];
        }

        const campaigns = await Campaign.find(query)
            .populate("ngoId", "ngoName email")
            .limit(parseInt(limit))
            .skip(
                (parseInt(page) - 1) *
                parseInt(limit)
            )
            .sort({ createdAt: -1 });

        const total = await Campaign.countDocuments(query);

        res.json({
            campaigns,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(
                    total / parseInt(limit)
                )
            }
        });

    } catch (error) {
        console.error(
            "Error fetching campaigns:",
            error
        );

        res.status(500).json({
            message: "Error fetching campaigns",
            error: error.message
        });
    }
});


// ============================================================
// GET NGO'S OWN CAMPAIGNS
// IMPORTANT: This MUST come BEFORE /:id
// ============================================================
router.get(
    "/my-campaigns",
    authMiddleware(["ngo"]),
    async (req, res) => {
        try {
            const userId =
                req.user._id || req.user.id;

            const campaigns = await Campaign.find({
                createdBy: userId
            })
                .populate(
                    "ngoId",
                    "ngoName email website"
                )
                .sort({
                    createdAt: -1
                });

            res.json({
                campaigns
            });

        } catch (error) {
            console.error(
                "Error fetching NGO campaigns:",
                error
            );

            res.status(500).json({
                message: "Error fetching my campaigns",
                error: error.message
            });
        }
    }
);


// ============================================================
// GET SINGLE CAMPAIGN
// ============================================================
router.get("/:id", async (req, res) => {
    try {
        const campaign = await Campaign.findById(
            req.params.id
        )
            .populate(
                "ngoId",
                "ngoName email website"
            );

        if (!campaign) {
            return res.status(404).json({
                message: "Campaign not found"
            });
        }

        res.json(campaign);

    } catch (error) {
        console.error(
            "Error fetching campaign:",
            error
        );

        res.status(500).json({
            message: "Error fetching campaign",
            error: error.message
        });
    }
});


// ============================================================
// CREATE CAMPAIGN - NGO ONLY
// ============================================================
router.post(
    "/",
    authMiddleware(["ngo"]),
    upload.fields([
        {
            name: "campaignImage",
            maxCount: 1
        },
        {
            name: "documents",
            maxCount: 5
        }
    ]),
    async (req, res) => {
        try {
            const userId =
                req.user._id || req.user.id;

            const ngo = await NGO.findOne({
                userId
            });

            if (!ngo) {
                return res.status(404).json({
                    message: "NGO profile not found"
                });
            }

            const campaignData = {
                ...req.body,

                // Associate campaign with NGO profile
                ngoId: ngo._id,

                // Associate campaign with logged-in user
                createdBy: userId,

                // New NGO campaigns require admin approval
                approvalStatus: "pending",

                // Keep inactive until approved
                isActive: false
            };

            if (req.files?.campaignImage) {
                campaignData.image =
                    `/uploads/campaign/image/${req.files.campaignImage[0].filename}`;
            }

            if (req.files?.documents) {
                campaignData.documents =
                    req.files.documents.map(
                        file =>
                            `/uploads/campaign/documents/${file.filename}`
                    );
            }

            const campaign =
                new Campaign(campaignData);

            await campaign.save();

            res.status(201).json({
                message:
                    "Campaign created successfully",
                campaign
            });

        } catch (error) {
            console.error(
                "Error creating campaign:",
                error
            );

            res.status(500).json({
                message: "Error creating campaign",
                error: error.message
            });
        }
    }
);


// ============================================================
// UPLOAD CAMPAIGN IMAGES
// NGO ONLY
//
// The frontend creates the campaign first and then calls:
//
// POST /api/campaigns/:id/images
//
// This route handles that second step.
// ============================================================
router.post(
    "/:id/images",
    authMiddleware(["ngo"]),
    upload.fields([
        {
            name: "images",
            maxCount: 10
        },
        {
            name: "campaignImage",
            maxCount: 10
        }
    ]),
    async (req, res) => {
        try {
            const campaignId = req.params.id;

            const userId =
                req.user._id || req.user.id;

            // Find only a campaign belonging to
            // the currently logged-in NGO/user.
            const campaign =
                await Campaign.findOne({
                    _id: campaignId,
                    createdBy: userId
                });

            if (!campaign) {
                return res.status(404).json({
                    message:
                        "Campaign not found or unauthorized"
                });
            }

            // Collect files regardless of whether
            // frontend sends "images" or "campaignImage".
            const uploadedFiles = [
                ...(req.files?.images || []),
                ...(req.files?.campaignImage || [])
            ];

            if (uploadedFiles.length === 0) {
                return res.status(400).json({
                    message:
                        "No campaign images were uploaded"
                });
            }

            // Convert uploaded files to paths.
            const imagePaths =
                uploadedFiles.map(
                    file =>
                        `/uploads/campaign/image/${file.filename}`
                );

            // Existing images are preserved.
            const existingImages =
                Array.isArray(campaign.images)
                    ? campaign.images
                    : [];

            campaign.images = [
                ...existingImages,
                ...imagePaths
            ];

            // If the Campaign model uses "image"
            // as the main image field, set the first
            // uploaded image when one doesn't exist.
            if (
                !campaign.image &&
                imagePaths.length > 0
            ) {
                campaign.image =
                    imagePaths[0];
            }

            await campaign.save();

            res.status(200).json({
                message:
                    "Campaign images uploaded successfully",
                images: imagePaths,
                campaign
            });

        } catch (error) {
            console.error(
                "Error uploading campaign images:",
                error
            );

            res.status(500).json({
                message:
                    "Error uploading campaign images",
                error: error.message
            });
        }
    }
);


// ============================================================
// UPDATE CAMPAIGN
// NGO can update own campaign
// Admin can update any campaign
// ============================================================
router.put(
    "/:id",
    authMiddleware(["ngo", "admin"]),
    async (req, res) => {
        try {
            const {
                id
            } = req.params;

            const {
                role
            } = req.user;

            const userId =
                req.user._id || req.user.id;

            let query = {
                _id: id
            };

            // NGO can only update its own campaigns
            if (role !== "admin") {
                query.createdBy = userId;
            }

            const campaign =
                await Campaign.findOneAndUpdate(
                    query,
                    req.body,
                    {
                        new: true
                    }
                );

            if (!campaign) {
                return res.status(404).json({
                    message:
                        "Campaign not found or unauthorized"
                });
            }

            res.json({
                message:
                    "Campaign updated successfully",
                campaign
            });

        } catch (error) {
            console.error(
                "Error updating campaign:",
                error
            );

            res.status(500).json({
                message:
                    "Error updating campaign",
                error: error.message
            });
        }
    }
);


// ============================================================
// DELETE CAMPAIGN
// NGO can delete own campaign
// Admin can delete any campaign
// ============================================================
router.delete(
    "/:id",
    authMiddleware(["ngo", "admin"]),
    async (req, res) => {
        try {
            const {
                id
            } = req.params;

            const {
                role
            } = req.user;

            const userId =
                req.user._id || req.user.id;

            let query = {
                _id: id
            };

            // NGO can only delete its own campaigns
            if (role !== "admin") {
                query.createdBy = userId;
            }

            const campaign =
                await Campaign.findOneAndDelete(
                    query
                );

            if (!campaign) {
                return res.status(404).json({
                    message:
                        "Campaign not found or unauthorized"
                });
            }

            res.json({
                message:
                    "Campaign deleted successfully"
            });

        } catch (error) {
            console.error(
                "Error deleting campaign:",
                error
            );

            res.status(500).json({
                message:
                    "Error deleting campaign",
                error: error.message
            });
        }
    }
);


module.exports = router;