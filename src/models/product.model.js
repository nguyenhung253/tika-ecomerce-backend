"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const DOCUMENT_NAME = "Product";
const COLLECTION_NAME = "Products";

var productSchema = new Schema(
  {
    product_name: {
      type: String,
      required: true,
    },
    product_thump: {
      type: String,
      required: true,
    },
    product_description: {
      type: String,
    },
    product_price: {
      type: Number,
      required: true,
    },
    product_slug: String,
    product_quantity: {
      type: Number,
      required: true,
    },
    product_type: {
      type: String,
      required: true,
      enum: ["Electronics", "Clothing", "Furniture", "Books"],
    },
    product_shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    product_attribute: {
      type: Schema.Types.Mixed,
      required: true,
    },
    product_ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be above 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    product_variations: { type: Array, default: [] },
    isDraft: { type: Boolean, default: true, index: true, select: false },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
      select: false,
    },
  },
  { collection: COLLECTION_NAME, timestamps: true },
);

// Create text index for search
productSchema.index({ product_name: "text", product_description: "text" });

const clothingSchema = new Schema(
  {
    brand: { type: String, required: true },
    size: String,
    material: String,
    product_shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
  },
  {
    collection: "Clothing",
    timestamps: true,
  },
);

const electronicSchema = new Schema(
  {
    brand: { type: String, required: true },
    size: String,
    material: String,
    product_shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
  },
  {
    collection: "Electronic",
    timestamps: true,
  },
);

const bookSchema = new Schema(
  {
    author: { type: String, required: true },
    publisher: { type: String, required: true },
    isbn: { type: String },
    pages: { type: Number },
    language: { type: String, default: "Vietnamese" },
    publish_year: { type: Number },
    genre: { type: String },
    product_shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
  },
  {
    collection: "Books",
    timestamps: true,
  },
);

module.exports = {
  product: model(DOCUMENT_NAME, productSchema),
  electronic: model("Electronics", electronicSchema),
  clothing: model("Clothings", clothingSchema),
  book: model("Books", bookSchema),
};
