const multer = require("multer");
const fs = require("fs");
const path = require("path");

const maxSize = 50 * 1024 * 1024; // 50MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (file.fieldname === "profilePicture") {
        const profilePath = path.resolve(__dirname, "..", "public", "profile_picture");
        fs.mkdirSync(profilePath, { recursive: true });
        return cb(null, profilePath);
      }

      if (file.fieldname === "ItemPhoto") {
        const itemsPath = path.resolve(__dirname, "..", "public", "item_photo");
        fs.mkdirSync(itemsPath, { recursive: true });
        return cb(null, itemsPath);
      }

      return cb(new Error("Invalid field name for upload"), false);
    } catch (err) {
      return cb(err);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    if (file.fieldname === "profilePicture") {
      const userId = req.user?._id || "unknown";
      return cb(null, `profile_${userId}${ext}`);
    }

    if (file.fieldname === "ItemPhoto") {
      const timestamp = Date.now();
      return cb(null, `item-pic-${timestamp}${ext}`);
    }

    return cb(new Error("Invalid field name for upload"), false);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedFields = ["profilePicture", "ItemPhoto"];
  if (!allowedFields.includes(file.fieldname)) {
    return cb(new Error("Invalid field name for upload"), false);
  }

  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error("Only image files are allowed!"), false);
  }

  return cb(null, true);
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize,
    fieldNameSize: 200,
    fieldSize: 200,
    fields: 10,
    files: 10,
  },
});

// ✅ clean export
module.exports = { uploadImage };
