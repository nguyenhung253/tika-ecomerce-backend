"use strict";

const { model, Schema } = require("mongoose");

const DOCUMENT_NAME = "Notification";
const COLLECTION_NAME = "Notifications";

const notificationSchema = new Schema(
  {
    notification_userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    notification_accountType: {
      type: String,
      enum: ["user", "shop"],
      default: "user",
      index: true,
    },
    notification_type: {
      type: String,
      required: true,
      index: true,
    },
    notification_title: {
      type: String,
      required: true,
      trim: true,
    },
    notification_message: {
      type: String,
      required: true,
      trim: true,
    },
    notification_metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    notification_isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    notification_readAt: {
      type: Date,
      default: null,
    },
    notification_email: {
      to: { type: String, default: "" },
      status: {
        type: String,
        enum: ["not_requested", "queued", "sent", "failed"],
        default: "not_requested",
      },
      attempts: { type: Number, default: 0 },
      sentAt: { type: Date, default: null },
      lastError: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAME,
  },
);

module.exports = {
  notification: model(DOCUMENT_NAME, notificationSchema),
};
