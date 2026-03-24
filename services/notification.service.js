"use strict";

const { notification } = require("../models/notification.model");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const { addNotificationEmailJob } = require("../queues/notification.queue");
const {
  BadRequestError,
  NotFoundError,
} = require("../helpers/error.response");

class NotificationService {
  static buildPaginationInput(query = {}, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const rawLimit = parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
    return { page, limit };
  }

  static async resolveRecipient({ userId, accountType = "user" }) {
    const Model = accountType === "shop" ? Shop : User;
    const foundRecipient = await Model.findById(userId).lean();

    if (!foundRecipient) {
      return null;
    }

    return {
      email: foundRecipient.email || "",
      name: foundRecipient.name || "",
    };
  }

  static async createNotification({
    userId,
    accountType = "user",
    type,
    title,
    message,
    metadata = {},
    sendEmail = true,
  }) {
    if (!userId) {
      throw new BadRequestError("Notification user id is required");
    }

    const recipient = await NotificationService.resolveRecipient({
      userId,
      accountType,
    });
    const emailAddress = recipient?.email || "";
    const shouldQueueEmail = Boolean(sendEmail && emailAddress);

    const createdNotification = await notification.create({
      notification_userId: userId,
      notification_accountType: accountType,
      notification_type: type,
      notification_title: title,
      notification_message: message,
      notification_metadata: metadata,
      notification_email: {
        to: emailAddress,
        status: shouldQueueEmail ? "queued" : "not_requested",
        attempts: 0,
        sentAt: null,
        lastError: "",
      },
    });

    if (shouldQueueEmail) {
      await addNotificationEmailJob({
        notificationId: String(createdNotification._id),
        to: emailAddress,
        subject: title,
        text: message,
      });
    }

    return createdNotification;
  }

  static async getNotificationsByActor({
    userId,
    accountType = "user",
    ...query
  }) {
    const { page, limit } = NotificationService.buildPaginationInput(
      query,
      20,
      100,
    );
    const skip = (page - 1) * limit;

    const filter = {
      notification_userId: userId,
      notification_accountType: accountType,
    };

    if (String(query.unreadOnly || "").toLowerCase() === "true") {
      filter.notification_isRead = false;
    }

    const [items, totalItems] = await Promise.all([
      notification
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      notification.countDocuments(filter),
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

    return {
      items,
      pagination: {
        totalItems,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async markAsRead({ notificationId, userId, accountType = "user" }) {
    const foundNotification = await notification.findOne({
      _id: notificationId,
      notification_userId: userId,
      notification_accountType: accountType,
    });

    if (!foundNotification) {
      throw new NotFoundError("Notification not found");
    }

    foundNotification.notification_isRead = true;
    foundNotification.notification_readAt = new Date();
    await foundNotification.save();

    return foundNotification;
  }

  static async notifyOrderCreated({
    userId,
    accountType = "user",
    orderId,
    totalCheckout,
    paymentMethod,
  }) {
    return NotificationService.createNotification({
      userId,
      accountType,
      type: "order.created",
      title: "Order created successfully",
      message: `Order ${orderId} has been created. Total: ${totalCheckout}. Payment method: ${paymentMethod}.`,
      metadata: {
        orderId,
        totalCheckout,
        paymentMethod,
      },
    });
  }

  static async notifyOrderStatusUpdated({
    userId,
    accountType = "user",
    orderId,
    status,
  }) {
    return NotificationService.createNotification({
      userId,
      accountType,
      type: "order.status.updated",
      title: "Order status updated",
      message: `Order ${orderId} is now ${status}.`,
      metadata: {
        orderId,
        status,
      },
    });
  }

  static async notifyPaymentSucceeded({
    userId,
    accountType = "user",
    orderId,
    amount,
    transactionRef,
  }) {
    return NotificationService.createNotification({
      userId,
      accountType,
      type: "payment.succeeded",
      title: "Payment completed",
      message: `Payment for order ${orderId} succeeded. Amount: ${amount}. Reference: ${transactionRef}.`,
      metadata: {
        orderId,
        amount,
        transactionRef,
      },
    });
  }
}

module.exports = {
  NotificationService,
};
