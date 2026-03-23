const user = require("../user.model");

const mongoose = require("mongoose");

const findByEmail = async (email) => {
  return await user.findOne(email);
};
