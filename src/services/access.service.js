"use strict";
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const {
  BadRequestError,
  ConflictRequestError,
} = require("../helpers/error.response");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/authToken");
const TokenService = require("./token.service");
const { parseTokenExpiry } = require("../utils/tokenExpiry");

const USER_ROLES = ["customer", "admin"];
const ACCOUNT_TYPES = ["user", "shop"];

class AccessService {
  /**
   * Sign up for User (customer/admin)
   */
  static signUp = async ({ name, email, password, role = "customer" }) => {
    // Check if user already exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      throw new ConflictRequestError("User already exists");
    }

    // Validate role
    if (!USER_ROLES.includes(role)) {
      throw new BadRequestError(
        "Invalid role. Use signUpShop for shop registration.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: passwordHash,
      role,
    });

    // Create token payload
    const payload = {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      accountType: "user",
    };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to database
    const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || "7d";
    const expiresAt = parseTokenExpiry(refreshTokenExpire);

    await TokenService.saveRefreshToken({
      userId: newUser._id,
      refreshToken,
      expiresAt,
    });

    return {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  };

  /**
   * Sign up for Shop
   */
  static signUpShop = async ({
    name,
    email,
    password,
    description = "",
    address = "",
  }) => {
    // Check if shop already exists
    const existingShop = await Shop.findOne({ email }).lean();
    if (existingShop) {
      throw new ConflictRequestError("Shop already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create new shop
    const newShop = await Shop.create({
      name,
      email,
      password: passwordHash,
      description,
      address,
    });

    // Create token payload
    const payload = {
      id: newShop._id,
      email: newShop.email,
      role: "shop",
      accountType: "shop",
    };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to database
    const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || "7d";
    const expiresAt = parseTokenExpiry(refreshTokenExpire);

    await TokenService.saveRefreshToken({
      userId: newShop._id,
      refreshToken,
      expiresAt,
    });

    return {
      shop: {
        id: newShop._id,
        name: newShop.name,
        email: newShop.email,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  };

  static login = async ({ email, password, accountType = "user" }) => {
    let account;
    let role;

    if (accountType === "shop") {
      account = await Shop.findOne({ email });
      role = "shop";
    } else {
      account = await User.findOne({ email });
      role = account?.role;
    }

    if (!account) {
      throw new BadRequestError("Email or password incorrect");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new BadRequestError("Email or password incorrect");
    }

    // Create token payload
    const payload = {
      id: account._id,
      email: account.email,
      role: role,
      accountType: accountType,
    };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to database
    const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || "7d";
    const expiresAt = parseTokenExpiry(refreshTokenExpire);

    await TokenService.saveRefreshToken({
      userId: account._id,
      refreshToken,
      expiresAt,
    });

    return {
      [accountType]: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  };

  // Logout - blacklist current token
  static logout = async ({ refreshToken }) => {
    if (!refreshToken) {
      throw new BadRequestError("Refresh token is required");
    }

    await TokenService.blacklistToken(refreshToken);

    return { message: "Logout successful" };
  };

  // Logout all devices - blacklist all user tokens
  static logoutAll = async ({ userId }) => {
    await TokenService.blacklistAllUserTokens(userId);

    return { message: "Logged out from all devices" };
  };

  // Refresh access token
  static refreshToken = async ({
    userId,
    oldRefreshToken,
    accountType = "user",
  }) => {
    let account;
    let role;

    if (accountType === "shop") {
      account = await Shop.findById(userId);
      role = "shop";
    } else {
      account = await User.findById(userId);
      role = account?.role;
    }

    if (!account) {
      throw new BadRequestError("Account not found");
    }

    // Blacklist old refresh token
    await TokenService.blacklistToken(oldRefreshToken);

    // Create new token payload
    const payload = {
      id: account._id,
      email: account.email,
      role: role,
      accountType: accountType,
    };

    // Generate new tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save new refresh token
    const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || "7d";
    const expiresAt = parseTokenExpiry(refreshTokenExpire);

    await TokenService.saveRefreshToken({
      userId: account._id,
      refreshToken,
      expiresAt,
    });

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  };
}

module.exports = AccessService;
