const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const upload = require("../middleware/uploadItemPhoto"); // ✅ NEW

const {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
  uploadProfilePicture, // ✅ NEW
} = require("../controller/customer_controller");

// Create a customer
router.post("/signup", createCustomer);

// Login
router.post("/login", loginCustomer);

// Update a customer (protected route)
router.put("/:id", protect, updateCustomer);

// Delete a customer (protected route)
router.delete("/:id", protect, deleteCustomer);

// ✅ NEW: Upload profile picture (protected route)
// field name must be "photo" from Flutter multipart
router.post("/:id/profile-picture", protect, upload.single("photo"), uploadProfilePicture);

router.get("/", protect, async (req, res) => {
  const Customer = require("../models/customer_model");
  const customers = await Customer.find().select("-password"); // Exclude passwords
  res.status(200).json({ success: true, data: customers });
});

router.get("/:id", protect, async (req, res) => {
  const Customer = require("../models/customer_model");
  const customer = await Customer.findById(req.params.id).select("-password");
  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }
  res.status(200).json({ success: true, data: customer });
});

module.exports = router;
