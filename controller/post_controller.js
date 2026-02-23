const asyncHandler = require("../middleware/async");
const Post = require("../models/post_model");
const Community = require("../models/community_model");

const resolvePostDisplayName = (post, currentUserId) => {
  const data = post && typeof post.toObject === "function" ? post.toObject() : post;
  const candidates = [];

  if (data && data.userId && typeof data.userId === "object") {
    candidates.push(data.userId.name, data.userId.userName, data.userId.username, data.userId.authorName);
  }

  if (data) {
    candidates.push(data.userName, data.username, data.authorName);
  }

  let displayName = candidates.find((value) => typeof value === "string" && value.trim().length > 0);

  if (!displayName) {
    const postUserId = data && data.userId && typeof data.userId === "object" ? data.userId._id : data.userId;
    if (currentUserId && postUserId && postUserId.toString && postUserId.toString() === currentUserId.toString()) {
      displayName = "You";
    } else {
      displayName = "Community member";
    }
  }

  return { ...data, displayName };
};

// POST /community/posts (protected)
exports.createPost = asyncHandler(async (req, res) => {
  const { text, communityId, mediaType } = req.body;

  if (!text && !req.file) {
    return res.status(400).json({
      success: false,
      message: "text or media is required",
    });
  }

  if (!communityId) {
    return res.status(400).json({
      success: false,
      message: "communityId is required",
    });
  }

  const community = await Community.findById(communityId);
  if (!community) {
    return res.status(404).json({ success: false, message: "Community not found" });
  }

  let relativePath = "";
  let finalMediaType = "";

  if (req.file) {
    relativePath = `/public/post_media/${req.file.filename}`;
    finalMediaType = mediaType === "video" ? "video" : "image";
  }

  const post = await Post.create({
    userId: req.user._id,
    communityId,
    text: text || "",
    mediaUrl: relativePath,
    mediaType: finalMediaType,
  });

  res.status(201).json({ success: true, data: resolvePostDisplayName(post, req.user && req.user._id) });
});

// GET /community/posts/community/:id (protected)
exports.listPostsByCommunity = asyncHandler(async (req, res) => {
  const communityId = req.params.id;

  const posts = await Post.find({ communityId })
    .populate("userId", "name userName username authorName")
    .sort({ createdAt: -1 });

  const responsePosts = posts.map((post) => resolvePostDisplayName(post, req.user && req.user._id));
  res.status(200).json({ success: true, data: responsePosts });
});

// GET /community/posts/user/:id (protected)
exports.listPostsByUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const posts = await Post.find({ userId })
    .populate("userId", "name userName username authorName")
    .sort({ createdAt: -1 });

  const responsePosts = posts.map((post) => resolvePostDisplayName(post, req.user && req.user._id));
  res.status(200).json({ success: true, data: responsePosts });
});

// PUT /community/posts/:id (protected)
exports.updatePost = asyncHandler(async (req, res) => {
  const postId = req.params.id;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      message: "text is required",
    });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }

  post.text = text;
  await post.save();

  res.status(200).json({ success: true, data: resolvePostDisplayName(post, req.user && req.user._id) });
});

// DELETE /community/posts/:id (protected)
exports.deletePost = asyncHandler(async (req, res) => {
  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found" });
  }

  if (post.userId.toString() !== req.user._id.toString()) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }

  await post.deleteOne();

  res.status(200).json({ success: true, message: "Post deleted" });
});

// POST /community/posts/:id/reaction (protected)
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

  if (!post.likes) post.likes = [];
  if (!post.dislikes) post.dislikes = [];

  const userIdStr = userId.toString();
  const isInLikes = post.likes.some(id => id.toString() === userIdStr);
  const isInDislikes = post.dislikes.some(id => id.toString() === userIdStr);

  if (type === "like") {
    if (isInLikes) {
      post.likes = post.likes.filter(id => id.toString() !== userIdStr);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } 
    else if (isInDislikes) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userIdStr);
      post.dislikeCount = Math.max(0, post.dislikeCount - 1);
      post.likes.push(userId);
      post.likeCount = post.likes.length;
    }
    else {
      post.likes.push(userId);
      post.likeCount = post.likes.length;
    }
  } 
  else if (type === "dislike") {
    if (isInDislikes) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userIdStr);
      post.dislikeCount = Math.max(0, post.dislikeCount - 1);
    }
    else if (isInLikes) {
      post.likes = post.likes.filter(id => id.toString() !== userIdStr);
      post.likeCount = Math.max(0, post.likeCount - 1);
      post.dislikes.push(userId);
      post.dislikeCount = post.dislikes.length;
    }
    else {
      post.dislikes.push(userId);
      post.dislikeCount = post.dislikes.length;
    }
  }

  await post.save();

  res.status(200).json({ success: true, data: resolvePostDisplayName(post, req.user && req.user._id) });
});