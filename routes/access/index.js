"use strict";
const express = require("express");
const AccessController = require("../../controllers/access.controller");
const {
  authentication,
  verifyRefreshTokenMiddleware,
} = require("../../auth/authentication");
const {
  loginIpRateLimit,
  loginEmailRateLimit,
  registerIpRateLimit,
  forgotPasswordIdentifierRateLimit,
  otpSendRateLimit,
  otpSendCooldown,
  otpVerifyRateLimit,
} = require("../../auth/rateLimit");

const router = express.Router();

// Public routes
router.post("/signup", registerIpRateLimit, AccessController.signUp);
router.post("/signup/shop", registerIpRateLimit, AccessController.signUpShop);
router.post(
  "/login",
  loginIpRateLimit,
  loginEmailRateLimit,
  AccessController.login,
);
router.get("/google/authorization-url", AccessController.getGoogleAuthorizationUrl);
router.get("/google/callback", AccessController.googleCallback);

// Protected routes - require authentication
router.post("/logout", verifyRefreshTokenMiddleware, AccessController.logout);

router.post("/logout-all", authentication, AccessController.logoutAll);

router.post(
  "/refresh-token",
  verifyRefreshTokenMiddleware,
  AccessController.refreshToken,
);

router.post(
  "/forgot-password/request-otp",
  forgotPasswordIdentifierRateLimit,
  otpSendRateLimit,
  otpSendCooldown,
  AccessController.forgotPassword,
);
router.post(
  "/forgot-password/verify-otp",
  otpVerifyRateLimit,
  AccessController.verifyForgotPasswordOtp,
);
router.post("/forgot-password/reset", AccessController.resetForgotPassword);

module.exports = router;
