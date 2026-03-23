"use strict";

const express = require("express");
const CartController = require("../../controllers/cart.controller");
const asyncHandler = require("../../helpers/asyncHandler");
const { authentication } = require("../../auth/authentication");
const router = express.Router();

// All cart routes require authentication
router.use(authentication);

// Add to cart
router.post("", asyncHandler(CartController.addToCart));

// Add to cart V2
router.post("/v2", asyncHandler(CartController.addToCartV2));

// Update quantity
router.patch("/update", asyncHandler(CartController.updateCartQuantity));

// Delete item
router.delete("/item", asyncHandler(CartController.deleteCartItem));

// Get cart
router.get("", asyncHandler(CartController.getCart));

// Delete cart
router.delete("", asyncHandler(CartController.deleteCart));

// Update cart state
router.patch("/state", asyncHandler(CartController.updateCartState));

module.exports = router;
