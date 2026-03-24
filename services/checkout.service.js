"use strict";

const {
  BadRequestError,
  ForbiddenRequestError,
  NotFoundError,
} = require("../helpers/error.response");
const { findCartById } = require("../models/repositories/cart.repo");
const { checkProductByServer } = require("../models/repositories/product.repo");
const DiscountService = require("./discount.service");
const PaymentService = require("./payment.service");
const { NotificationService } = require("./notification.service");
const { order } = require("../models/order.model");
const { cart } = require("../models/cart.model");
const { inventory } = require("../models/inventory.model");
const {
  getCache,
  setCache,
  deleteCache,
} = require("../utils/cache/cache.service");
const CacheKeys = require("../utils/cache/cache.keys");
const { logAuditEvent } = require("../helpers/audit.helper");

const IDEMPOTENCY_RESULT_TTL_SECONDS = 600;
const IDEMPOTENCY_LOCK_TTL_SECONDS = 30;

const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const CHECKOUT_ERROR_CODES = {
  IDEMPOTENCY_KEY_TOO_LONG: "CHECKOUT_IDEMPOTENCY_KEY_TOO_LONG",
  IDEMPOTENCY_IN_PROGRESS: "CHECKOUT_IDEMPOTENCY_IN_PROGRESS",
  CART_NOT_FOUND: "CHECKOUT_CART_NOT_FOUND",
  ORDER_INVALID_ITEMS: "CHECKOUT_INVALID_ITEMS",
  INVENTORY_INSUFFICIENT: "CHECKOUT_INVENTORY_INSUFFICIENT",
  ORDER_NOT_FOUND: "CHECKOUT_ORDER_NOT_FOUND",
  ORDER_CANCEL_INVALID_STATUS: "CHECKOUT_CANCEL_INVALID_STATUS",
  STATUS_INVALID: "CHECKOUT_STATUS_INVALID",
  STATUS_TRANSITION_INVALID: "CHECKOUT_STATUS_TRANSITION_INVALID",
  SHOP_ORDER_FORBIDDEN: "CHECKOUT_SHOP_ORDER_FORBIDDEN",
  SHOP_CANCEL_FORBIDDEN: "CHECKOUT_SHOP_CANCEL_FORBIDDEN",
};

/**
 * Checkout Service
 * 1. Checkout Review - Xem trước đơn hàng
 * 2. Order by User - Đặt hàng
 */

