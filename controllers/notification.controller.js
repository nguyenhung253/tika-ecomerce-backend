"use strict";

const { NotificationService } = require("../services/notification.service");
const { SuccessResponse } = require("../helpers/success.response");
const asyncHandler = require("../helpers/asyncHandler");

class NotificationController {
  static getNotifications = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get notifications success",
      data: await NotificationService.getNotificationsByActor({
        userId: req.user.id,
        accountType: req.user.accountType || "user",
        ...req.query,
      }),
    }).send(res);
  });

  static markAsRead = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Mark notification as read success",
      data: await NotificationService.markAsRead({
        notificationId: req.params.notificationId,
        userId: req.user.id,
        accountType: req.user.accountType || "user",
      }),
    }).send(res);
  });
}

module.exports = NotificationController;
