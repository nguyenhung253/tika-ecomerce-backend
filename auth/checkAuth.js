"use strict";

const asyncHandler = require("../helpers/asyncHandler");
const { ForbiddenRequestError } = require("../helpers/error.response");
const { findById } = require("../services/apikey.service");

const HEADER = {
  API_KEY: "x-api-key",
  AUTHORIZATION: "authorization",
};

const apiKey = asyncHandler(async (req, res, next) => {
  const key = req.headers[HEADER.API_KEY]?.toString();
  if (!key) throw new ForbiddenRequestError("API key is required");

  const objKey = await findById(key);
  if (!objKey) {
    throw new ForbiddenRequestError("Invalid API key");
  }
  req.objKey = objKey;
  return next();
});

// Check permission middleware
const permission = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.objKey.permission) {
      throw new ForbiddenRequestError("Permission denied");
    }
    const hasPermission = req.objKey.permission.includes(requiredPermission);
    if (!hasPermission) {
      throw new ForbiddenRequestError("Permission denied");
    }
    return next();
  });
};

module.exports = { apiKey, permission, HEADER };
