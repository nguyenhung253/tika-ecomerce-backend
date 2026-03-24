"use strict";
const express = require("express");
const { apiKey, permission } = require("../auth/checkAuth");
const { globalApiRateLimit } = require("../auth/rateLimit");
const router = express.Router();

// Global rate limit for all API routes
router.use(globalApiRateLimit);

// Check API key cho tất cả routes
router.use(apiKey);
router.use(permission("read"));

// Mount sub-routes
router.use("/auth", require("./access"));
router.use("/product", require("./product"));
router.use("/discount", require("./discount"));
router.use("/cart", require("./cart"));
router.use("/checkout", require("./checkout"));
router.use("/comment", require("./comment"));
router.use("/payment", require("./payment"));
router.use("/notification", require("./notification"));
module.exports = router;
