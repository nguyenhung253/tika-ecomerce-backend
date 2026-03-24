"use strict";

jest.mock("../../models/payment.model", () => ({
  payment: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../models/order.model", () => ({
  order: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../services/notification.service", () => ({
  NotificationService: {
    notifyPaymentSucceeded: jest.fn(),
  },
}));

jest.mock("../../utils/vnpay", () => ({
  VNPAY_SUCCESS_RESPONSE_CODE: "00",
  buildVnpayPaymentUrl: jest.fn(() => "https://sandbox.vnpayment.vn/payment"),
  verifyVnpayResponse: jest.fn(),
}));

const PaymentService = require("../../services/payment.service");
const { payment } = require("../../models/payment.model");
const { order } = require("../../models/order.model");
const { NotificationService } = require("../../services/notification.service");
const {
  buildVnpayPaymentUrl,
} = require("../../utils/vnpay");

describe("PaymentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds requires_action snapshot for non-COD payments", () => {
    const snapshot = PaymentService.buildOrderPaymentSnapshot(
      { method: "credit_card" },
      200,
    );

    expect(snapshot).toMatchObject({
      method: "credit_card",
      status: "requires_action",
      provider: "mock_gateway",
      amount: 200,
    });
  });

  it("creates a payment record for a new order", async () => {
    payment.findOne.mockResolvedValueOnce(null);
    payment.create.mockResolvedValueOnce({
      _id: "payment-1",
      payment_orderId: "order-1",
      payment_method: "credit_card",
      payment_provider: "mock_gateway",
      payment_amount: 200,
      payment_currency: "VND",
      payment_status: "requires_action",
      payment_transactionRef: "PAY-order-1-abcd",
      payment_checkoutUrl: "/api/v1/payment/orders/order-1/confirm",
      payment_processedAt: null,
    });

    const save = jest.fn();
    const orderDoc = {
      _id: "order-1",
      order_checkout: {
        totalCheckout: 200,
      },
      order_payment: {
        method: "credit_card",
      },
      save,
    };

    const result = await PaymentService.createPaymentForOrder({
      orderDoc,
      userId: "user-1",
      paymentInput: {
        method: "credit_card",
      },
    });

    expect(payment.create).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("requires_action");
  });

  it("creates a VNPay checkout URL for VNPay payments", async () => {
    payment.findOne.mockResolvedValueOnce(null);
    payment.create.mockResolvedValueOnce({
      _id: "payment-2",
      payment_orderId: "order-2",
      payment_method: "vnpay",
      payment_provider: "vnpay",
      payment_amount: 300,
      payment_currency: "VND",
      payment_status: "requires_action",
      payment_transactionRef: "PAY-order-2-abcd",
      payment_checkoutUrl: "https://sandbox.vnpayment.vn/payment",
      payment_processedAt: null,
    });

    const save = jest.fn();
    const orderDoc = {
      _id: "order-2",
      order_checkout: {
        totalCheckout: 300,
      },
      order_payment: {
        method: "vnpay",
      },
      save,
    };

    const result = await PaymentService.createPaymentForOrder({
      orderDoc,
      userId: "user-2",
      paymentInput: {
        method: "vnpay",
        clientIpAddress: "127.0.0.1",
      },
    });

    expect(buildVnpayPaymentUrl).toHaveBeenCalledTimes(1);
    expect(result.checkoutUrl).toBe("https://sandbox.vnpayment.vn/payment");
  });

  it("confirms mock payment and emits notification", async () => {
    const saveOrder = jest.fn();
    const savePayment = jest.fn();

    order.findOne.mockResolvedValueOnce({
      _id: "order-1",
      order_userId: "user-1",
      order_payment: {
        method: "credit_card",
        status: "requires_action",
      },
      save: saveOrder,
    });
    payment.findOne.mockResolvedValueOnce({
      _id: "payment-1",
      payment_orderId: "order-1",
      payment_userId: "user-1",
      payment_method: "credit_card",
      payment_provider: "mock_gateway",
      payment_amount: 200,
      payment_currency: "VND",
      payment_status: "requires_action",
      payment_transactionRef: "PAY-order-1-abcd",
      payment_checkoutUrl: "",
      payment_gatewayPayload: {},
      save: savePayment,
    });

    const result = await PaymentService.confirmMockPayment({
      orderId: "order-1",
      userId: "user-1",
      transactionRef: "PAY-order-1-abcd",
    });

    expect(result.status).toBe("paid");
    expect(savePayment).toHaveBeenCalledTimes(1);
    expect(saveOrder).toHaveBeenCalledTimes(1);
    expect(NotificationService.notifyPaymentSucceeded).toHaveBeenCalledTimes(1);
  });
});
