const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    companyName: { type: String, required: true },
    companyEmail: { type: String, required: true, unique: true },
    companyPhoneNumber: { type: String, required: true },

    // Company details
    website: { type: String, default: null },
    industry: { type: String, default: null },
    description: { type: String, default: null },

    // Company status
    isActive: { type: Boolean, default: true },

    // Optional fields
    registrationNumber: { type: String, default: null },
    companyAddress: { type: String, default: null },
    ceoName: { type: String, default: null },
    ceoContactNumber: { type: String, default: null },
    ceoEmail: { type: String, default: null },
    companyType: { type: String, default: null },
    numberOfEmployees: { type: Number, default: null },
    companyLogo: { type: String, default: null },

}, { timestamps: true });

module.exports = mongoose.model("Company", CompanySchema);