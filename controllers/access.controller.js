"use strict";
const AccessService = require("../services/access.service");
const asyncHandler = require("../helpers/asyncHandler");
const { BadRequestError } = require("../helpers/error.response");
const { SuccessResponse, CREATED } = require("../helpers/success.response");

class AccessController {
  static signUp = asyncHandler(async (req, res, next) => {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    const result = await AccessService.signUp({
      name,
      email,
      password,
      role,
    });
    return new CREATED({ message: "Registered OK!", data: result }).send(res);
  });

  static signUpShop = asyncHandler(async (req, res, next) => {
    const { name, email, password, description, address } = req.body;

    if (!email || !password || !name) {
      throw new BadRequestError("Name, email and password are required");
    }

    const result = await AccessService.signUpShop({
      name,
      email,
      password,
      description,
      address,
    });
    return new CREATED({ message: "Shop registered OK!", data: result }).send(
      res,
    );
  });

  static login = asyncHandler(async (req, res, next) => {
    const { email, password, accountType } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    const result = await AccessService.login({ email, password, accountType });
    return new SuccessResponse({
      message: "Login successful",
      data: result,
    }).send(res);
  });

  static logout = asyncHandler(async (req, res, next) => {
    const refreshToken = req.refreshToken;

    const result = await AccessService.logout({ refreshToken });
    return new SuccessResponse({
      message: "Logout successful",
      data: result,
    }).send(res);
  });

  static logoutAll = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    const result = await AccessService.logoutAll({ userId });
    return new SuccessResponse({
      message: "Logged out from all devices",
      data: result,
    }).send(res);
  });

  static refreshToken = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const accountType = req.user.accountType || "user";
    const oldRefreshToken = req.refreshToken;

    const result = await AccessService.refreshToken({
      userId,
      oldRefreshToken,
      accountType,
    });
    return new SuccessResponse({
      message: "Token refreshed successfully",
      data: result,
    }).send(res);
  });

  static forgotPassword = asyncHandler(async (req, res, next) => {
    const { email, accountType } = req.body;
    if (!email) throw new BadRequestError("Email is required");
    if (!accountType) throw new BadRequestError("Account Type is required");
    const result = await AccessService.forgotPassword({ email, accountType });
    return new SuccessResponse({
      message: result.message,
      data: {
        ttl: 300,
      },
    }).send(res);
  });
}

module.exports = AccessController;
