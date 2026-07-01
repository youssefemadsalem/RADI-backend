const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🌟 FIX 1: Find the absolute root path of RADI-BACKEND cleanly
const BACKEND_ROOT = path.resolve(__dirname, ".."); 
const uploadDir = path.join(BACKEND_ROOT, "uploads", "products");

// Ensure the storage destination directory exists, or create it dynamically
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Configure disk storage settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 🌟 FIX 2: Force Multer to save files to the exact absolute folder directory on disk
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "prod-" + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Validate that incoming files are actually images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only high-resolution product images are allowed."), false);
  }
};

// 3. Initialize the Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 } // Max 10MB per image
});

// Export the raw instance so your route files can hook into it
module.exports = upload;