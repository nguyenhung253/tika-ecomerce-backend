"use strict";
const AccessService = require("../services/access.service");
const asyncHandler = require("../helpers/asyncHandler");
const { BadRequestError } = require("../helpers/error.response");

class AccessController {
  static signUp = asyncHandler(async (req, res, next) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      throw new BadRequestError("Name, email and password are required");
    }

    const result = await AccessService.signUp({
      name,
      email,
      password,
      role,
    });
    return result.send(res);
  });

  static login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    const result = await AccessService.login({ email, password });
    return result.send(res);
  });
}

module.exports = AccessController;
