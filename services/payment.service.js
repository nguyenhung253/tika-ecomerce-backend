"use strict";

const crypto = require("crypto");
const { payment } = require("../models/payment.model");
const { order } = require("../models/order.model");
const {
  BadRequestError,
  NotFoundError,
} = require("../helpers/error.response");
const { NotificationService } = require("./notification.service");
const {
  VNPAY_SUCCESS_RESPONSE_CODE,
  buildVnpayPaymentUrl,
  verifyVnpayResponse,
} = require("../utils/vnpay");

const NON_COD_METHODS = ["credit_card", "paypal", "bank_transfer"];
const VNPAY_PAYMENT_METHOD = "vnpay";

class PaymentService {
  static normalizePaymentMethod(method = "COD") {
    const normalizedMethod = String(method || "COD").trim();
    const allowedMethods = ["COD", ...NON_COD_METHODS, VNPAY_PAYMENT_METHOD];

    if (!allowedMethods.includes(normalizedMethod)) {
      throw new BadRequestError("Invalid payment method");
    }

    return normalizedMethod;
  }

  static buildOrderPaymentSnapshot(paymentInput = {}, amount = 0) {
    const method = PaymentService.normalizePaymentMethod(paymentInput.method);
    const provider =
      method === "COD"
        ? "internal"
        : method === VNPAY_PAYMENT_METHOD
          ? "vnpay"
          : "mock_gateway";
    const status = method === "COD" ? "pending" : "requires_action";

    return {
      method,
      status,
      provider,
      transactionRef: "",
      amount,
      currency: paymentInput.currency || "VND",
      paidAt: null,
    };
  }

  static toPaymentResponse(paymentDoc) {
    if (!paymentDoc) {
      return null;
    }

    return {
      id: paymentDoc._id,
      orderId: paymentDoc.payment_orderId,
      method: paymentDoc.payment_method,
      provider: paymentDoc.payment_provider,
      amount: paymentDoc.payment_amount,
      currency: paymentDoc.payment_currency,
      status: paymentDoc.payment_status,
      transactionRef: paymentDoc.payment_transactionRef,
      checkoutUrl: paymentDoc.payment_checkoutUrl,
      processedAt: paymentDoc.payment_processedAt,
    };
  }

  static buildTransactionRef(orderId) {
    return `PAY-${String(orderId)}-${crypto.randomBytes(4).toString("hex")}`;
  }

  static async markPaymentAsPaid(foundPayment, foundOrder, gatewayPayload = {}) {
    if (foundPayment.payment_status === "paid") {
      return PaymentService.toPaymentResponse(foundPayment);
    }

    foundPayment.payment_status = "paid";
    foundPayment.payment_processedAt = new Date();
    foundPayment.payment_gatewayPayload = {
      ...foundPayment.payment_gatewayPayload,
      ...gatewayPayload,
    };
    await foundPayment.save();

    foundOrder.order_payment = {
      ...(foundOrder.order_payment || {}),
      method: foundPayment.payment_method,
      status: "paid",
      provider: foundPayment.payment_provider,
      transactionRef: foundPayment.payment_transactionRef,
      paidAt: foundPayment.payment_processedAt,
    };
    await foundOrder.save();

    await NotificationService.notifyPaymentSucceeded({
      userId: foundOrder.order_userId,
      accountType: "user",
      orderId: String(foundOrder._id),
      amount: foundPayment.payment_amount,
      transactionRef: foundPayment.payment_transactionRef,
    });

    return PaymentService.toPaymentResponse(foundPayment);
  }

  static async createPaymentForOrder({ orderDoc, userId, paymentInput = {} }) {
    const existingPayment = await payment.findOne({
      payment_orderId: orderDoc._id,
    });
    if (existingPayment) {
      return PaymentService.toPaymentResponse(existingPayment);
    }

    const method = PaymentService.normalizePaymentMethod(
      paymentInput.method || orderDoc.order_payment?.method,
    );
    const provider =
      method === "COD"
        ? "internal"
        : method === VNPAY_PAYMENT_METHOD
          ? "vnpay"
          : "mock_gateway";
    const status = method === "COD" ? "pending" : "requires_action";
    const transactionRef = PaymentService.buildTransactionRef(orderDoc._id);
    const checkoutUrl =
      method === "COD"
        ? ""
        : method === VNPAY_PAYMENT_METHOD
          ? buildVnpayPaymentUrl({
              amount: Number(orderDoc.order_checkout?.totalCheckout || 0),
              transactionReference: transactionRef,
              orderInformation:
                paymentInput.orderInformation ||
                `Thanh toan don hang ${String(orderDoc._id)}`,
              clientIpAddress: paymentInput.clientIpAddress || "127.0.0.1",
              bankCode: paymentInput.bankCode || "",
              locale: paymentInput.locale || "vn",
            })
          : `/api/v1/payment/orders/${orderDoc._id}/confirm?transactionRef=${transactionRef}`;

    const paymentDoc = await payment.create({
      payment_orderId: orderDoc._id,
      payment_userId: userId,
      payment_method: method,
      payment_provider: provider,
      payment_amount: Number(orderDoc.order_checkout?.totalCheckout || 0),
      payment_currency: paymentInput.currency || "VND",
      payment_status: status,
      payment_transactionRef: transactionRef,
      payment_checkoutUrl: checkoutUrl,
      payment_gatewayPayload:
        method === "COD"
          ? {}
          : method === VNPAY_PAYMENT_METHOD
            ? {
                integration: "vnpay",
              }
            : {
              kind: "mock_confirmation_required",
            },
    });

    orderDoc.order_payment = {
      ...(orderDoc.order_payment || {}),
      method,
      status,
      provider,
      transactionRef,
      paidAt: null,
    };
    await orderDoc.save();

    return PaymentService.toPaymentResponse(paymentDoc);
  }

