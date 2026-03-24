"use strict";

const { getPositiveIntegerFromEnv } = require("../helpers/env.helper");

module.exports = {
  GLOBAL_API_RATE_LIMIT_MAX_REQUESTS: getPositiveIntegerFromEnv(
    "GLOBAL_API_RATE_LIMIT_MAX_REQUESTS",
    300,
  ),
  GLOBAL_API_RATE_LIMIT_WINDOW_SECONDS: getPositiveIntegerFromEnv(
    "GLOBAL_API_RATE_LIMIT_WINDOW_SECONDS",
    60,
  ),
  LOGIN_FAIL_MAX_ATTEMPTS: getPositiveIntegerFromEnv(
    "LOGIN_FAIL_MAX_ATTEMPTS",
    5,
  ),
  LOGIN_FAIL_WINDOW_SECONDS: getPositiveIntegerFromEnv(
    "LOGIN_FAIL_WINDOW_SECONDS",
    900,
  ),
  LOGIN_FAIL_BLOCK_SECONDS: getPositiveIntegerFromEnv(
    "LOGIN_FAIL_BLOCK_SECONDS",
    900,
  ),
  OTP_TTL_SECONDS: getPositiveIntegerFromEnv("OTP_TTL_SECONDS", 300),
  OTP_MAX_ATTEMPTS: getPositiveIntegerFromEnv("OTP_MAX_ATTEMPTS", 5),
  VERIFIED_TTL_SECONDS: getPositiveIntegerFromEnv("VERIFIED_TTL_SECONDS", 600),
  OTP_VERIFY_BLOCK_SECONDS: getPositiveIntegerFromEnv(
    "OTP_VERIFY_BLOCK_SECONDS",
    900,
  ),
  REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || "7d",
};
