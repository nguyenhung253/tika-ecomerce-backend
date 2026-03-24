"use strict";
const mongoose = require("mongoose");

const DOCUMENT_NAME = "User";
const COLLECTION_NAME = "Users";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    auth_provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    google_id: {
      type: String,
      default: "",
      index: true,
    },
    oauth_profile_picture: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: COLLECTION_NAME },
);

module.exports = mongoose.model(DOCUMENT_NAME, userSchema);
