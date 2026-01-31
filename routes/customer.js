const express = require("express");
const router = express.Router();

// ✅ Correct path for YOUR project (middleware/uploads.js)
const { uploadImage } = require("../middleware/uploads");

const { protect } = require("../middleware/auth");

const {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomer,
  loginCustomer,
  uploadProfilePicture,
  getMe,
} = require("../controller/customer_controller");

// ✅ Wrapper to catch Multer errors properly and return JSON
const uploadProfilePictureMiddleware = (req, res, next) => {
  // This runs multer for a single file field named "profilePicture"
  const uploadSingle = uploadImage.single("profilePicture");

  uploadSingle(req, res, (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};

// -------------------- ROUTES --------------------

// Auth
router.post("/signup", createCustomer);
router.post("/login", loginCustomer);

// Profile
router.get("/me", protect, getMe);

// Customers
router.get("/", protect, getAllCustomer);

// Upload profile picture
router.post(
  "/profile-picture",
  protect,
  uploadProfilePictureMiddleware,
  uploadProfilePicture
);

router.post(
  "/upload-image",
  protect,
  uploadProfilePictureMiddleware,
  uploadProfilePicture
);

// Update + delete
router.put(
  "/:id",
  protect,
  uploadProfilePictureMiddleware,
  updateCustomer
);

router.delete("/:id", protect, deleteCustomer);

module.exports = router;
