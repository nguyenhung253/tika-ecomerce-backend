"use strict";

const { model, Schema } = require("mongoose");

const DOCUMENT_NAME = "Comment";
const COLLECTION_NAME = "comments";

const commentSchema = new Schema(
  {
    comment_productId: { type: Schema.Types.ObjectId, ref: "Product" },
    comment_userId: { type: String, default: "" },
    comment_content: { type: String, default: "" },
    comment_rating: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  },
);

const Comment = model(DOCUMENT_NAME, commentSchema, COLLECTION_NAME);

module.exports = Comment;
