"use strict";

const { product } = require("../product.model");
const { getSelectData, unGetSelectData } = require("../../utils/index");

/**
 * Find all draft products for shop
 */
const findAllDraftShop = async ({ query, limit, skip }) => {
  return await queryProduct({ query, limit, skip });
};

/**
 * Find all published products for shop
 */
const findAllPublishedShop = async ({ query, limit, skip }) => {
  return await queryProduct({ query, limit, skip });
};

/**
 * Search products by keyword
 */
const searchProductByUser = async ({ keySearch }) => {
  const regexSearch = new RegExp(keySearch);
  const results = await product
    .find(
      {
        isPublished: true,
        $text: { $search: regexSearch },
      },
      { score: { $meta: "textScore" } },
    )
    .sort({ score: { $meta: "textScore" } })
    .lean();

  return results;
};

/**
 * Find all products with filters
 */
const findAllProducts = async ({ limit, sort, page, filter, select }) => {
  const skip = (page - 1) * limit;
  const sortBy = sort === "ctime" ? { _id: -1 } : { _id: 1 };
  const products = await product
    .find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .select(getSelectData(select))
    .lean();

  return products;
};

/**
 * Find product by ID
 */
const findProduct = async ({ product_id, unSelect }) => {
  return await product
    .findById(product_id)
    .select(unGetSelectData(unSelect))
    .lean();
};

/**
 * Update product by ID
 */
const updateProductById = async ({
  productId,
  bodyUpdate,
  model,
  isNew = true,
}) => {
  return await model.findByIdAndUpdate(productId, bodyUpdate, {
    new: isNew,
  });
};

/**
 * Common query function for products
 */
const queryProduct = async ({ query, limit, skip }) => {
  return await product
    .find(query)
    .populate("product_shop", "name email -_id")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Check product availability and get latest info
 */
const checkProductByServer = async (products) => {
  return await Promise.all(
    products.map(async (product) => {
      const foundProduct = await product.findById(product.productId).lean();
      if (foundProduct) {
        return {
          price: foundProduct.product_price,
          quantity: product.quantity,
          productId: product.productId,
          name: foundProduct.product_name,
          thump: foundProduct.product_thump,
        };
      }
    }),
  );
};

module.exports = {
  findAllDraftShop,
  findAllPublishedShop,
  searchProductByUser,
  findAllProducts,
  findProduct,
  updateProductById,
  checkProductByServer,
};
