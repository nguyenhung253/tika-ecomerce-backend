"use strict";

const { cart } = require("../models/cart.model");
const { product } = require("../models/product.model");
const {
  BadRequestError,
  NotFoundError,
} = require("../helpers/error.response");

/*
    Cart Service:
    - Add product to cart (user)
    - Update product quantity (increase/decrease)
    - Get cart 
    - Delete cart 
    - Delete cart item
*/

class CartService {
  /**
   * Create new cart for user
   */
  static async createUserCart({ userId, product }) {
    const query = { cart_userId: userId, cart_state: "active" };
    const updateOrInsert = {
      $addToSet: {
        cart_products: product,
      },
    };
    const options = { upsert: true, new: true };

    return await cart.findOneAndUpdate(query, updateOrInsert, options);
  }

  /**
   * Update product quantity in cart
   */
  static async updateUserCartQuantity({ userId, product }) {
    const { productId, quantity, old_quantity } = product;

    const foundCart = await cart.findOne({
      cart_userId: userId,
      cart_state: "active",
      "cart_products.productId": productId,
    });

    if (!foundCart) {
      throw new NotFoundError("Cart or product not found");
    }

    // Check if increasing or decreasing
    if (quantity === 0) {
      // Remove product from cart
      return await CartService.deleteUserCartItem({ userId, productId });
    }

    const updateQuery = {
      cart_userId: userId,
      "cart_products.productId": productId,
      cart_state: "active",
    };

    const updateSet = {
      $inc: {
        "cart_products.$.quantity": quantity - old_quantity,
      },
    };

    const options = { upsert: true, new: true };

    return await cart.findOneAndUpdate(updateQuery, updateSet, options);
  }

  /**
   * Add product to cart
   */
  static async addToCart({ userId, product = {} }) {
    // Validate product exists
    const foundProduct = await product.findById(product.productId);
    if (!foundProduct) {
      throw new NotFoundError("Product not found");
    }

    // Check if product is published
    if (!foundProduct.isPublished) {
      throw new BadRequestError("Product is not available");
    }

    // Check cart exists
    const userCart = await cart.findOne({
      cart_userId: userId,
      cart_state: "active",
    });

    if (!userCart) {
      // Create cart if not exists
      return await CartService.createUserCart({ userId, product });
    }

    // If cart exists but empty
    if (!userCart.cart_products.length) {
      userCart.cart_products = [product];
      return await userCart.save();
    }

    // Check if product already in cart
    const productExists = userCart.cart_products.find(
      (p) => p.productId === product.productId
    );

    if (productExists) {
      // Update quantity
      return await CartService.updateUserCartQuantity({
        userId,
        product: {
          productId: product.productId,
          quantity: productExists.quantity + product.quantity,
          old_quantity: productExists.quantity,
        },
      });
    }

    // Add new product to cart
    userCart.cart_products.push(product);
    return await userCart.save();
  }

  /**
   * Reduce product quantity in cart
   */
  static async addToCartV2({ userId, shop_order_ids = [] }) {
    /*
    shop_order_ids: [
      {
        shopId,
        item_products: [
          {
            quantity,
            price,
            shopId,
            old_quantity,
            productId
          }
        ],
        version
      }
    ]
    */

    const { productId, quantity, old_quantity } =
      shop_order_ids[0]?.item_products[0];

    // Check product exists
    const foundProduct = await product.findById(productId);
    if (!foundProduct) {
      throw new NotFoundError("Product not found");
    }

    // Compare product price
    if (foundProduct.product_price !== shop_order_ids[0].item_products[0].price) {
      throw new BadRequestError("Product price has changed");
    }

    const updateCart = await cart.findOneAndUpdate(
      {
        cart_userId: userId,
        "cart_products.productId": productId,
        cart_state: "active",
      },
      {
        $inc: {
          "cart_products.$.quantity": quantity - old_quantity,
        },
      },
      { upsert: true, new: true }
    );

    return updateCart;
  }

  /**
   * Delete item from cart
   */
  static async deleteUserCartItem({ userId, productId }) {
    const deleteResult = await cart.updateOne(
      {
        cart_userId: userId,
        cart_state: "active",
      },
      {
        $pull: {
          cart_products: {
            productId,
          },
        },
      }
    );

    return deleteResult;
  }

  /**
   * Get user cart
   */
  static async getListUserCart({ userId }) {
    return await cart
      .findOne({
        cart_userId: userId,
        cart_state: "active",
      })
      .lean();
  }

  /**
   * Delete entire cart
   */
  static async deleteUserCart({ userId }) {
    const deleteResult = await cart.deleteOne({
      cart_userId: userId,
      cart_state: "active",
    });

    return deleteResult;
  }

  /**
   * Update cart state (active -> completed/failed)
   */
  static async updateCartState({ userId, state }) {
    const validStates = ["active", "completed", "failed", "pending"];
    if (!validStates.includes(state)) {
      throw new BadRequestError("Invalid cart state");
    }

    return await cart.findOneAndUpdate(
      {
        cart_userId: userId,
        cart_state: "active",
      },
      {
        cart_state: state,
      },
      { new: true }
    );
  }
}

module.exports = CartService;