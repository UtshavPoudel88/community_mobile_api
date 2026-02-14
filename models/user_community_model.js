const mongoose = require("mongoose");

const UserCommunitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

UserCommunitySchema.index({ userId: 1, communityId: 1 }, { unique: true });

module.exports = mongoose.model("UserCommunity", UserCommunitySchema);