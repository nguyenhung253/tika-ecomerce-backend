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
    idempotencyResult: (userId, idemKey) =>
      `order:idempotency:result:${userId}:${idemKey}`,
    idempotencyLock: (userId, idemKey) =>
      `order:idempotency:lock:${userId}:${idemKey}`,
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
    loginFailCounter: (accountType, email) =>
      `auth:login:fail-counter:${accountType}:${email}`,
    loginFailBlock: (accountType, email) =>
      `auth:login:fail-block:${accountType}:${email}`,
    forgotPasswordOtp: (accountType, email) =>
      `auth:forgot-password:otp:${accountType}:${email}`,
    forgotPasswordVerified: (accountType, email) =>
      `auth:forgot-password:verified:${accountType}:${email}`,
    forgotPasswordOtpVerifyBlock: (accountType, email) =>
      `auth:forgot-password:otp-verify-block:${accountType}:${email}`,
    googleOAuthState: (state) => `auth:google-oauth:state:${state}`,
  },

  discount: {
    detail: (id) => `discount:detail:${id}`,
    shop: (shopId) => `discount:shop:${shopId}`,
    active: () => `discount:active`,
  },
};

module.exports = CacheKeys;
