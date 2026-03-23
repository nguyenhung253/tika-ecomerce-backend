"use strict";

const { SuccessResponse, CREATED } = require("../helpers/success.response");
const CartService = require("../services/cart.service");
const asyncHandler = require("../helpers/asyncHandler");

class CartController {
  /**
   * Add product to cart
   */
  static addToCart = asyncHandler(async (req, res, next) => {
    return new CREATED({
      message: "Add to cart success",
      data: await CartService.addToCart({
        userId: req.user.id,
        product: req.body,
      }),
    }).send(res);
  });

  /**
   * Add to cart V2 (with shop order structure)
   */
  static addToCartV2 = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update cart success",
      data: await CartService.addToCartV2({
        userId: req.user.id,
        shop_order_ids: req.body.shop_order_ids,
      }),
    }).send(res);
  });

  /**
   * Update product quantity in cart
   */
  static updateCartQuantity = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update quantity success",
      data: await CartService.updateUserCartQuantity({
        userId: req.user.id,
        product: req.body,
      }),
    }).send(res);
  });

  /**
   * Delete item from cart
   */
  static deleteCartItem = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Delete item success",
      data: await CartService.deleteUserCartItem({
        userId: req.user.id,
        productId: req.body.productId,
      }),
    }).send(res);
  });

  /**
   * Get user cart
   */
  static getCart = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Get cart success",
      data: await CartService.getListUserCart({
        userId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Delete entire cart
   */
  static deleteCart = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Delete cart success",
      data: await CartService.deleteUserCart({
        userId: req.user.id,
      }),
    }).send(res);
  });

  /**
   * Update cart state
   */
  static updateCartState = asyncHandler(async (req, res, next) => {
    return new SuccessResponse({
      message: "Update cart state success",
      data: await CartService.updateCartState({
        userId: req.user.id,
        state: req.body.state,
      }),
    }).send(res);
  });
}

module.exports = CartController;
