"use strict";
const express = require("express");
const AccessController = require("../../controllers/access.controller");
const {
  authentication,
  verifyRefreshTokenMiddleware,
} = require("../../auth/authentication");

const router = express.Router();

// Public routes
router.post("/signup", AccessController.signUp);
router.post("/signup/shop", AccessController.signUpShop);
router.post("/login", AccessController.login);

// Protected routes - require authentication
router.post("/logout", verifyRefreshTokenMiddleware, AccessController.logout);

router.post("/logout-all", authentication, AccessController.logoutAll);

router.post(
  "/refresh-token",
  verifyRefreshTokenMiddleware,
  AccessController.refreshToken,
);

module.exports = router;
