const CacheKeys = {
  product: {
    detail: (id) => `product:detail:${id}`,
    list: ({
      page = 1,
      limit = 20,
      sort = "ctime",
      category = "",
      search = "",
    }) =>
      `product:list:page=${page}:limit=${limit}:sort=${sort}:category=${category}:search=${search}`,
    search: (keySearch) => `product:search:${keySearch}`,
    shopDrafts: (shopId, page = 1, limit = 50) =>
      `product:shop:${shopId}:drafts:page=${page}:limit=${limit}`,
    shopPublished: (shopId, page = 1, limit = 50) =>
      `product:shop:${shopId}:published:page=${page}:limit=${limit}`,
  },

  cart: {
    user: (userId) => `cart:user:${userId}`,
  },

  order: {
    detail: (id) => `order:detail:${id}`,
    user: (userId) => `order:user:${userId}`,
  },

  user: {
    profile: (id) => `user:profile:${id}`,
  },

  shop: {
    profile: (id) => `shop:profile:${id}`,
  },

  auth: {
    blacklist: (jti) => `auth:blacklist:${jti}`,
    refreshToken: (userId) => `auth:refresh:${userId}`,
    forgotPasswordOtp: (accountType, email) =>
      `auth:forgot-password:otp:${accountType}:${email}`,
  },

  discount: {
    detail: (id) => `discount:detail:${id}`,
    shop: (shopId) => `discount:shop:${shopId}`,
    active: () => `discount:active`,
  },
};

module.exports = CacheKeys;
