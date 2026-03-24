"use strict";

const asyncHandler = require("../helpers/asyncHandler");
const { TooManyRequestsError } = require("../helpers/error.response");
const { getRedis } = require("../configs/init.redis");
const {
  GLOBAL_API_RATE_LIMIT_MAX_REQUESTS,
  GLOBAL_API_RATE_LIMIT_WINDOW_SECONDS,
} = require("../configs/auth.config");

const getClientIpAddress = (req) => {
  const forwardedForHeader = req.headers["x-forwarded-for"];
  if (typeof forwardedForHeader === "string" && forwardedForHeader.length > 0) {
    return forwardedForHeader.split(",")[0].trim();
  }

  const ipAddressFromExpress = req.ip;
  if (ipAddressFromExpress) {
    return ipAddressFromExpress;
  }

  const ipAddressFromConnection = req.connection?.remoteAddress;
  if (ipAddressFromConnection) {
    return ipAddressFromConnection;
  }

  return "unknown";
};

const getNormalizedEmailFromBody = (req) => {
  if (!req.body?.email) {
    return "";
  }

  return String(req.body.email).trim().toLowerCase();
};

const getHeaderValue = (headers, headerName) => {
  const rawValue = headers?.[headerName];
  if (!rawValue) {
    return "";
  }

  return String(rawValue).trim();
};

const getGlobalApiIdentifier = (req) => {
  const ipAddress = getClientIpAddress(req);
  const apiKey = getHeaderValue(req.headers, "x-api-key") || "anonymous-key";
  const clientId =
    getHeaderValue(req.headers, "x-client-id") || "anonymous-client";

  return `${ipAddress}:${apiKey}:${clientId}`;
};

const getIdentifierFromBody = (req) => {
  const normalizedEmail = getNormalizedEmailFromBody(req);
  if (normalizedEmail) {
    return normalizedEmail;
  }

  if (!req.body?.phone) {
    return "";
  }

  return String(req.body.phone).trim();
};

const createRateLimiter = ({
  keyPrefix,
  windowSeconds,
  maxRequests,
  message,
  keyGenerator,
}) => {
  return asyncHandler(async (req, res, next) => {
    const rateLimitIdentifier = keyGenerator(req);
    if (!rateLimitIdentifier) {
      return next();
    }

    const client = getRedis();
    const key = `rate-limit:${keyPrefix}:${rateLimitIdentifier}`;
    const count = await client.incr(key);

    if (count === 1) {
      await client.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      const ttl = await client.ttl(key);
      throw new TooManyRequestsError(
        `${message}. Please retry in ${Math.max(ttl, 1)} seconds.`,
      );
    }

    return next();
  });
};

const createCooldownLimiter = ({
  keyPrefix,
  cooldownSeconds,
  message,
  keyGenerator,
}) => {
  return asyncHandler(async (req, res, next) => {
    const cooldownIdentifier = keyGenerator(req);
    if (!cooldownIdentifier) {
      return next();
    }

    const client = getRedis();
    const key = `cooldown:${keyPrefix}:${cooldownIdentifier}`;
    const ttl = await client.ttl(key);

    if (ttl > 0) {
      throw new TooManyRequestsError(
        `${message}. Please retry in ${ttl} seconds.`,
      );
    }

    await client.set(key, "1", { EX: cooldownSeconds });
    return next();
  });
};

const loginIpRateLimit = createRateLimiter({
  keyPrefix: "auth:login:ip",
  windowSeconds: 60,
  maxRequests: 10,
  message: "Too many login attempts from this IP",
  keyGenerator: getClientIpAddress,
});

const loginEmailRateLimit = createRateLimiter({
  keyPrefix: "auth:login:email",
  windowSeconds: 60,
  maxRequests: 5,
  message: "Too many login attempts for this email",
  keyGenerator: getNormalizedEmailFromBody,
});

const registerIpRateLimit = createRateLimiter({
  keyPrefix: "auth:register:ip",
  windowSeconds: 600,
  maxRequests: 5,
  message: "Too many register attempts from this IP",
  keyGenerator: getClientIpAddress,
});

const forgotPasswordIdentifierRateLimit = createRateLimiter({
  keyPrefix: "auth:forgot-password:identifier",
  windowSeconds: 60,
  maxRequests: 5,
  message: "Too many forgot-password requests for this identifier",
  keyGenerator: getIdentifierFromBody,
});

const otpSendRateLimit = createRateLimiter({
  keyPrefix: "auth:otp:send",
  windowSeconds: 300,
  maxRequests: 3,
  message: "OTP send limit exceeded",
  keyGenerator: getIdentifierFromBody,
});

const otpSendCooldown = createCooldownLimiter({
  keyPrefix: "auth:otp:send",
  cooldownSeconds: 60,
  message: "Please wait before requesting OTP again",
  keyGenerator: getIdentifierFromBody,
});

const otpVerifyRateLimit = createRateLimiter({
  keyPrefix: "auth:otp:verify",
  windowSeconds: 60,
  maxRequests: 10,
  message: "Too many OTP verification attempts",
  keyGenerator: getIdentifierFromBody,
});

const globalApiRateLimit = createRateLimiter({
  keyPrefix: "api:global",
  windowSeconds: GLOBAL_API_RATE_LIMIT_WINDOW_SECONDS,
  maxRequests: GLOBAL_API_RATE_LIMIT_MAX_REQUESTS,
  message: "Global API rate limit exceeded",
  keyGenerator: getGlobalApiIdentifier,
});

module.exports = {
  globalApiRateLimit,
  loginIpRateLimit,
  loginEmailRateLimit,
  registerIpRateLimit,
  forgotPasswordIdentifierRateLimit,
  otpSendRateLimit,
  otpSendCooldown,
  otpVerifyRateLimit,
};