  static async getPaymentByOrder({ orderId, userId }) {
    const foundOrder = await order.findOne({
      _id: orderId,
      order_userId: userId,
    });

    if (!foundOrder) {
      throw new NotFoundError("Order not found");
    }

    const foundPayment = await payment.findOne({
      payment_orderId: orderId,
      payment_userId: userId,
    });

    if (!foundPayment) {
      throw new NotFoundError("Payment not found");
    }

    return PaymentService.toPaymentResponse(foundPayment);
  }

  static async confirmMockPayment({ orderId, userId, transactionRef }) {
    const foundOrder = await order.findOne({
      _id: orderId,
      order_userId: userId,
    });

    if (!foundOrder) {
      throw new NotFoundError("Order not found");
    }

    const foundPayment = await payment.findOne({
      payment_orderId: orderId,
      payment_userId: userId,
    });

    if (!foundPayment) {
      throw new NotFoundError("Payment not found");
    }

    if (foundPayment.payment_method === "COD") {
      throw new BadRequestError("COD orders do not require online confirmation");
    }

    if (foundPayment.payment_method === VNPAY_PAYMENT_METHOD) {
      throw new BadRequestError("VNPay payments are confirmed by VNPay return and IPN");
    }

    if (
      transactionRef &&
      String(transactionRef) !== String(foundPayment.payment_transactionRef)
    ) {
      throw new BadRequestError("Invalid transaction reference");
    }

    return PaymentService.markPaymentAsPaid(foundPayment, foundOrder, {
      confirmedVia: "mock_endpoint",
    });
  }

  static async getVnpayReturnInformation(queryParameters = {}) {
    const verificationResult = verifyVnpayResponse(queryParameters);
    const foundPayment = verificationResult.transactionReference
      ? await payment.findOne({
          payment_transactionRef: verificationResult.transactionReference,
        })
      : null;

    return {
      ...verificationResult,
      paymentStatus: foundPayment?.payment_status || "not_found",
      orderId: foundPayment?.payment_orderId || "",
    };
  }

  static async handleVnpayIpn(queryParameters = {}) {
    const verificationResult = verifyVnpayResponse(queryParameters);

    if (!verificationResult.isValidSignature) {
      return { RspCode: "97", Message: "Invalid signature" };
    }

    const foundPayment = await payment.findOne({
      payment_transactionRef: verificationResult.transactionReference,
    });

    if (!foundPayment) {
      return { RspCode: "01", Message: "Payment not found" };
    }

    const foundOrder = await order.findById(foundPayment.payment_orderId);
    if (!foundOrder) {
      return { RspCode: "01", Message: "Order not found" };
    }

    if (Number(foundPayment.payment_amount) !== Number(verificationResult.amount)) {
      return { RspCode: "04", Message: "Invalid amount" };
    }

    if (foundPayment.payment_status === "paid") {
      return { RspCode: "02", Message: "Payment already confirmed" };
    }

    if (
      verificationResult.responseCode !== VNPAY_SUCCESS_RESPONSE_CODE ||
      verificationResult.transactionStatus !== VNPAY_SUCCESS_RESPONSE_CODE
    ) {
      foundPayment.payment_status = "failed";
      foundPayment.payment_failureReason = `VNPay response code ${verificationResult.responseCode}`;
      foundPayment.payment_gatewayPayload = {
        ...foundPayment.payment_gatewayPayload,
        vnpayIpn: verificationResult.rawData,
      };
      await foundPayment.save();

      foundOrder.order_payment = {
        ...(foundOrder.order_payment || {}),
        status: "failed",
      };
      await foundOrder.save();

      return { RspCode: "00", Message: "Payment failure recorded" };
    }

    await PaymentService.markPaymentAsPaid(foundPayment, foundOrder, {
      confirmedVia: "vnpay_ipn",
      vnpayIpn: verificationResult.rawData,
    });

    return { RspCode: "00", Message: "Confirm Success" };
  }
}

module.exports = PaymentService;
