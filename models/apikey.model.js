"use strict";

const mongoose = require("mongoose");

const DOCUMENT_NAME = "Apikey";
const COLLECTION_NAME = "Apikeys";

const apiKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    permission: {
      type: [String],
      required: true,
      enum: ["read", "write", "delete", "admin"],
    },
  },
  { timestamps: true, collection: COLLECTION_NAME },
);

module.exports = mongoose.model(DOCUMENT_NAME, apiKeySchema);
