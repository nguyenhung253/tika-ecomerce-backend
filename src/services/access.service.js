"use strict";
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const {
  BadRequestError,
  ConflictRequestError,
} = require("../helpers/error.response");
const { OK, CREATED } = require("../helpers/success.response");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/authToken");
const VALID_ROLES = ["shop", "customer", "admin"];

class AccessService {
  static signUp = async ({ name, email, password, role = "customer" }) => {
    // Check if user already exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      throw new ConflictRequestError("User already exists");
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestError("Invalid role");
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
    };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return new CREATED({
      message: "User registered successfully",
      data: {
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
      },
    });
  };

  static login = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) {
      throw new BadRequestError("Email or password incorrect");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestError("Email or password incorrect");
    }

    // Create token payload
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return new OK({
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  };
}

module.exports = AccessService;
