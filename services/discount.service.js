"use strict";

const {
  BadRequestError,
  NotFoundError,
  ConflictRequestError,
} = require("../helpers/error.response");
const { discount } = require("../models/discount.model");
const { product } = require("../models/product.model");
const {
  findAllDiscountCodesUnSelect,
  checkDiscountExists,
} = require("../models/repositories/discount.repo");

/**
 * Discount Service
 * 1. Generate Discount Code [shop/admin]
 * 2. Get all discount codes [shop]
 * 3. Get all products with discount code [user]
 * 4. Get discount amount [user]
 * 5. Delete discount code [shop/admin]
 * 6. Cancel discount code [user]
 */

class DiscountService {
  /**
   * 1. Create discount code
   */
  static async createDiscountCode(payload) {
    const {
      code,
      start_date,
      end_date,
      is_active,
      shopId,
      min_order_value,
      product_ids,
      applies_to,
      name,
      description,
      type,
      value,
      max_value,
      max_users,
      users_count,
      max_uses_per_user,
    } = payload;

    // Validate dates
    if (new Date() < new Date(start_date) || new Date() > new Date(end_date)) {
      throw new BadRequestError("Discount code has expired");
    }

    if (new Date(start_date) >= new Date(end_date)) {
      throw new BadRequestError("Start date must be before end date");
    }

    // Check if discount code already exists
    const foundDiscount = await discount
      .findOne({
        discount_code: code,
        discount_shopId: shopId,
      })
      .lean();

    if (foundDiscount && foundDiscount.discount_is_active) {
      throw new ConflictRequestError("Discount code already exists");
    }

    // Create new discount
    const newDiscount = await discount.create({
      discount_name: name,
      discount_description: description,
      discount_type: type,
      discount_value: value,
      discount_code: code,
      discount_start_date: new Date(start_date),
      discount_end_date: new Date(end_date),
      discount_max_users: max_users,
      discount_cout_user: users_count || 0,
      discount_user_used: [],
      discount_max_user_per_user: max_uses_per_user,
      disocunt_min_order_value: min_order_value,
      discount_shopId: shopId,
      discount_is_active: is_active,
      discount_applies_to: applies_to,
      discount_product_ids: applies_to === "specific" ? product_ids : [],
    });

    return newDiscount;
  }

  /**
   * 2. Update discount code
   */
  static async updateDiscountCode(discountId, shopId, bodyUpdate) {
    const foundDiscount = await discount.findOne({
      _id: discountId,
      discount_shopId: shopId,
    });

    if (!foundDiscount) {
      throw new NotFoundError("Discount not found");
    }

    const updatedDiscount = await discount.findByIdAndUpdate(
      discountId,
      bodyUpdate,
      { new: true },
    );

    return updatedDiscount;
  }

  /**
   * 3. Get all products with discount code
   */
  static async getAllDiscountCodesWithProduct({
    code,
    shopId,
    userId,
    limit,
    page,
  }) {
    // Find discount code
    const foundDiscount = await discount
      .findOne({
        discount_code: code,
        discount_shopId: shopId,
      })
      .lean();

    if (!foundDiscount || !foundDiscount.discount_is_active) {
      throw new NotFoundError("Discount not found");
    }

    const { discount_applies_to, discount_product_ids } = foundDiscount;

    let products;
    if (discount_applies_to === "all") {
      // Get all products of shop
      products = await product
        .find({
          product_shop: shopId,
          isPublished: true,
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    } else {
      // Get specific products
      products = await product
        .find({
          _id: { $in: discount_product_ids },
          isPublished: true,
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    return products;
  }

  /**
   * 4. Get all discount codes of shop
   */
  static async getAllDiscountCodesByShop({ limit, page, shopId }) {
    const discounts = await findAllDiscountCodesUnSelect({
      limit: +limit,
      page: +page,
      filter: {
        discount_shopId: shopId,
        discount_is_active: true,
      },
      unSelect: ["__v", "discount_shopId"],
      model: discount,
    });

    return discounts;
  }

  /**
   * 5. Get discount amount
   */
  static async getDiscountAmount({ codeId, userId, shopId, products }) {
    const foundDiscount = await checkDiscountExists({
      model: discount,
      filter: {
        discount_code: codeId,
        discount_shopId: shopId,
      },
    });

    if (!foundDiscount) {
      throw new NotFoundError("Discount not found");
    }

    const {
      discount_is_active,
      discount_max_users,
      discount_start_date,
      discount_end_date,
      disocunt_min_order_value,
      discount_max_user_per_user,
      discount_user_used,
      discount_type,
      discount_value,
    } = foundDiscount;

    // Check if discount is active
    if (!discount_is_active) {
      throw new BadRequestError("Discount expired");
    }

    // Check max users
    if (discount_max_users === 0) {
      throw new BadRequestError("Discount are out");
    }

    // Check date range
    const now = new Date();
    if (
      now < new Date(discount_start_date) ||
      now > new Date(discount_end_date)
    ) {
      throw new BadRequestError("Discount code has expired");
    }

    // Check min order value
    let totalOrder = 0;
    if (disocunt_min_order_value > 0) {
      totalOrder = products.reduce((acc, product) => {
        return acc + product.quantity * product.price;
      }, 0);

      if (totalOrder < disocunt_min_order_value) {
        throw new BadRequestError(
          `Discount requires a minimum order value of ${disocunt_min_order_value}`,
        );
      }
    }

    // Check max uses per user
    if (discount_max_user_per_user > 0) {
      const userUsedCount = discount_user_used.filter(
        (user) => user === userId,
      ).length;

      if (userUsedCount >= discount_max_user_per_user) {
        throw new BadRequestError(
          "You have reached the maximum uses for this discount",
        );
      }
    }

    // Calculate discount amount
    const amount =
      discount_type === "fixed_amount"
        ? discount_value
        : totalOrder * (discount_value / 100);

    return {
      totalOrder,
      discount: amount,
      totalPrice: totalOrder - amount,
    };
  }

  /**
   * 6. Delete discount code
   */
  static async deleteDiscountCode({ shopId, codeId }) {
    const deleted = await discount.findOneAndDelete({
      discount_code: codeId,
      discount_shopId: shopId,
    });

    if (!deleted) {
      throw new NotFoundError("Discount not found");
    }

    return deleted;
  }

  /**
   * 7. Cancel discount code (user cancels applied discount)
   */
  static async cancelDiscountCode({ codeId, shopId, userId }) {
    const foundDiscount = await checkDiscountExists({
      model: discount,
      filter: {
        discount_code: codeId,
        discount_shopId: shopId,
      },
    });

    if (!foundDiscount) {
      throw new NotFoundError("Discount not found");
    }

    // Remove user from used list
    const result = await discount.findByIdAndUpdate(foundDiscount._id, {
      $pull: {
        discount_user_used: userId,
      },
      $inc: {
        discount_max_users: 1,
        discount_cout_user: -1,
      },
    });

    return result;
  }
}

module.exports = DiscountService;
