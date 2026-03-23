"use strict";

const express = require("express");
const CheckoutController = require("../../controllers/checkout.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication, requireRole } = require("../../auth/authentication");
const router = express.Router();

// All checkout routes require authentication
router.use(authentication);

// User routes
router.post("/review", asyncHandler(CheckoutController.checkoutReview));

router.post("/order", asyncHandler(CheckoutController.orderByUser));

router.get("/orders", asyncHandler(CheckoutController.getOrdersByUser));

router.get(
  "/orders/:orderId",
  asyncHandler(CheckoutController.getOneOrderByUser),
);

router.post(
  "/orders/:orderId/cancel",
  asyncHandler(CheckoutController.cancelOrderByUser),
);

// Shop routes
router.patch(
  "/orders/:orderId/status",
  requireRole("shop"),
  asyncHandler(CheckoutController.updateOrderStatusByShop),
);

module.exports = router;
