"use strict";

const { product } = require("../product.model");
const { getSelectData, unGetSelectData } = require("../../utils/index");

/**
 * Find all draft products for shop
 */
const findAllDraftShop = async ({ query, limit, page = 1, sortBy }) => {
  return await queryProduct({ query, limit, page, sortBy });
};

/**
 * Find all published products for shop
 */
const findAllPublishedShop = async ({ query, limit, page = 1, sortBy }) => {
  return await queryProduct({ query, limit, page, sortBy });
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
const findAllProducts = async ({
  limit,
  page,
  filter,
  select,
  sortBy = { _id: -1 },
}) => {
  const skip = (page - 1) * limit;
  const [products, totalItems] = await Promise.all([
    product
      .find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .select(getSelectData(select))
      .lean(),
    product.countDocuments(filter),
  ]);

  return {
    items: products,
    totalItems,
  };
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
const queryProduct = async ({
  query,
  limit,
  page = 1,
  sortBy = { _id: -1 },
}) => {
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    product
      .find(query)
      .populate("product_shop", "name email -_id")
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean(),
    product.countDocuments(query),
  ]);

  return {
    items,
    totalItems,
  };
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
