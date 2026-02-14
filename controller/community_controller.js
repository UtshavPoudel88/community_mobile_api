const asyncHandler = require("../middleware/async");
const Community = require("../models/community_model");
const UserCommunity = require("../models/user_community_model");

// POST /community/communities (protected)
exports.createCommunity = asyncHandler(async (req, res) => {
  const { title, image, description } = req.body;

  if (!title || !image) {
    return res.status(400).json({
      success: false,
      message: "title and image are required",
    });
  }

  const existing = await Community.findOne({ title });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Community already exists",
    });
  }

  const community = await Community.create({
    title,
    image,
    description: description || "",
  });

  res.status(201).json({ success: true, data: community });
});

// GET /community/communities
exports.listAllCommunities = asyncHandler(async (req, res) => {
  const communities = await Community.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: communities });
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