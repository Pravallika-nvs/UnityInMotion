const express = require("express");
const Notice = require("../../models/Notice");
const User = require("../../models/User");
const authMiddleware = require("../../middleware/auth");
const Activity = require("../../models/Activity");
const nodemailer = require("nodemailer");

const router = express.Router();

// --------------------------------------------------
// EMAIL CONFIGURATION
// --------------------------------------------------

const emailUser =
    process.env.CONTACT_EMAIL ||
    process.env.EMAIL_ID;

const emailPass =
    process.env.CONTACT_EMAIL_PASSWORD ||
    process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: emailUser,
        pass: emailPass
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50
});

// --------------------------------------------------
// GET ALL NOTICES
// --------------------------------------------------

router.get("/", authMiddleware(["admin"]), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            type,
            priority,
            targetRole,
            status,
            search
        } = req.query;

        let query = {};

        if (type) query.type = type;
        if (priority) query.priority = priority;
        if (targetRole) query.targetRole = targetRole;
        if (status) query.isActive = status === "active";

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } }
            ];
        }

        const notices = await Notice.find(query)
            .populate("createdBy", "fullName email")
            .populate("targetUsers", "fullName email role")
            .populate("readBy.user", "fullName email")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Notice.countDocuments(query);

        const stats = await Notice.aggregate([
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            notices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats
        });
    } catch (error) {
        console.error("❌ Error fetching notices:", error);

        res.status(500).json({
            success: false,
            message: "Error fetching notices",
            error: error.message
        });
    }
});

// --------------------------------------------------
// CREATE NOTICE
// --------------------------------------------------

router.post("/", authMiddleware(["admin"]), async (req, res) => {
    try {
        const {
            title,
            content,
            type = "info",
            priority = "medium",
            targetRole,
            targetUsers,
            sendEmail = false,
            scheduledAt
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Title and content are required"
            });
        }

        const notice = new Notice({
            title,
            content,
            type,
            priority,
            targetRole,
            targetUsers,
            sendEmail,
            scheduledAt: scheduledAt
                ? new Date(scheduledAt)
                : null,
            createdBy: req.user.id
        });

        await notice.save();

        if (!scheduledAt) {
            const sendResult = await sendNoticeToUsers(notice);

            if (sendEmail && !sendResult.success) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Notice created, but email sending failed",
                    error: sendResult.error,
                    notice
                });
            }
        }

        await Activity.create({
            userId: req.user.id,
            action: "admin_create_notice",
            description: `Admin created notice: ${title}`,
            metadata: {
                noticeId: notice._id,
                type,
                priority
            }
        });

        res.status(201).json({
            success: true,
            message: sendEmail
                ? "Notice created and emails sent successfully"
                : "Notice created successfully",
            notice
        });
    } catch (error) {
        console.error("❌ Error creating notice:", error);

        res.status(500).json({
            success: false,
            message: "Error creating notice",
            error: error.message
        });
    }
});

// --------------------------------------------------
// GET NOTICE BY ID
// --------------------------------------------------

router.get("/:id", authMiddleware(["admin"]), async (req, res) => {
    try {
        const { id } = req.params;

        const notice = await Notice.findById(id)
            .populate("createdBy", "fullName email")
            .populate("targetUsers", "fullName email role")
            .populate("readBy.user", "fullName email");

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        res.json({
            success: true,
            notice
        });
    } catch (error) {
        console.error("❌ Error fetching notice:", error);

        res.status(500).json({
            success: false,
            message: "Error fetching notice",
            error: error.message
        });
    }
});

// --------------------------------------------------
// UPDATE NOTICE
// --------------------------------------------------

router.put("/:id", authMiddleware(["admin"]), async (req, res) => {
    try {
        const { id } = req.params;

        const notice = await Notice.findByIdAndUpdate(
            id,
            {
                ...req.body,
                updatedAt: new Date()
            },
            {
                new: true
            }
        ).populate("createdBy", "fullName email");

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        await Activity.create({
            userId: req.user.id,
            action: "admin_update_notice",
            description: `Admin updated notice: ${notice.title}`,
            metadata: {
                noticeId: id
            }
        });

        res.json({
            success: true,
            message: "Notice updated successfully",
            notice
        });
    } catch (error) {
        console.error("❌ Error updating notice:", error);

        res.status(500).json({
            success: false,
            message: "Error updating notice",
            error: error.message
        });
    }
});

// --------------------------------------------------
// DELETE NOTICE
// --------------------------------------------------

