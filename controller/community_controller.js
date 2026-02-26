const asyncHandler = require("../middleware/async");
const Community = require("../models/community_model");
const UserCommunity = require("../models/user_community_model");
const path = require("path");

// POST /community/communities (protected)
exports.createCommunity = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "title is required",
    });
  }

  const existing = await Community.findOne({ title });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Community already exists",
    });
  }

  // Handle image: either from file upload or URL
  let imagePath = "";
  if (req.file) {
    // File was uploaded, use the relative path
    const publicDir = path.join(__dirname, "..", "public");
    const relativeFromPublic = path.relative(publicDir, req.file.path);
    const normalizedRelative = relativeFromPublic.split(path.sep).join("/");
    imagePath = `/public/${normalizedRelative}`;
  } else if (req.body.image) {
    // URL was provided
    imagePath = req.body.image;
  } else {
    return res.status(400).json({
      success: false,
      message: "image (file or URL) is required",
    });
  }

  const community = await Community.create({
    title,
    image: imagePath,
    description: description || "",
  });

  res.status(201).json({ success: true, data: community });
});

// GET /community/communities
exports.listAllCommunities = asyncHandler(async (req, res) => {
  const communities = await Community.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: communities });
});

// PUT /community/communities/:id (admin)
exports.updateCommunity = asyncHandler(async (req, res) => {
  const { title, image, description } = req.body;
  const community = await Community.findById(req.params.id);

  if (!community) {
    return res.status(404).json({
      success: false,
      message: "Community not found",
    });
  }

  if (title) community.title = title;
  if (image) community.image = image;
  if (description !== undefined) community.description = description;

  await community.save();

  res.status(200).json({ success: true, data: community });
});

// DELETE /community/communities/:id (admin)
exports.deleteCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);

  if (!community) {
    return res.status(404).json({
      success: false,
      message: "Community not found",
    });
  }

  await community.deleteOne();

  res.status(200).json({ success: true, message: "Community deleted" });
});

// POST /community/communities/:id/join (protected)
exports.joinCommunity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const communityId = req.params.id;

  const community = await Community.findById(communityId);
  if (!community) {
    return res.status(404).json({ success: false, message: "Community not found" });
  }

  const membership = await UserCommunity.create({ userId, communityId });

  res.status(201).json({
    success: true,
    data: membership,
  });
});

// GET /community/communities/my (protected)
exports.listMyCommunities = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const memberships = await UserCommunity.find({ userId })
    .populate("communityId")
    .sort({ joinedAt: -1 });

  const communities = memberships
    .map((m) => m.communityId)
    .filter(Boolean);

  res.status(200).json({ success: true, data: communities });
});

// DELETE /community/communities/:id/join (protected)
exports.leaveCommunity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const communityId = req.params.id;

  const deleted = await UserCommunity.findOneAndDelete({ userId, communityId });
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Membership not found" });
  }

  res.status(200).json({ success: true, message: "Left community" });
});