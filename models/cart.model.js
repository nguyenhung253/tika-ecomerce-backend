"use strict";

const { model, Schema } = require("mongoose");

const DOCUMENT_NAME = "Cart";
const COLLECTION_NAME = "Carts";

const cartSchema = new Schema(
  {
    cart_state: {
      type: String,
      required: true,
      enum: ["active", "completed", "failed", "pending"],
      default: "active",
    },
    cart_products: {
      type: Array,
      required: true,
      default: [],
    },
    /*
    cart_products: [
      {
        productId,
        shopId,
        quantity,
        name,
        price
      }
    ]
    */
    cart_count_products: { type: Number, default: 0 },
    cart_userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  },
);

module.exports = { cart: model(DOCUMENT_NAME, cartSchema) };
