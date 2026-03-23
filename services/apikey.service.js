"use strict";

const apikeyModel = require("../models/apikey.model");
const crypto = require("crypto");

const findById = async (key) => {
  const objKey = await apikeyModel.findOne({ key, status: true }).lean();
  return objKey;
};

// Tạo API key mới (dùng khi cần tạo key cho client)
const createApiKey = async (permissions = ["read"]) => {
  const newKey = await apikeyModel.create({
    key: crypto.randomBytes(64).toString("hex"),
    permission: permissions,
  });
  return newKey;
};

module.exports = { findById, createApiKey };