router.delete("/:id", authMiddleware(["admin"]), async (req, res) => {
    try {
        const { id } = req.params;

        const notice = await Notice.findByIdAndDelete(id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        await Activity.create({
            userId: req.user.id,
            action: "admin_delete_notice",
            description: `Admin deleted notice: ${notice.title}`,
            metadata: {
                deletedNoticeId: id
            }
        });

        res.json({
            success: true,
            message: "Notice deleted successfully"
        });
    } catch (error) {
        console.error("❌ Error deleting notice:", error);

        res.status(500).json({
            success: false,
            message: "Error deleting notice",
            error: error.message
        });
    }
});

// --------------------------------------------------
// SEND NOTICE
// --------------------------------------------------

router.post("/:id/send", authMiddleware(["admin"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body;

        const notice = await Notice.findById(id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        if (userIds && userIds.length > 0) {
            notice.targetUsers = [
                ...new Set([
                    ...notice.targetUsers,
                    ...userIds
                ])
            ];

            await notice.save();
        }

        const sendResult = await sendNoticeToUsers(notice);

        if (!sendResult.success) {
            return res.status(500).json({
                success: false,
                message: "Failed to send notice",
                error: sendResult.error
            });
        }

        res.json({
            success: true,
            message: "Notice sent successfully",
            sentTo: sendResult.sentTo
        });
    } catch (error) {
        console.error("❌ Error sending notice:", error);

        res.status(500).json({
            success: false,
            message: "Error sending notice",
            error: error.message
        });
    }
});

// --------------------------------------------------
// MARK NOTICE AS READ
// --------------------------------------------------

router.put("/:id/read", authMiddleware(), async (req, res) => {
    try {
        const { id } = req.params;

        const notice = await Notice.findById(id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found"
            });
        }

        const alreadyRead = notice.readBy.some(
            read => read.user.toString() === req.user.id
        );

        if (!alreadyRead) {
            notice.readBy.push({
                user: req.user.id,
                readAt: new Date()
            });

            await notice.save();
        }

        res.json({
            success: true,
            message: "Notice marked as read"
        });
    } catch (error) {
        console.error(
            "❌ Error marking notice as read:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Error marking notice as read",
            error: error.message
        });
    }
});

// --------------------------------------------------
// GET USER NOTICES
// --------------------------------------------------

router.get(
    "/user/my-notices",
    authMiddleware(),
    async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                type,
                unread
            } = req.query;

            let query = {
                $or: [
                    { targetRole: "all" },
                    { targetRole: req.user.role },
                    { targetUsers: req.user.id }
                ],
                isActive: true
            };

            if (type) {
                query.type = type;
            }

            if (unread === "true") {
                query["readBy.user"] = {
                    $ne: req.user.id
                };
            }

            const notices = await Notice.find(query)
                .populate("createdBy", "fullName")
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(
                    (parseInt(page) - 1) *
                    parseInt(limit)
                );

            const total =
                await Notice.countDocuments(query);

            res.json({
                success: true,
                notices,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(
                        total / parseInt(limit)
                    )
                }
            });
        } catch (error) {
            console.error(
                "❌ Error fetching user notices:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Error fetching user notices",
                error: error.message
            });
        }
    }
);

// --------------------------------------------------
// NOTICE STATISTICS
// --------------------------------------------------

router.get(
    "/stats/overview",
    authMiddleware(["admin"]),
    async (req, res) => {
        try {
            const totalNotices =
                await Notice.countDocuments();

            const activeNotices =
                await Notice.countDocuments({
                    isActive: true
                });

            const scheduledNotices =
                await Notice.countDocuments({
                    scheduledAt: {
                        $gt: new Date()
                    }
                });

            const typeStats =
                await Notice.aggregate([
                    {
                        $group: {
                            _id: "$type",
                            count: { $sum: 1 }
                        }
                    }
                ]);

            const priorityStats =
                await Notice.aggregate([
                    {
                        $group: {
                            _id: "$priority",
                            count: { $sum: 1 }
                        }
                    }
                ]);

            const recentNotices =
                await Notice.find()
                    .populate(
                        "createdBy",
                        "fullName"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .limit(5);

            res.json({
                success: true,
                stats: {
                    totalNotices,
                    activeNotices,
                    scheduledNotices,
                    typeStats,
                    priorityStats,
                    recentNotices
                }
            });
        } catch (error) {
            console.error(
                "❌ Error fetching notice statistics:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Error fetching notice statistics",
                error: error.message
            });
        }
    }
);

// --------------------------------------------------
// SEND NOTICE TO TARGET USERS
// --------------------------------------------------

