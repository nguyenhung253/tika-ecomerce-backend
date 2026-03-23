"use strict";

const { SuccessResponse, CREATED } = require("../helpers/success.response");
const DiscountService = require("../services/discount.service");
const asyncHandler = require("../helpers/asyncHandler");

class DiscountController {
  /**
   * Create discount code
   */
  static createDiscountCode = asyncHandler(async (req, res, next) => {
    return new CREATED({
      message: "Create discount code success",
      data: await DiscountService.createDiscountCode({
        ...req.body,
        shopId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Update discount code
   */
  static updateDiscountCode = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update discount code success",
      data: await DiscountService.updateDiscountCode(
        req.params.discountId,
        req.user.id,
        req.body,
      ),
    }).send(res);
  });

  /**
   * Get all products with discount code
   */
  static getAllDiscountCodesWithProduct = asyncHandler(
    async (req, res, next) => {
      return new SuccessResponse({
        message: "Get products with discount success",
        data: await DiscountService.getAllDiscountCodesWithProduct({
          ...req.query,
          code: req.query.code,
          shopId: req.query.shopId,
          userId: req.user?.id,
        }),
      }).send(res);
    },
  );

  /**
   * Get all discount codes of shop
   */
  static getAllDiscountCodesByShop = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get discount codes success",
      data: await DiscountService.getAllDiscountCodesByShop({
        ...req.query,
        shopId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Get discount amount
   */
  static getDiscountAmount = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Calculate discount amount success",
      data: await DiscountService.getDiscountAmount({
        ...req.body,
        userId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Delete discount code
   */
  static deleteDiscountCode = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Delete discount code success",
      data: await DiscountService.deleteDiscountCode({
        shopId: req.user.id,
        codeId: req.params.codeId,
      }),
    }).send(res);
  });

  /**
   * Cancel discount code
   */
  static cancelDiscountCode = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Cancel discount code success",
      data: await DiscountService.cancelDiscountCode({
        ...req.body,
        userId: req.user.id,
      }),
    }).send(res);
  });
}

module.exports = DiscountController;
