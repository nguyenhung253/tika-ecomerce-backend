"use strict";

const { model, Schema } = require("mongoose");

const DOCUMENT_NAME = "Payment";
const COLLECTION_NAME = "Payments";

const paymentSchema = new Schema(
  {
    payment_orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    payment_userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payment_method: {
      type: String,
      enum: ["COD", "credit_card", "paypal", "bank_transfer", "vnpay"],
      required: true,
    },
    payment_provider: {
      type: String,
      enum: ["internal", "mock_gateway", "vnpay"],
      default: "internal",
    },
    payment_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_currency: {
      type: String,
      default: "VND",
    },
    payment_status: {
      type: String,
      enum: ["pending", "requires_action", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    payment_transactionRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payment_checkoutUrl: {
      type: String,
      default: "",
    },
    payment_gatewayPayload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    payment_processedAt: {
      type: Date,
      default: null,
    },
    payment_failureReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  },
);

module.exports = {
  payment: model(DOCUMENT_NAME, paymentSchema),
};
