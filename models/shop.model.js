"use strict";
const mongoose = require("mongoose");

const DOCUMENT_NAME = "Shop";
const COLLECTION_NAME = "Shops";

const shopSchema = new mongoose.Schema(
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
    // Shop-specific fields
    description: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalProducts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, collection: COLLECTION_NAME },
);

module.exports = mongoose.model(DOCUMENT_NAME, shopSchema);
