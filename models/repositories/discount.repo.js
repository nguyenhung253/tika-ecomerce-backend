"use strict";

const { unGetSelectData } = require("../../utils/index");

/**
 * Find all discount codes with unselect fields
 */
const findAllDiscountCodesUnSelect = async ({
  limit = 50,
  page = 1,
  sort = "ctime",
  filter,
  unSelect,
  model,
}) => {
  const skip = (page - 1) * limit;
  const sortBy = sort === "ctime" ? { _id: -1 } : { _id: 1 };

  const discounts = await model
    .find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .select(unGetSelectData(unSelect))
    .lean();

  return discounts;
};

/**
 * Find all discount codes with select fields
 */
const findAllDiscountCodesSelect = async ({
  limit = 50,
  page = 1,
  sort = "ctime",
  filter,
  select,
  model,
}) => {
  const skip = (page - 1) * limit;
  const sortBy = sort === "ctime" ? { _id: -1 } : { _id: 1 };

  const discounts = await model
    .find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .select(select)
    .lean();

  return discounts;
};

/**
 * Check if discount exists
 */
const checkDiscountExists = async ({ model, filter }) => {
  return await model.findOne(filter).lean();
};

module.exports = {
  findAllDiscountCodesUnSelect,
  findAllDiscountCodesSelect,
  checkDiscountExists,
};
