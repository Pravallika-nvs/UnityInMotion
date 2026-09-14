const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");

const router = express.Router();

// ============================================================
// Multer configuration
// ============================================================

const storage = multer.memoryStorage();

const upload = multer({
    storage,

    limits: {
        files: 5,
        fileSize: 5 * 1024 * 1024, // 5 MB per file
    },

    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
        ];

        const allowedExtensions = [
            ".pdf",
            ".doc",
            ".docx",
            ".jpg",
            ".jpeg",
            ".png",
        ];

        const extension = `.${file.originalname
            .split(".")
            .pop()
            .toLowerCase()}`;

        if (
            allowedMimeTypes.includes(file.mimetype) ||
            allowedExtensions.includes(extension)
        ) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Invalid file type. Allowed files: PDF, DOC, DOCX, JPG, JPEG, PNG."
                )
            );
        }
    },
});

// ============================================================
// Nodemailer
// ============================================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.CONTACT_EMAIL,
        pass: process.env.CONTACT_EMAIL_PASSWORD,
    },
});

// ============================================================
// Contact Us
// ============================================================

router.post("/", upload.array("attachments", 5), async (req, res) => {
    console.log("📩 CONTACT ROUTE HIT");

    try {
        const {
            name,
            email,
            subject,
            message,
        } = req.body;

        const attachments = req.files || [];

        console.log("📋 Contact form data received:", {
            name,
            email,
            subject,
            messageReceived: !!message,
            attachments: attachments.map(file => file.originalname),
        });

        // --------------------------------------------------------
        // Validate required fields
        // --------------------------------------------------------

        if (
            !name?.trim() ||
            !email?.trim() ||
            !subject?.trim() ||
            !message?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, subject and message are required.",
            });
        }

        console.log("📎 Attachments received:", attachments.length);

        // --------------------------------------------------------
        // Prepare email attachments
        // --------------------------------------------------------

        const emailAttachments = attachments.map(file => ({
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype,
        }));

        console.log("📤 Attempting to send contact email...");

        // --------------------------------------------------------
        // Send email
        // --------------------------------------------------------

        const info = await transporter.sendMail({
            from: `"DonationHub Contact" <${process.env.CONTACT_EMAIL}>`,

            to: process.env.ADMIN_EMAIL,

            replyTo: email.trim(),

            subject: `DonationHub Contact: ${subject.trim()}`,

            text: `
Name: ${name.trim()}
Email: ${email.trim()}
Subject: ${subject.trim()}

Message:
${message.trim()}

Attachments:
${
    attachments.length > 0
        ? attachments.map(file => file.originalname).join(", ")
        : "None"
}
            `,

            html: `
                <h2>New DonationHub Contact Message</h2>

                <p>
                    <strong>Name:</strong> ${name.trim()}
                </p>

                <p>
                    <strong>Email:</strong> ${email.trim()}
                </p>

                <p>
                    <strong>Subject:</strong> ${subject.trim()}
                </p>

                <h3>Message:</h3>

                <p>
                    ${message
                        .trim()
                        .replace(/\n/g, "<br>")}
                </p>

                ${
                    attachments.length > 0
                        ? `
                            <h3>Attachments:</h3>
                            <ul>
                                ${attachments
                                    .map(
                                        file =>
                                            `<li>${file.originalname}</li>`
                                    )
                                    .join("")}
                            </ul>
                        `
                        : ""
                }
            `,

            // Attach uploaded files to the email
            attachments: emailAttachments,
        });

        console.log("✅ CONTACT EMAIL SENT");

        console.log("📧 Email information:", {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
        });

        return res.status(200).json({
            success: true,
            message: "Message sent successfully.",
        });

    } catch (error) {
        console.error("❌ Contact email error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to send message.",
        });
    }
});

module.exports = router;