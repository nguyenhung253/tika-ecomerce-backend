"use strict";
const mongoose = require("mongoose");

const DOCUMENT_NAME = "Token";
const COLLECTION_NAME = "Tokens";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, collection: COLLECTION_NAME },
);

// Index for auto-cleanup expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster queries
tokenSchema.index({ refreshToken: 1 });
tokenSchema.index({ userId: 1, isBlacklisted: 1 });

module.exports = mongoose.model(DOCUMENT_NAME, tokenSchema);
