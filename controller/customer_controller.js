const Customer = require("../models/customer_model");
const Post = require("../models/post_model");
const UserCommunity = require("../models/user_community_model");
const asyncHandler = require("../middleware/async");
const fs = require("fs");
const path = require("path");

exports.createCustomer = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  console.log("creating customer with name:", name);

  //check if customer already exists
  const existingEmail = await Customer.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ message: "Email already exists" });
  }

  // Determine role (admin vs user) based on ADMIN_EMAILS env list
  const adminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : [];
  const role = adminEmails.includes(email.toLowerCase()) ? "admin" : "user";

  //create customer
  const customer = await Customer.create({
    name,
    email,
    password,
    role,
  });

  //remove password from response
  const customerResponse = customer.toObject();
  delete customerResponse.password;

  res.status(201).json({
    success: true,
    data: customerResponse,
  });
});

exports.loginCustomer = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide an email and password" });
  }

  // Check for customer
  const customer = await Customer.findOne({ email }).select("+password");

  if (!customer || !(await customer.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  sendTokenResponse(customer, 200, res);
});

exports.updateCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // Allow admins to update any customer, users can only update themselves
  if (req.user.role !== "admin" && customer._id.toString() !== req.user._id.toString()) {
    return res.status(401).json({ message: "Not authorized to update this customer" });
  }

  // Only admins can update role
  if (role !== undefined && req.user.role !== "admin") {
    return res.status(401).json({ message: "Not authorized to update role" });
  }

  //update fields
  customer.name = name || customer.name;
  customer.email = email || customer.email;
  if (password) {
    customer.password = password;
  }
  // Only allow role update if user is admin
  if (role !== undefined && req.user.role === "admin") {
    customer.role = role;
  }

  await customer.save();

  res.status(200).json({
    success: true,
    data: customer,
  });
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  // Allow admins to delete any customer, users can only delete themselves
  if (req.user.role !== "admin" && customer._id.toString() !== req.user._id.toString()) {
    return res.status(401).json({ message: "Not authorized to delete this customer" });
  }

  const customerId = customer._id;

  // Delete all posts by this user
  const posts = await Post.find({ userId: customerId });
  
  // Delete post media files
  for (const post of posts) {
    if (post.mediaUrl && post.mediaUrl.startsWith("/public/")) {
      const mediaPath = path.join(__dirname, "..", post.mediaUrl.replace(/^\/+/, ""));
      if (fs.existsSync(mediaPath)) {
        try {
          fs.unlinkSync(mediaPath);
        } catch (err) {
          console.error(`Failed to delete post media: ${mediaPath}`, err);
        }
      }
    }
  }
  
  // Delete all posts from database
  await Post.deleteMany({ userId: customerId });

  // Remove user's ID from likes/dislikes arrays in all posts and update counts
  // First, find posts where user has liked or disliked
  const postsWithReactions = await Post.find({
    $or: [{ likes: customerId }, { dislikes: customerId }],
  });

  // Update each post to remove user and recalculate counts
  for (const post of postsWithReactions) {
    const hadLike = post.likes.includes(customerId);
    const hadDislike = post.dislikes.includes(customerId);
    
    post.likes = post.likes.filter((id) => id.toString() !== customerId.toString());
    post.dislikes = post.dislikes.filter((id) => id.toString() !== customerId.toString());
    
    if (hadLike) post.likeCount = Math.max(0, post.likeCount - 1);
    if (hadDislike) post.dislikeCount = Math.max(0, post.dislikeCount - 1);
    
    await post.save();
  }

  // Remove user from all communities
  await UserCommunity.deleteMany({ userId: customerId });

  // Delete profile picture file if exists
  if (customer.profilePicture && customer.profilePicture.startsWith("/public/")) {
    const profilePath = path.join(__dirname, "..", customer.profilePicture.replace(/^\/+/, ""));
    if (fs.existsSync(profilePath)) {
      try {
        fs.unlinkSync(profilePath);
      } catch (err) {
        console.error(`Failed to delete profile picture: ${profilePath}`, err);
      }
    }
  }

  // Finally, delete the customer
  await Customer.findByIdAndDelete(customerId);

  res.status(200).json({
    success: true,
    message: "Customer and all related data deleted successfully",
  });
});

// ✅ NEW: Upload profile picture (saved into public/item_photos)
exports.uploadProfilePicture = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Optional: delete old local file
  if (customer.profilePicture && customer.profilePicture.startsWith("/public/")) {
    const oldFilePath = path.join(
      __dirname,
      "..",
      customer.profilePicture.replace(/^\/+/, "")
    );
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (_) {}
    }
  }

  // Store relative path in DB based on actual upload destination
  const publicDir = path.join(__dirname, "..", "public");
  const relativeFromPublic = path.relative(publicDir, req.file.path);
  const normalizedRelative = relativeFromPublic.split(path.sep).join("/");
  const relativePath = `/public/${normalizedRelative}`;
  customer.profilePicture = relativePath;

  await customer.save();

  // Full URL for frontend
  const fullUrl = `${req.protocol}://${req.get("host")}${relativePath}`;

  return res.status(200).json({
    success: true,
    data: {
      profilePicture: relativePath,
      profilePictureUrl: fullUrl,
    },
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (customer, statusCode, res) => {
  // Create token
  const token = customer.getSignedJwtToken();

  const option = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    option.secure = true;
  }

  res.status(statusCode).cookie("token", token, option).json({
    success: true,
    token, 
  });
};