class CheckoutService {
  static buildPaginationInput(query = {}, defaultLimit = 20, maxLimit = 100) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const rawLimit = parseInt(query.limit, 10) || defaultLimit;
    const limit = Math.min(Math.max(rawLimit, 1), maxLimit);
    return { page, limit };
  }

  static buildSortInput(query = {}, defaultSortBy = "createdAt") {
    const allowedSortFields = ["createdAt", "updatedAt", "order_status"];
    const sortByField = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : defaultSortBy;
    const order =
      String(query.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    return {
      sortByField,
      order,
      sortBy: {
        [sortByField]: order,
      },
    };
  }

  static buildOrderFilter({ userId, query = {} }) {
    const filter = {
      order_userId: userId,
    };

    if (query.status) {
      filter.order_status = query.status;
    }

    const minTotal = Number(query.minTotal);
    const maxTotal = Number(query.maxTotal);
    if (!Number.isNaN(minTotal) || !Number.isNaN(maxTotal)) {
      filter["order_checkout.totalCheckout"] = {};
      if (!Number.isNaN(minTotal)) {
        filter["order_checkout.totalCheckout"].$gte = minTotal;
      }
      if (!Number.isNaN(maxTotal)) {
        filter["order_checkout.totalCheckout"].$lte = maxTotal;
      }
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : null;
    const toDate = query.toDate ? new Date(query.toDate) : null;
    if (
      (fromDate && !Number.isNaN(fromDate.getTime())) ||
      (toDate && !Number.isNaN(toDate.getTime()))
    ) {
      filter.createdAt = {};
      if (fromDate && !Number.isNaN(fromDate.getTime())) {
        filter.createdAt.$gte = fromDate;
      }
      if (toDate && !Number.isNaN(toDate.getTime())) {
        filter.createdAt.$lte = toDate;
      }
    }

    return filter;
  }

  static buildPaginationMeta({ page, limit, totalItems }) {
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    return {
      totalItems,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  static normalizeIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) {
      return "";
    }

    const normalizedKey = String(idempotencyKey).trim();
    if (!normalizedKey) {
      return "";
    }

    if (normalizedKey.length > 128) {
      throw new BadRequestError(
        "Idempotency key is too long",
        undefined,
        CHECKOUT_ERROR_CODES.IDEMPOTENCY_KEY_TOO_LONG,
      );
    }

    return normalizedKey;
  }

  static async handleIdempotencyResult({ userId, idempotencyKey }) {
    const resultKey = CacheKeys.order.idempotencyResult(userId, idempotencyKey);
    const lockKey = CacheKeys.order.idempotencyLock(userId, idempotencyKey);

    const cachedOrder = await getCache(resultKey);
    if (cachedOrder) {
      return {
        lockKey,
        resultKey,
        cachedOrder,
      };
    }

    const inProgress = await getCache(lockKey);
    if (inProgress?.processing) {
      logAuditEvent("checkout.idempotency.in_progress", {
        userId: String(userId),
        idempotencyKey,
      });
      throw new BadRequestError(
        "An order request with this idempotency key is being processed",
        undefined,
        CHECKOUT_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS,
      );
    }

    await setCache(
      lockKey,
      {
        processing: true,
      },
      IDEMPOTENCY_LOCK_TTL_SECONDS,
    );

    return {
      lockKey,
      resultKey,
      cachedOrder: null,
    };
  }

  static async restoreReservedInventory(reservedItems = []) {
    for (let i = 0; i < reservedItems.length; i++) {
      const { productId, quantity } = reservedItems[i];

      await inventory.findOneAndUpdate(
        {
          inven_productId: productId,
        },
        {
          $inc: {
            inven_stock: quantity,
          },
        },
      );
    }
  }

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
    if (!foundCart) {
      throw new BadRequestError(
        "Cart does not exist",
        undefined,
        CHECKOUT_ERROR_CODES.CART_NOT_FOUND,
      );
    }

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
        throw new BadRequestError(
          "Order wrong!",
          undefined,
          CHECKOUT_ERROR_CODES.ORDER_INVALID_ITEMS,
        );
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
    idempotencyKey,
  }) {
    const normalizedIdempotencyKey =
      CheckoutService.normalizeIdempotencyKey(idempotencyKey);

    let idempotencyContext = null;
    if (normalizedIdempotencyKey) {
      idempotencyContext = await CheckoutService.handleIdempotencyResult({
        userId,
        idempotencyKey: normalizedIdempotencyKey,
      });

      if (idempotencyContext.cachedOrder) {
        return idempotencyContext.cachedOrder;
      }
    }

    const reservedItems = [];
    let createdOrder = null;

    try {
      const { shop_order_ids_new, checkout_order } =
        await CheckoutService.checkoutReview({
          cartId,
          userId,
          shop_order_ids,
        });

      // Check lại inventory
      const products = shop_order_ids_new.flatMap(
        (order) => order.item_products,
      );

      for (let i = 0; i < products.length; i++) {
        const { productId, quantity } = products[i];

        // Reserve inventory
        const reserveResult = await this.reserveInventory({
          productId,
          quantity,
          cartId,
        });

        if (!reserveResult) {
          logAuditEvent("inventory.update.failed", {
            userId: String(userId),
            productId: String(productId),
            quantity,
            reason: "insufficient_stock",
          });

          throw new BadRequestError(
            `Product ${productId} is out of stock or insufficient quantity`,
            undefined,
            CHECKOUT_ERROR_CODES.INVENTORY_INSUFFICIENT,
          );
        }

        reservedItems.push({
          productId,
          quantity,
        });
      }

      const normalizedPayment = PaymentService.buildOrderPaymentSnapshot(
        user_payment,
        checkout_order.totalCheckout,
      );

      // Create order
      createdOrder = await order.create({
        order_userId: userId,
        order_checkout: checkout_order,
        order_shipping: user_address,
        order_payment: normalizedPayment,
        order_products: shop_order_ids_new,
      });

      const payment = await PaymentService.createPaymentForOrder({
        orderDoc: createdOrder,
        userId,
        paymentInput: user_payment,
      });

      // If order created successfully
      if (createdOrder) {
        // Remove products from cart
        await cart.findByIdAndUpdate(cartId, {
          cart_products: [],
          cart_count_products: 0,
        });

        const responsePayload = {
          order: createdOrder.toObject(),
          payment,
        };

        if (idempotencyContext) {
          await setCache(
            idempotencyContext.resultKey,
            responsePayload,
            IDEMPOTENCY_RESULT_TTL_SECONDS,
          );
        }

        await NotificationService.notifyOrderCreated({
          userId,
          accountType: "user",
          orderId: String(createdOrder._id),
          totalCheckout: checkout_order.totalCheckout,
          paymentMethod: payment?.method || normalizedPayment.method,
        });

        logAuditEvent("order.created", {
          orderId: String(createdOrder._id),
          userId: String(userId),
          totalCheckout: checkout_order.totalCheckout,
          paymentMethod: user_payment?.method || "COD",
        });

        return responsePayload;
      }
    } catch (error) {
      if (createdOrder?._id) {
        await order.findByIdAndDelete(createdOrder._id);
      }

      if (reservedItems.length > 0) {
        // Roll back only items that were actually reserved successfully.
        await CheckoutService.restoreReservedInventory(reservedItems);

        logAuditEvent("checkout.inventory.rollback", {
          userId: String(userId),
          cartId: String(cartId),
          reservedItems,
          reason: error?.message || "unknown_error",
        });
      }

      throw error;
    } finally {
      if (idempotencyContext) {
        await deleteCache(idempotencyContext.lockKey);
      }
    }
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
  static async getOrdersByUser({ userId, ...query }) {
    const { page, limit } = CheckoutService.buildPaginationInput(
      query,
      20,
      100,
    );
    const {
      sortByField,
      order: sortOrder,
      sortBy,
    } = CheckoutService.buildSortInput(query, "createdAt");
    const filter = CheckoutService.buildOrderFilter({ userId, query });
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      order.find(filter).sort(sortBy).skip(skip).limit(limit).lean(),
      order.countDocuments(filter),
    ]);

    return {
      items,
      pagination: CheckoutService.buildPaginationMeta({
        page,
        limit,
        totalItems,
      }),
      sort: {
        sortBy: sortByField,
        order: sortOrder === 1 ? "asc" : "desc",
      },
      filters: {
        status: query.status || "",
        minTotal:
          query.minTotal !== undefined
            ? Number(query.minTotal) || 0
            : undefined,
        maxTotal:
          query.maxTotal !== undefined
            ? Number(query.maxTotal) || 0
            : undefined,
        fromDate: query.fromDate || "",
        toDate: query.toDate || "",
      },
    };
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
      throw new NotFoundError(
        "Order not found",
        undefined,
        CHECKOUT_ERROR_CODES.ORDER_NOT_FOUND,
      );
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
      throw new BadRequestError(
        "Cannot cancel order at this status",
        undefined,
        CHECKOUT_ERROR_CODES.ORDER_CANCEL_INVALID_STATUS,
      );
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

    await NotificationService.notifyOrderStatusUpdated({
      userId,
      accountType: "user",
      orderId: String(foundOrder._id),
      status: "cancelled",
    });

    return foundOrder;
  }

  /**
   * Update order status by shop
   */
  static async updateOrderStatusByShop({ orderId, shopId, status }) {
    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestError(
        "Invalid order status",
        undefined,
        CHECKOUT_ERROR_CODES.STATUS_INVALID,
      );
    }

    const foundOrder = await order.findById(orderId);
    if (!foundOrder) {
      throw new NotFoundError(
        "Order not found",
        undefined,
        CHECKOUT_ERROR_CODES.ORDER_NOT_FOUND,
      );
    }

    const ownsAnyOrderItem = (foundOrder.order_products || []).some(
      (shopOrder) => String(shopOrder?.shopId) === String(shopId),
    );

    if (!ownsAnyOrderItem) {
      logAuditEvent("checkout.shop.update_status.denied", {
        orderId: String(orderId),
        shopId: String(shopId),
        requestedStatus: status,
        reason: "shop_not_owner",
      });
      throw new ForbiddenRequestError(
        "You do not have permission to update this order",
        undefined,
        CHECKOUT_ERROR_CODES.SHOP_ORDER_FORBIDDEN,
      );
    }

    if (status === "cancelled") {
      logAuditEvent("checkout.shop.cancel.denied", {
        orderId: String(orderId),
        shopId: String(shopId),
      });
      throw new ForbiddenRequestError(
        "Shop cannot cancel orders. Please use customer cancellation flow",
        undefined,
        CHECKOUT_ERROR_CODES.SHOP_CANCEL_FORBIDDEN,
      );
    }

    const currentStatus = String(foundOrder.order_status || "");
    if (currentStatus === status) {
      return foundOrder;
    }

    const allowedNextStatuses = ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      logAuditEvent("checkout.status.transition.denied", {
        orderId: String(orderId),
        shopId: String(shopId),
        fromStatus: currentStatus,
        toStatus: status,
      });
      throw new BadRequestError(
        `Invalid status transition from ${currentStatus} to ${status}`,
        undefined,
        CHECKOUT_ERROR_CODES.STATUS_TRANSITION_INVALID,
      );
    }

    foundOrder.order_status = status;
    await foundOrder.save();

    await NotificationService.notifyOrderStatusUpdated({
      userId: foundOrder.order_userId,
      accountType: "user",
      orderId: String(foundOrder._id),
      status,
    });

    return foundOrder;
  }
}

module.exports = CheckoutService;
