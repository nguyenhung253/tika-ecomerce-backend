"use strict";
const Token = require("../models/token.model");
const { BadRequestError } = require("../helpers/error.response");

class TokenService {
  // Save refresh token to database
  static saveRefreshToken = async ({ userId, refreshToken, expiresAt }) => {
    return await Token.create({
      userId,
      refreshToken,
      expiresAt,
      isBlacklisted: false,
    });
  };

  // Check if token is blacklisted
  static isTokenBlacklisted = async (refreshToken) => {
    const token = await Token.findOne({ refreshToken }).lean();
    return token ? token.isBlacklisted : false;
  };

  // Blacklist a specific token (single device logout)
  static blacklistToken = async (refreshToken) => {
    const token = await Token.findOne({ refreshToken });
    if (!token) {
      throw new BadRequestError("Token not found");
    }
    token.isBlacklisted = true;
    await token.save();
    return token;
  };

  // Blacklist all tokens for a user (logout all devices)
  static blacklistAllUserTokens = async (userId) => {
    return await Token.updateMany(
      { userId, isBlacklisted: false },
      { isBlacklisted: true },
    );
  };

  // Remove expired tokens (cleanup job)
  static removeExpiredTokens = async () => {
    return await Token.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  };

  // Get active tokens for user
  static getActiveTokens = async (userId) => {
    return await Token.find({
      userId,
      isBlacklisted: false,
      expiresAt: { $gt: new Date() },
    }).lean();
  };
}

module.exports = TokenService;
