"use strict";
const jwt = require("jsonwebtoken");

const getEnvValue = (...keys) => {
  for (let i = 0; i < keys.length; i++) {
    const value = process.env[keys[i]];
    if (value) {
      return value;
    }
  }

  return "";
};

const getRequiredSecret = (primaryKey, fallbackKey) => {
  const secret = getEnvValue(primaryKey, fallbackKey);
  if (!secret) {
    throw new Error(
      `Missing token secret. Set ${primaryKey}${
        fallbackKey ? ` or ${fallbackKey}` : ""
      }`,
    );
  }

  return secret;
};

// Generate Access Token
const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    getRequiredSecret("ACCESS_TOKEN_SECRET", "JWT_SECRET"),
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRE || "15m",
    },
  );
};

// Generate Refresh Token
const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    getRequiredSecret("REFRESH_TOKEN_SECRET", "JWT_REFRESH_SECRET"),
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRE || "7d",
    },
  );
};

// Verify Access Token

const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    getRequiredSecret("ACCESS_TOKEN_SECRET", "JWT_SECRET"),
  );
};

// Verify Refresh Token

const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    getRequiredSecret("REFRESH_TOKEN_SECRET", "JWT_REFRESH_SECRET"),
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
