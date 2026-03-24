"use strict";

const crypto = require("crypto");

const VNPAY_VERSION = "2.1.0";
const VNPAY_COMMAND = "pay";
const VNPAY_CURRENCY = "VND";
const VNPAY_DEFAULT_LOCALE = "vn";
const VNPAY_DEFAULT_ORDER_TYPE = "other";
const VNPAY_SUCCESS_RESPONSE_CODE = "00";

const getVnpayConfig = () => {
  return {
    paymentUrl:
      process.env.VNPAY_PAYMENT_URL ||
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    terminalCode: process.env.VNPAY_TERMINAL_CODE || "",
    hashSecret: process.env.VNPAY_HASH_SECRET || "",
    returnUrl: process.env.VNPAY_RETURN_URL || "",
    ipnUrl: process.env.VNPAY_IPN_URL || "",
  };
};

const padNumber = (value) => String(value).padStart(2, "0");

const formatDateInVietnamTime = (date) => {
  const vietnamDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );

  return [
    vietnamDate.getFullYear(),
    padNumber(vietnamDate.getMonth() + 1),
    padNumber(vietnamDate.getDate()),
    padNumber(vietnamDate.getHours()),
    padNumber(vietnamDate.getMinutes()),
    padNumber(vietnamDate.getSeconds()),
  ].join("");
};

const buildSortedQueryString = (parameters) => {
  const sortedKeys = Object.keys(parameters).sort();
  return sortedKeys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`)
    .join("&");
};

const createSecureHash = (parameters, hashSecret) => {
  const sortedQueryString = buildSortedQueryString(parameters);
  return crypto
    .createHmac("sha512", hashSecret)
    .update(sortedQueryString, "utf8")
    .digest("hex");
};

const removeVietnameseAccents = (input = "") => {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const sanitizeOrderInformation = (input = "") => {
  return removeVietnameseAccents(input)
    .replace(/[^a-zA-Z0-9\s:.,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getClientIpAddress = (request) => {
  const forwardedForHeader = request.headers["x-forwarded-for"];
  if (typeof forwardedForHeader === "string" && forwardedForHeader.length > 0) {
    return forwardedForHeader.split(",")[0].trim();
  }

  return request.ip || request.connection?.remoteAddress || "127.0.0.1";
};

const buildVnpayPaymentUrl = ({
  amount,
  transactionReference,
  orderInformation,
  clientIpAddress,
  bankCode = "",
  locale = VNPAY_DEFAULT_LOCALE,
}) => {
  const config = getVnpayConfig();
  if (!config.terminalCode || !config.hashSecret || !config.returnUrl) {
    throw new Error(
      "Missing VNPay configuration. Set VNPAY_TERMINAL_CODE, VNPAY_HASH_SECRET, and VNPAY_RETURN_URL",
    );
  }

  const createDate = formatDateInVietnamTime(new Date());
  const expireDate = formatDateInVietnamTime(
    new Date(Date.now() + 15 * 60 * 1000),
  );

  const requestParameters = {
    vnp_Version: VNPAY_VERSION,
    vnp_Command: VNPAY_COMMAND,
    vnp_TmnCode: config.terminalCode,
    vnp_Amount: String(Math.round(Number(amount) * 100)),
    vnp_CreateDate: createDate,
    vnp_CurrCode: VNPAY_CURRENCY,
    vnp_IpAddr: clientIpAddress,
    vnp_Locale: locale || VNPAY_DEFAULT_LOCALE,
    vnp_OrderInfo: sanitizeOrderInformation(orderInformation),
    vnp_OrderType: VNPAY_DEFAULT_ORDER_TYPE,
    vnp_ReturnUrl: config.returnUrl,
    vnp_TxnRef: transactionReference,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    requestParameters.vnp_BankCode = bankCode;
  }

  const secureHash = createSecureHash(requestParameters, config.hashSecret);
  const queryString = buildSortedQueryString(requestParameters);

  return `${config.paymentUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
};

const verifyVnpayResponse = (queryParameters = {}) => {
  const config = getVnpayConfig();
  const responseParameters = { ...queryParameters };
  const receivedSecureHash = responseParameters.vnp_SecureHash || "";

  delete responseParameters.vnp_SecureHash;
  delete responseParameters.vnp_SecureHashType;

  const expectedSecureHash = createSecureHash(
    responseParameters,
    config.hashSecret,
  );

  return {
    isValidSignature: receivedSecureHash === expectedSecureHash,
    responseCode: responseParameters.vnp_ResponseCode || "",
    transactionStatus: responseParameters.vnp_TransactionStatus || "",
    transactionReference: responseParameters.vnp_TxnRef || "",
    amount: Number(responseParameters.vnp_Amount || 0) / 100,
    rawData: responseParameters,
  };
};

module.exports = {
  VNPAY_SUCCESS_RESPONSE_CODE,
  buildVnpayPaymentUrl,
  verifyVnpayResponse,
  getClientIpAddress,
};
