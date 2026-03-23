"use strict";

const {
  deleteCache,
  deleteByPattern,
} = require("../utils/cache/cache.service");
const CacheKeys = require("../utils/cache/cache.keys");

const invalidateProductCache = async (productId) => {
  await Promise.all([
    deleteCache(CacheKeys.product.detail(productId)),
    deleteByPattern("product:list:*"),
  ]);
};

module.exports = {
  invalidateProductCache,
};
