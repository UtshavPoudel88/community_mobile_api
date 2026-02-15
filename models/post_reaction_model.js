const asyncHandler = require("../middleware/async");
const Post = require("../models/post_model");
const Community = require("../models/community_model");
const PostReaction = require("../models/post_reaction_model");

// POST /community/posts (protected)
exports.createPost = asyncHandler(async (req, res) => {
  const { text, communityId } = req.body;

  if (!text || !communityId) {
    return res.status(400).json({
      success: false,
      message: "text and communityId are required",
    });
  }

  const community = await Community.findById(communityId);
  if (!community) {
    return res.status(404).json({ success: false, message: "Community not found" });
  }

  const post = await Post.create({
    userId: req.user._id,
    communityId,
    text,
  });

  res.status(201).json({ success: true, data: post });
});

// GET /community/posts/community/:id (protected)
exports.listPostsByCommunity = asyncHandler(async (req, res) => {
  const communityId = req.params.id;

  const posts = await Post.find({ communityId })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const postIds = posts.map((p) => p._id);
  const reactions = await PostReaction.find({
    userId: req.user._id,
    postId: { $in: postIds },
  }).lean();

  const reactionMap = {};
  reactions.forEach((r) => {
    reactionMap[r.postId.toString()] = r.type;
  });

  const data = posts.map((post) => ({
    ...post,
    userReaction: reactionMap[post._id.toString()] || null,
  }));

  res.status(200).json({ success: true, data });
});

// POST /community/posts/:id/reaction (protected)
exports.reactToPost = asyncHandler(async (req, res) => {
  const postId = req.params.id;
  const userId = req.user._id;
  const { type } = req.body; // like | dislike | none

  if (!["like", "dislike", "none"].includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid reaction type" });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  const existing = await PostReaction.findOne({ postId, userId });

  if (type === "none") {
    if (existing) {
      if (existing.type === "like") post.likeCount = Math.max(0, post.likeCount - 1);
      if (existing.type === "dislike") post.dislikeCount = Math.max(0, post.dislikeCount - 1);
      await existing.deleteOne();
      await post.save();
    }
    return res.status(200).json({
      success: true,
      data: { ...post.toObject(), userReaction: null },
    });
  }

  if (!existing) {
    await PostReaction.create({ postId, userId, type });
    if (type === "like") post.likeCount += 1;
    if (type === "dislike") post.dislikeCount += 1;
    await post.save();
    return res.status(200).json({
      success: true,
      data: { ...post.toObject(), userReaction: type },
    });
  }

  if (existing.type !== type) {
    if (existing.type === "like") post.likeCount = Math.max(0, post.likeCount - 1);
    if (existing.type === "dislike") post.dislikeCount = Math.max(0, post.dislikeCount - 1);

    if (type === "like") post.likeCount += 1;
    if (type === "dislike") post.dislikeCount += 1;

    existing.type = type;
    await existing.save();
    await post.save();
  }

  res.status(200).json({
    success: true,
    data: { ...post.toObject(), userReaction: type },
  });
});