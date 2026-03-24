"use strict";

const express = require("express");
const PaymentController = require("../../controllers/payment.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication, requireRole } = require("../../auth/authentication");

const router = express.Router();

router.get("/vnpay/return", asyncHandler(PaymentController.getVnpayReturnInformation));
router.get("/vnpay/ipn", asyncHandler(PaymentController.handleVnpayIpn));

router.use(authentication);
router.use(requireRole("customer", "admin"));

router.get(
  "/orders/:orderId",
  asyncHandler(PaymentController.getPaymentByOrder),
);

router.post(
  "/orders/:orderId/confirm",
  asyncHandler(PaymentController.confirmMockPayment),
);

module.exports = router;
