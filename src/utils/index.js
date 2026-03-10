"use strict";

const _ = require("lodash");

/**
 * Get select data for MongoDB query
 * @param {Array} select - Array of fields to select ['field1', 'field2']
 * @returns {Object} - Object for MongoDB select {field1: 1, field2: 1}
 */
const getSelectData = (select = []) => {
  return Object.fromEntries(select.map((el) => [el, 1]));
};

/**
 * Get unselect data for MongoDB query
 * @param {Array} select - Array of fields to exclude ['field1', 'field2']
 * @returns {Object} - Object for MongoDB select {field1: 0, field2: 0}
 */
const unGetSelectData = (select = []) => {
  return Object.fromEntries(select.map((el) => [el, 0]));
};

/**
 * Remove null and undefined values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} - Cleaned object
 */
const removeUndefinedObject = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] == null) {
      delete obj[key];
    }
  });
  return obj;
};

/**
 * Update nested object parser
 * Example: {a: {b: {c: 1}}} => {'a.b.c': 1}
 */
const updateNestedObjectParser = (obj) => {
  const final = {};
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      const response = updateNestedObjectParser(obj[key]);
      Object.keys(response).forEach((a) => {
        final[`${key}.${a}`] = response[a];
      });
    } else {
      final[key] = obj[key];
    }
  });
  return final;
};

module.exports = {
  getSelectData,
  unGetSelectData,
  removeUndefinedObject,
  updateNestedObjectParser,
};
