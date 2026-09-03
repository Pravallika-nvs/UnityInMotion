const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.CONTACT_EMAIL,
        pass: process.env.CONTACT_EMAIL_PASSWORD,
    },
});

router.post("/", async (req, res) => {
    console.log("📩 CONTACT ROUTE HIT");

    try {
        const { name, email, message } = req.body;

        console.log("📋 Contact form data received:", {
            name,
            email,
            messageReceived: !!message,
        });

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        console.log("📤 Attempting to send contact email...");

        const info = await transporter.sendMail({
            from: `"DonationHub Contact" <${process.env.CONTACT_EMAIL}>`,
            to: process.env.ADMIN_EMAIL,
            replyTo: email.trim(),

            subject: `DonationHub Contact Message from ${name.trim()}`,

            text: `
Name: ${name.trim()}
Email: ${email.trim()}

Message:
${message.trim()}
            `,

            html: `
                <h2>New DonationHub Contact Message</h2>

                <p>
                    <strong>Name:</strong> ${name.trim()}
                </p>

                <p>
                    <strong>Email:</strong> ${email.trim()}
                </p>

                <h3>Message:</h3>

                <p>
                    ${message.trim().replace(/\n/g, "<br>")}
                </p>
            `,
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
            message: "Unable to send message.",
        });
    }
});

module.exports = router;