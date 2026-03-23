"use strict";

const express = require("express");
const DiscountController = require("../../controllers/discount.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication, requireRole } = require("../../auth/authentication");
const router = express.Router();

// Public routes
router.get(
  "/products",
  asyncHandler(DiscountController.getAllDiscountCodesWithProduct),
);

// Protected routes - require authentication
router.use(authentication);

// User routes
router.post("/amount", asyncHandler(DiscountController.getDiscountAmount));

router.post("/cancel", asyncHandler(DiscountController.cancelDiscountCode));

// Shop only routes
router.post(
  "",
  requireRole("shop"),
  asyncHandler(DiscountController.createDiscountCode),
);

router.patch(
  "/:discountId",
  requireRole("shop"),
  asyncHandler(DiscountController.updateDiscountCode),
);

router.get(
  "",
  requireRole("shop"),
  asyncHandler(DiscountController.getAllDiscountCodesByShop),
);

router.delete(
  "/:codeId",
  requireRole("shop"),
  asyncHandler(DiscountController.deleteDiscountCode),
);

module.exports = router;
