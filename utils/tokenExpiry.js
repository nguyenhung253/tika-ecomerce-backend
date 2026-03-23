"use strict";

/**
 * Parse token expiry string to Date object
 * @param {string} expiryString - Format: "7d", "24h", "30m"
 * @returns {Date} - Expiry date
 */
const parseTokenExpiry = (expiryString) => {
  const expiresAt = new Date();
  const match = expiryString.match(/(\d+)([dhm])/);

  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "d":
        expiresAt.setDate(expiresAt.getDate() + value);
        break;
      case "h":
        expiresAt.setHours(expiresAt.getHours() + value);
        break;
      case "m":
        expiresAt.setMinutes(expiresAt.getMinutes() + value);
        break;
    }
  }

  return expiresAt;
};

module.exports = { parseTokenExpiry };
