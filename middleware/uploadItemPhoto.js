const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "public", "post_media");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `post_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype || "";
  const ext = path.extname(file.originalname || "").toLowerCase();

  const imageMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const videoMimes = ["video/mp4", "video/quicktime"]; // mp4 + mov

  const imageExts = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".heic",
    ".heif",
  ]);
  const videoExts = new Set([".mp4", ".mov"]);

  if (imageMimes.includes(mime) || videoMimes.includes(mime)) {
    return cb(null, true);
  }

  if (imageExts.has(ext) || videoExts.has(ext)) {
    return cb(null, true);
  }

  cb(new Error("Only image or video files are allowed"), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});