"use strict";

const { model, Schema } = require("mongoose");

const DOCUMENT_NAME = "Order";
const COLLECTION_NAME = "Orders";

const orderSchema = new Schema(
  {
    order_userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_checkout: {
      totalPrice: { type: Number, required: true },
      totalApplyDiscount: { type: Number, default: 0 },
      feeShip: { type: Number, default: 0 },
      totalCheckout: { type: Number, required: true },
    },
    order_shipping: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      country: { type: String, required: true },
      zipCode: { type: String },
    },
    order_payment: {
      method: {
        type: String,
        enum: ["COD", "credit_card", "paypal", "bank_transfer"],
        default: "COD",
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
    },
    order_products: {
      type: Array,
      required: true,
      default: [],
    },
    /*
    order_products: [
      {
        shopId,
        shop_discounts: [],
        item_products: [
          {
            productId,
            quantity,
            price,
            name,
            thump
          }
        ]
      }
    ]
    */
    order_trackingNumber: { type: String, default: "#0000" },
    order_status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    order_note: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  },
);

module.exports = { order: model(DOCUMENT_NAME, orderSchema) };