async function sendNoticeToUsers(notice) {
    try {
        let targetUsers = [];

        // Target by role
        if (
            notice.targetRole &&
            notice.targetRole !== "all"
        ) {
            const roleUsers = await User.find({
                role: notice.targetRole,
                isActive: true
            });

            targetUsers = [
                ...targetUsers,
                ...roleUsers
            ];
        }

        // Target everyone
        else if (notice.targetRole === "all") {
            const allUsers = await User.find({
                isActive: true
            });

            targetUsers = [
                ...targetUsers,
                ...allUsers
            ];
        }

        // Add specifically selected users
        if (
            notice.targetUsers &&
            notice.targetUsers.length > 0
        ) {
            const specificUsers = await User.find({
                _id: {
                    $in: notice.targetUsers
                },
                isActive: true
            });

            targetUsers = [
                ...targetUsers,
                ...specificUsers
            ];
        }

        // Remove duplicates
        targetUsers = targetUsers.filter(
            (user, index, self) =>
                index ===
                self.findIndex(
                    u =>
                        u._id.toString() ===
                        user._id.toString()
                )
        );

        console.log(
            `📧 Notice "${notice.title}" targeted to ${targetUsers.length} users`
        );

        // Send email
        if (
            notice.sendEmail &&
            targetUsers.length > 0
        ) {
            await sendEmailNotifications(
                notice,
                targetUsers
            );
        }

        notice.sentAt = new Date();
        await notice.save();

        return {
            success: true,
            sentTo: targetUsers.length
        };
    } catch (error) {
        console.error(
            "❌ Error sending notice to users:",
            error
        );

        return {
            success: false,
            error: error.message
        };
    }
}

// --------------------------------------------------
// SEND EMAILS
// --------------------------------------------------

async function sendEmailNotifications(notice, users) {
    try {
        if (!emailUser || !emailPass) {
            throw new Error(
                "Email credentials are not configured."
            );
        }

        console.log(
            `📧 Sending notice emails to ${users.length} users...`
        );

        // Verify SMTP connection
        await transporter.verify();

        console.log(
            "✅ Gmail SMTP connection verified"
        );

        const validUsers = users.filter(
            user =>
                user.email &&
                typeof user.email === "string"
        );

        console.log(
            `📧 Valid email recipients: ${validUsers.length}`
        );

        let sentCount = 0;

        for (const user of validUsers) {
            try {
                const mailOptions = {
                    from: `"Donation Platform" <${emailUser}>`,
                    to: user.email,
                    subject:
                        `[${notice.type.toUpperCase()}] ${notice.title}`,
                    html: `
                        <div style="
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        ">

                            <div style="
                                background-color: #f8f9fa;
                                padding: 20px;
                                border-radius: 8px;
                            ">

                                <h2 style="
                                    color: #333;
                                    margin-bottom: 20px;
                                ">
                                    ${notice.title}
                                </h2>

                                <div style="
                                    background-color: white;
                                    padding: 20px;
                                    border-radius: 4px;
                                    border-left: 4px solid #007bff;
                                ">
                                    <p style="
                                        color: #666;
                                        line-height: 1.6;
                                    ">
                                        ${notice.content}
                                    </p>
                                </div>

                                <div style="
                                    margin-top: 20px;
                                    padding: 15px;
                                    background-color: #e9ecef;
                                    border-radius: 4px;
                                ">
                                    <p style="
                                        margin: 0;
                                        color: #6c757d;
                                        font-size: 14px;
                                    ">
                                        <strong>Priority:</strong>
                                        ${notice.priority.toUpperCase()}
                                        &nbsp; | &nbsp;
                                        <strong>Type:</strong>
                                        ${notice.type.toUpperCase()}
                                    </p>
                                </div>

                                <p style="
                                    margin-top: 20px;
                                    color: #999;
                                    font-size: 12px;
                                ">
                                    This is an official notice
                                    from the Donation Platform.
                                </p>

                            </div>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);

                sentCount++;

                console.log(
                    `✅ Email sent to ${user.email}`
                );
            } catch (emailError) {
                console.error(
                    `❌ Failed to send email to ${user.email}:`,
                    emailError.message
                );
            }
        }

        if (sentCount === 0) {
            throw new Error(
                "No emails could be sent."
            );
        }

        console.log(
            `🎉 Successfully sent ${sentCount}/${validUsers.length} notice emails`
        );

        return {
            success: true,
            sentTo: sentCount
        };
    } catch (error) {
        console.error(
            "❌ Error sending email notifications:",
            error
        );

        throw error;
    }
}

module.exports = router;