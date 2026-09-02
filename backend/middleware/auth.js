const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            console.log("🔵 Auth: middleware started");

            const token = req.header("Authorization")?.replace("Bearer ", "");

            if (!token) {
                console.log("🔴 Auth: no token provided");

                return res.status(401).json({
                    message: "Access denied. No token provided."
                });
            }

            console.log("🔵 Auth: token received");

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            console.log("🟡 Auth: token verified", {
                userId: decoded.userId || decoded.id
            });

            const user = await User.findById(
                decoded.userId || decoded.id
            ).select("-password");

            console.log(
                "🟢 Auth: user lookup completed",
                user
                    ? {
                        id: user._id,
                        email: user.email,
                        role: user.role,
                        isActive: user.isActive
                    }
                    : "USER NOT FOUND"
            );

            if (!user) {
                return res.status(401).json({
                    message: "Invalid token. User not found."
                });
            }

            if (!user.isActive) {
                console.log(
                    "🔴 Auth: account is deactivated",
                    user.email
                );

                return res.status(403).json({
                    message: "Account is deactivated."
                });
            }

            // Check role permissions
            if (
                allowedRoles.length > 0 &&
                !allowedRoles.includes(user.role)
            ) {
                console.log(
                    `🔴 Permission denied - Required: ${allowedRoles}, User has: ${user.role}`
                );

                return res.status(403).json({
                    message: "Access denied. Insufficient permissions.",
                    requiredRoles: allowedRoles,
                    userRole: user.role
                });
            }

            console.log(
                `🟢 Access granted - User: ${user.email}, Role: ${user.role}`
            );

            req.user = user;

            console.log("🟢 Auth: calling next()");

            next();

        } catch (error) {
            console.error(
                "🔴 Auth middleware error:",
                error
            );

            return res.status(401).json({
                message: "Invalid token."
            });
        }
    };
};

module.exports = authMiddleware;