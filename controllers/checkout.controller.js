"use strict";

const { SuccessResponse, CREATED } = require("../helpers/success.response");
const CheckoutService = require("../services/checkout.service");
const asyncHandler = require("../helpers/asyncHandler");
const { getClientIpAddress } = require("../utils/vnpay");

class CheckoutController {
  /**
   * Checkout review - Xem trước đơn hàng
   */
  static checkoutReview = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Checkout review success",
      data: await CheckoutService.checkoutReview({
        ...req.body,
        userId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Order by user - Đặt hàng
   */
  static orderByUser = asyncHandler(async (req, res, next) => {
    const normalizedPaymentInput = {
      ...(req.body.user_payment || {}),
      clientIpAddress: getClientIpAddress(req),
    };

    return new CREATED({
      message: "Order created successfully",
      data: await CheckoutService.orderByUser({
        ...req.body,
        userId: req.user.id,
        user_payment: normalizedPaymentInput,
        idempotencyKey: req.headers["x-idempotency-key"],
      }),
    }).send(res);
  });

  /**
   * Get all orders by user
   */
  static getOrdersByUser = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get orders success",
      data: await CheckoutService.getOrdersByUser({
        userId: req.user.id,
        ...req.query,
      }),
    }).send(res);
  });

  /**
   * Get one order by user
   */
  static getOneOrderByUser = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get order detail success",
      data: await CheckoutService.getOneOrderByUser({
        orderId: req.params.orderId,
        userId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Cancel order by user
   */
  static cancelOrderByUser = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Cancel order success",
      data: await CheckoutService.cancelOrderByUser({
        orderId: req.params.orderId,
        userId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Update order status by shop
   */
  static updateOrderStatusByShop = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update order status success",
      data: await CheckoutService.updateOrderStatusByShop({
        orderId: req.params.orderId,
        shopId: req.user.id,
        status: req.body.status,
      }),
    }).send(res);
  });
}

module.exports = CheckoutController;
