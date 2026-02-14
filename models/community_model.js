const mongoose = require("mongoose");

const CommunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please add a title"],
    trim: true,
    unique: true,
  },
  image: {
    type: String,
    required: [true, "Please add an image path or URL"],
    trim: true,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Community", CommunitySchema);