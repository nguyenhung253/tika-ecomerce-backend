"use strict";

const express = require("express");
const NotificationController = require("../../controllers/notification.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication } = require("../../auth/authentication");

const router = express.Router();

router.use(authentication);

router.get("", asyncHandler(NotificationController.getNotifications));
router.patch(
  "/:notificationId/read",
  asyncHandler(NotificationController.markAsRead),
);

module.exports = router;
