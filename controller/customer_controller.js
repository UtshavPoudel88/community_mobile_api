const Customer = require("../models/customer_model");
const asyncHandler = require("../middleware/async");
const fs = require("fs");
const path = require("path");

// helper: convert "/profile_picture/file.jpg" -> absolute disk path ".../public/profile_picture/file.jpg"
const toPublicDiskPath = (publicUrlPath) => {
  // publicUrlPath expected like "/profile_picture/xyz.jpg"
  return path.join(__dirname, "..", "public", publicUrlPath);
};

exports.createCustomer = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingEmail = await Customer.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const customer = await Customer.create({
    name,
    email,
    password,
    profilePicture: null,
  });

  const customerResponse = customer.toObject();
  delete customerResponse.password;

  res.status(201).json({
    success: true,
    data: customerResponse,
  });
});

exports.loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide an email and password" });
  }

  const customer = await Customer.findOne({ email }).select("+password");

  if (!customer || !(await customer.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  sendTokenResponse(customer, 200, res);
});

exports.getAllCustomer = asyncHandler(async (req, res) => {
  const customers = await Customer.find();

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

// Get current logged-in user profile
exports.getMe = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id);
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const customerResponse = customer.toObject();
  delete customerResponse.password;

  res.status(200).json({
    success: true,
    data: {
      ...customerResponse,
      photoUrl: customerResponse.profilePicture,
    },
  });
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // ✅ Only the logged-in user can update themselves
  if (req.user._id.toString() !== customer._id.toString()) {
    return res.status(403).json({ message: "Not authorized to update this customer" });
  }

  // update fields
  if (name) customer.name = name;
  if (email) customer.email = email;

  // If password is provided, set it; pre-save hook will hash it
  if (password) customer.password = password;

  // Handle profile picture update if file is provided
  if (req.file) {
    // delete old image if it exists
    if (customer.profilePicture) {
      const oldImagePath = toPublicDiskPath(customer.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.log("Old file deletion error:", err);
        }
      }
    }

    customer.profilePicture = `/profile_picture/${req.file.filename}`;
  }

  await customer.save();

  const customerResponse = customer.toObject();
  delete customerResponse.password;

  res.status(200).json({
    success: true,
    data: {
      ...customerResponse,
      photoUrl: customerResponse.profilePicture,
    },
  });
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // ✅ Only the logged-in user can delete themselves
  if (req.user._id.toString() !== customer._id.toString()) {
    return res.status(403).json({ message: "Not authorized to delete this customer" });
  }

  // Delete profile picture file if exists
  if (customer.profilePicture) {
    const profilePicturePath = toPublicDiskPath(customer.profilePicture);
    if (fs.existsSync(profilePicturePath)) {
      try {
        fs.unlinkSync(profilePicturePath);
      } catch (err) {
        console.log("Profile file deletion error:", err);
      }
    }
  }

  await customer.deleteOne();

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});

exports.uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload a photo file" });
  }

  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated. Please login first." });
  }

  // If MAX_FILE_UPLOAD isn't set, skip this check
  if (process.env.MAX_FILE_UPLOAD && req.file.size > Number(process.env.MAX_FILE_UPLOAD)) {
    return res.status(400).json({
      message: `Please upload an image less than ${process.env.MAX_FILE_UPLOAD} bytes`,
    });
  }

  const customer = await Customer.findById(req.user._id);
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // Delete old image if it exists
  if (customer.profilePicture) {
    const oldImagePath = toPublicDiskPath(customer.profilePicture);
    if (fs.existsSync(oldImagePath)) {
      try {
        fs.unlinkSync(oldImagePath);
      } catch (err) {
        console.log("Old file deletion error:", err);
      }
    }
  }

  const photoUrl = `/profile_picture/${req.file.filename}`;
  customer.profilePicture = photoUrl;
  await customer.save();

  const customerResponse = customer.toObject();
  delete customerResponse.password;

  return res.status(200).json({
    success: true,
    data: {
      ...customerResponse,
      photoUrl,
    },
    message: "Profile picture uploaded and updated successfully",
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (customer, statusCode, res) => {
  const token = customer.getSignedJwtToken();

  const option = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    option.secure = true;
  }

  const customerResponse = customer.toObject();
  delete customerResponse.password;

  res.status(statusCode).cookie("token", token, option).json({
    success: true,
    token,
    data: {
      ...customerResponse,
      photoUrl: customerResponse.profilePicture,
    },
  });
};
