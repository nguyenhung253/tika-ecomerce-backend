"use strict";

const PaymentService = require("../services/payment.service");
const { SuccessResponse } = require("../helpers/success.response");
const asyncHandler = require("../helpers/asyncHandler");

class PaymentController {
  static getPaymentByOrder = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get payment detail success",
      data: await PaymentService.getPaymentByOrder({
        orderId: req.params.orderId,
        userId: req.user.id,
      }),
    }).send(res);
  });

  static confirmMockPayment = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Payment confirmed successfully",
      data: await PaymentService.confirmMockPayment({
        orderId: req.params.orderId,
        userId: req.user.id,
        transactionRef:
          req.body.transactionRef || req.query.transactionRef || "",
      }),
    }).send(res);
  });

  static getVnpayReturnInformation = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "VNPay return information retrieved successfully",
      data: await PaymentService.getVnpayReturnInformation(req.query),
    }).send(res);
  });

  static handleVnpayIpn = asyncHandler(async (req, res, next) => {
    const result = await PaymentService.handleVnpayIpn(req.query);
    return res.status(200).json(result);
  });
}

module.exports = PaymentController;
