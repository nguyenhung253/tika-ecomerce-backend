"use strict";

const { BadRequestError, NotFoundError } = require("../helpers/error.response");
const { findCartById } = require("../models/repositories/cart.repo");
const { checkProductByServer } = require("../models/repositories/product.repo");
const DiscountService = require("./discount.service");
const { order } = require("../models/order.model");
const { cart } = require("../models/cart.model");
const { inventory } = require("../models/inventory.model");

/**
 * Checkout Service
 * 1. Checkout Review - Xem trước đơn hàng
 * 2. Order by User - Đặt hàng
 */

class CheckoutService {
  /**
   * 1. Checkout Review
   * Tính toán tổng tiền, discount, shipping fee
   */
  static async checkoutReview({ cartId, userId, shop_order_ids = [] }) {
    /**
     * Input format:
     * {
     *   cartId,
     *   userId,
     *   shop_order_ids: [
     *     {
     *       shopId,
     *       shop_discounts: [{ codeId, shopId }],
     *       item_products: [
     *         {
     *           price,
     *           quantity,
     *           productId
     *         }
     *       ]
     *     }
     *   ]
     * }
     */

    // Check cart exists
    const foundCart = await findCartById(cartId);
    if (!foundCart) throw new BadRequestError("Cart does not exist");

    const checkout_order = {
      totalPrice: 0, // Tổng tiền hàng
      feeShip: 0, // Phí ship
      totalDiscount: 0, // Tổng giảm giá
      totalCheckout: 0, // Tổng thanh toán
    };

    const shop_order_ids_new = [];

    // Tính toán cho từng shop
    for (let i = 0; i < shop_order_ids.length; i++) {
      const {
        shopId,
        shop_discounts = [],
        item_products = [],
      } = shop_order_ids[i];

      // 1. Check product available
      const checkProductServer = await checkProductByServer(item_products);
      if (!checkProductServer[0]) {
        throw new BadRequestError("Order wrong!");
      }

      // 2. Tính tổng tiền của shop này
      const checkoutPrice = checkProductServer.reduce((acc, product) => {
        return acc + product.quantity * product.price;
      }, 0);

      // 3. Tổng tiền trước khi xử lý
      checkout_order.totalPrice += checkoutPrice;

      const itemCheckout = {
        shopId,
        shop_discounts,
        priceRaw: checkoutPrice, // Tiền trước giảm giá
        priceApplyDiscount: checkoutPrice,
        item_products: checkProductServer,
      };

      // 4. Nếu có discount code
      if (shop_discounts.length > 0) {
        // Giả sử chỉ áp dụng 1 discount
        const { discount = 0 } = await DiscountService.getDiscountAmount({
          codeId: shop_discounts[0].codeId,
          userId,
          shopId,
          products: checkProductServer,
        });

        checkout_order.totalDiscount += discount;
        itemCheckout.priceApplyDiscount = checkoutPrice - discount;
      }

      // 5. Tổng thanh toán cuối cùng
      checkout_order.totalCheckout += itemCheckout.priceApplyDiscount;
      shop_order_ids_new.push(itemCheckout);
    }

    return {
      shop_order_ids,
      shop_order_ids_new,
      checkout_order,
    };
  }

  /**
   * 2. Order by User
   * Tạo đơn hàng thực sự
   */
  static async orderByUser({
    shop_order_ids,
    cartId,
    userId,
    user_address = {},
    user_payment = {},
  }) {
    const { shop_order_ids_new, checkout_order } =
      await CheckoutService.checkoutReview({
        cartId,
        userId,
        shop_order_ids,
      });

    // Check lại inventory
    const products = shop_order_ids_new.flatMap((order) => order.item_products);
    const acquireProduct = [];

    for (let i = 0; i < products.length; i++) {
      const { productId, quantity } = products[i];

      // Reserve inventory
      const reserveResult = await this.reserveInventory({
        productId,
        quantity,
        cartId,
      });

      acquireProduct.push(reserveResult);

      if (!reserveResult) {
        throw new BadRequestError(
          `Product ${productId} is out of stock or insufficient quantity`,
        );
      }
    }

    // Create order
    const newOrder = await order.create({
      order_userId: userId,
      order_checkout: checkout_order,
      order_shipping: user_address,
      order_payment: user_payment,
      order_products: shop_order_ids_new,
    });

    // If order created successfully
    if (newOrder) {
      // Remove products from cart
      await cart.findByIdAndUpdate(cartId, {
        cart_products: [],
        cart_count_products: 0,
      });
    }

    return newOrder;
  }

  /**
   * Reserve inventory for order
   */
  static async reserveInventory({ productId, quantity, cartId }) {
    const reservation = await inventory.findOneAndUpdate(
      {
        inven_productId: productId,
        inven_stock: { $gte: quantity }, // Đủ hàng
      },
      {
        $inc: {
          inven_stock: -quantity, // Trừ stock
        },
        $push: {
          inven_reservations: {
            cartId,
            quantity,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    );

    return reservation;
  }

  /**
   * Query orders by user
   */
  static async getOrdersByUser({ userId, limit = 50, page = 1 }) {
    const skip = (page - 1) * limit;
    const orders = await order
      .find({ order_userId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return orders;
  }

  /**
   * Get one order by user
   */
  static async getOneOrderByUser({ orderId, userId }) {
    const foundOrder = await order
      .findOne({
        _id: orderId,
        order_userId: userId,
      })
      .lean();

    if (!foundOrder) {
      throw new NotFoundError("Order not found");
    }

    return foundOrder;
  }

  /**
   * Cancel order by user
   */
  static async cancelOrderByUser({ orderId, userId }) {
    const foundOrder = await order.findOne({
      _id: orderId,
      order_userId: userId,
    });

    if (!foundOrder) {
      throw new NotFoundError("Order not found");
    }

    // Only can cancel if order is pending
    if (foundOrder.order_status !== "pending") {
      throw new BadRequestError("Cannot cancel order at this status");
    }

    // Restore inventory
    const products = foundOrder.order_products.flatMap(
      (shop) => shop.item_products,
    );

    for (let i = 0; i < products.length; i++) {
      const { productId, quantity } = products[i];

      await inventory.findOneAndUpdate(
        {
          inven_productId: productId,
        },
        {
          $inc: {
            inven_stock: quantity, // Hoàn lại stock
          },
        },
      );
    }

    // Update order status
    foundOrder.order_status = "cancelled";
    await foundOrder.save();

    return foundOrder;
  }

  /**
   * Update order status by shop
   */
  static async updateOrderStatusByShop({ orderId, status }) {
    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestError("Invalid order status");
    }

    const updatedOrder = await order.findByIdAndUpdate(
      orderId,
      {
        order_status: status,
      },
      { new: true },
    );

    if (!updatedOrder) {
      throw new NotFoundError("Order not found");
    }

    return updatedOrder;
  }
}

module.exports = CheckoutService;
