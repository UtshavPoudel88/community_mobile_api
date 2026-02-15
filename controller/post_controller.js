const asyncHandler = require("../middleware/async");
const Post = require("../models/post_model");
const Community = require("../models/community_model");

// POST /community/posts (protected)
exports.createPost = asyncHandler(async (req, res) => {
  const { text, communityId } = req.body;

  if (!text || !communityId) {
    return res.status(400).json({
      success: false,
      message: "text and communityId are required",
    });
  }

  // Optional: ensure community exists
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

// GET /community/posts/community/:id (public)
exports.listPostsByCommunity = asyncHandler(async (req, res) => {
  const communityId = req.params.id;

  const posts = await Post.find({ communityId })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: posts });
});

// POST /community/posts/:id/reaction (protected)
// ENFORCES: Only ONE reaction per user per post (like OR dislike, not both)
exports.reactToPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { type } = req.body;

  if (!type || !["like", "dislike"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid reaction type. Use 'like' or 'dislike'",
    });
  }

  const post = await Post.findById(id);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  // Initialize arrays if they don't exist
  if (!post.likes) post.likes = [];
  if (!post.dislikes) post.dislikes = [];

  const userIdStr = userId.toString();
  const isInLikes = post.likes.some(id => id.toString() === userIdStr);
  const isInDislikes = post.dislikes.some(id => id.toString() === userIdStr);

  if (type === "like") {
    // If already liked, toggle off (remove)
    if (isInLikes) {
      post.likes = post.likes.filter(id => id.toString() !== userIdStr);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } 
    // If disliked, remove dislike and add like
    else if (isInDislikes) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userIdStr);
      post.dislikeCount = Math.max(0, post.dislikeCount - 1);
      post.likes.push(userId);
      post.likeCount = post.likes.length;
    }
    // If no reaction, add like
    else {
      post.likes.push(userId);
      post.likeCount = post.likes.length;
    }
  } 
  else if (type === "dislike") {
    // If already disliked, toggle off (remove)
    if (isInDislikes) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userIdStr);
      post.dislikeCount = Math.max(0, post.dislikeCount - 1);
    }
    // If liked, remove like and add dislike
    else if (isInLikes) {
      post.likes = post.likes.filter(id => id.toString() !== userIdStr);
      post.likeCount = Math.max(0, post.likeCount - 1);
      post.dislikes.push(userId);
      post.dislikeCount = post.dislikes.length;
    }
    // If no reaction, add dislike
    else {
      post.dislikes.push(userId);
      post.dislikeCount = post.dislikes.length;
    }
  }

  await post.save();

  res.status(200).json({ success: true, data: post });
});