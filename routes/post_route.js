const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  createPost,
  listPostsByCommunity,
  reactToPost,
} = require("../controller/post_controller");

// Create post (protected)
router.post("/", protect, createPost);

// List posts by community (protected)
router.get("/community/:id", protect, listPostsByCommunity);

// Like / dislike (protected)
router.post("/:id/reaction", protect, reactToPost);

module.exports = router;