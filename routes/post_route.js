const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/uploadItemPhoto");

const {
  createPost,
  listPostsByCommunity,
  listPostsByUser,
  updatePost,
  deletePost,
  reactToPost,
} = require("../controller/post_controller");

// POST /community/posts (protected)
router.post("/", protect, upload.single("media"), createPost);

// GET /community/posts/community/:id (public)
router.get("/community/:id", listPostsByCommunity);

// GET /community/posts/user/:id (protected)
router.get("/user/:id", protect, listPostsByUser);

// PUT /community/posts/:id (protected)
router.put("/:id", protect, updatePost);

// DELETE /community/posts/:id (protected)
router.delete("/:id", protect, deletePost);

// POST /community/posts/:id/reaction (protected)
router.post("/:id/reaction", protect, reactToPost);

module.exports = router;