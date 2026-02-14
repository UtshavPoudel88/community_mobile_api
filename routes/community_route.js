const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  createCommunity,
  listAllCommunities,
  joinCommunity,
  listMyCommunities,
  leaveCommunity,
} = require("../controller/community_controller");

// Protected: create community
router.post("/", protect, createCommunity);

// Public: list all communities
router.get("/", listAllCommunities);

// Protected: list my communities
router.get("/my", protect, listMyCommunities);

// Protected: join a community
router.post("/:id/join", protect, joinCommunity);

// Protected: leave a community
router.delete("/:id/join", protect, leaveCommunity);

module.exports = router;