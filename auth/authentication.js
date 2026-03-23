"use strict";
const asyncHandler = require("../helpers/asyncHandler");
const {
  UnauthorizedRequestError,
  ForbiddenRequestError,
} = require("../helpers/error.response");
const { verifyAccessToken, verifyRefreshToken } = require("../utils/authToken");
const TokenService = require("../services/token.service");

const HEADER = {
  AUTHORIZATION: "authorization",
  REFRESH_TOKEN: "x-refresh-token",
};

// Verify access token middleware
const authentication = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers[HEADER.AUTHORIZATION];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedRequestError("Access token is required");
  }

  const accessToken = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(accessToken);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedRequestError("Access token expired");
    }
    throw new UnauthorizedRequestError("Invalid access token");
  }
});

// Verify refresh token middleware
const verifyRefreshTokenMiddleware = asyncHandler(async (req, res, next) => {
  const refreshToken =
    req.headers[HEADER.REFRESH_TOKEN] || req.body.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedRequestError("Refresh token is required");
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await TokenService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new ForbiddenRequestError("Token has been revoked");
    }

    const decoded = verifyRefreshToken(refreshToken);
    req.user = decoded;
    req.refreshToken = refreshToken;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedRequestError("Refresh token expired");
    }
    if (error instanceof ForbiddenRequestError) {
      throw error;
    }
    throw new UnauthorizedRequestError("Invalid refresh token");
  }
});

// Check role middleware
const requireRole = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new ForbiddenRequestError("Access denied");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenRequestError(
        `Only ${allowedRoles.join(", ")} can access this resource`,
      );
    }

    return next();
  });
};

module.exports = {
  authentication,
  verifyRefreshTokenMiddleware,
  requireRole,
  HEADER,
};
