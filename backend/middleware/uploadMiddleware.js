const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================================================
// ENSURE UPLOAD DIRECTORY EXISTS
// ============================================================
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        });
    }
};


// ============================================================
// STORAGE CONFIGURATION
// ============================================================
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        let uploadPath = "uploads/";

        // Determine upload path based on file field
        switch (file.fieldname) {

            // ------------------------------------------------
            // PROFILE IMAGES / LOGOS
            // ------------------------------------------------
            case "profileImage":
            case "companyLogo":
            case "ngoLogo":

                uploadPath += "profile/";

                break;


            // ------------------------------------------------
            // CAMPAIGN IMAGES
            // IMPORTANT:
            // Both "campaignImage" and "images"
            // are campaign image fields.
            // ------------------------------------------------
            case "campaignImage":
            case "images":

                uploadPath += "campaign/image/";

                break;


            // ------------------------------------------------
            // CAMPAIGN PROOF
            // ------------------------------------------------
            case "campaignProof":

                uploadPath += "campaign/proof/";

                break;


            // ------------------------------------------------
            // DOCUMENTS
            // ------------------------------------------------
            case "documents":

                uploadPath += "documents/";

                break;


            // ------------------------------------------------
            // GENERAL FILES
            // ------------------------------------------------
            default:

                uploadPath += "general/";

                break;
        }

        ensureDirectoryExists(uploadPath);

        cb(null, uploadPath);
    },


    // ========================================================
    // UNIQUE FILE NAME
    // ========================================================
    filename: function (req, file, cb) {

        const uniqueSuffix =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1E9
            );

        const fileName =
            file.fieldname +
            "-" +
            uniqueSuffix +
            path.extname(
                file.originalname
            );

        cb(null, fileName);
    }
});


// ============================================================
// FILE FILTER
// ============================================================
const fileFilter = (req, file, cb) => {

    const allowedTypes = {

        // Profile
        profileImage:
            /jpeg|jpg|png|gif/,

        // Company logo
        companyLogo:
            /jpeg|jpg|png|gif|svg/,

        // NGO logo
        ngoLogo:
            /jpeg|jpg|png|gif|svg/,

        // Campaign image
        campaignImage:
            /jpeg|jpg|png|gif/,

        // IMPORTANT:
        // Frontend may send campaign images
        // using the "images" field.
        images:
            /jpeg|jpg|png|gif/,

        // Campaign proof
        campaignProof:
            /jpeg|jpg|png|pdf/,

        // Documents
        documents:
            /pdf|doc|docx|jpeg|jpg|png/
    };


    const allowedType =
        allowedTypes[file.fieldname] ||
        /jpeg|jpg|png|pdf/;


    const extname =
        allowedType.test(
            path.extname(
                file.originalname
            ).toLowerCase()
        );


    const mimetype =
        allowedType.test(
            file.mimetype
        );


    if (mimetype && extname) {

        return cb(null, true);

    }


    cb(
        new Error(
            `Invalid file type for ${file.fieldname}. Allowed types: ${allowedType}`
        )
    );
};


// ============================================================
// MULTER CONFIGURATION
// ============================================================
const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {

        // 10 MB per file
        fileSize:
            10 * 1024 * 1024,

        // Maximum 5 files
        files: 5
    }
});


module.exports = upload;