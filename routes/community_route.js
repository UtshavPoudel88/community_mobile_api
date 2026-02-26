const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const uploadCommunityPhoto = require("../middleware/uploadCommunityPhoto");

const {
  createCommunity,
  listAllCommunities,
  joinCommunity,
  listMyCommunities,
  leaveCommunity,
  updateCommunity,
  deleteCommunity,
} = require("../controller/community_controller");

// Protected: create community (any authenticated user)
// Accepts either multipart/form-data (with file) or JSON (with image URL)
router.post("/", protect, uploadCommunityPhoto.single("image"), createCommunity);

// Admin: update community
router.put("/:id", protect, authorize("admin"), updateCommunity);

// Admin: delete community
router.delete("/:id", protect, authorize("admin"), deleteCommunity);

// Public: list all communities
router.get("/", listAllCommunities);

// Protected: list my communities
router.get("/my", protect, listMyCommunities);

// Protected: join a community
router.post("/:id/join", protect, joinCommunity);

// Protected: leave a community
router.delete("/:id/join", protect, leaveCommunity);

module.exports = router;