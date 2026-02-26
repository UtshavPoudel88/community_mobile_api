const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/uploadItemPhoto");

const {
  createPost,
  listPostsByCommunity,
  listPostsByUser,
  listAllPosts,
  updatePost,
  deletePost,
  reactToPost,
} = require("../controller/post_controller");

// POST /community/posts (protected)
router.post("/", protect, upload.single("media"), createPost);

// GET /community/posts (protected) - Get all posts
router.get("/", protect, listAllPosts);

// GET /community/posts/community/:id (protected) - User must be member of community
router.get("/community/:id", protect, listPostsByCommunity);

// GET /community/posts/user/:id (protected)
router.get("/user/:id", protect, listPostsByUser);

// PUT /community/posts/:id (protected)
router.put("/:id", protect, updatePost);

// DELETE /community/posts/:id (protected)
router.delete("/:id", protect, deletePost);

// POST /community/posts/:id/reaction (protected)
router.post("/:id/reaction", protect, reactToPost);

module.exports = router;