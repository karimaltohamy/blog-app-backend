const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    category: { type: String, required: true },
    content: { type: String, required: true },
    cover: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
