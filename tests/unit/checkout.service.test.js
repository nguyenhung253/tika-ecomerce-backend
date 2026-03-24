"use strict";

jest.mock("../../models/repositories/cart.repo", () => ({
  findCartById: jest.fn(),
}));

jest.mock("../../models/repositories/product.repo", () => ({
  checkProductByServer: jest.fn(),
}));

jest.mock("../../models/order.model", () => ({
  order: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../../models/cart.model", () => ({
  cart: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../models/inventory.model", () => ({
  inventory: {
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock("../../utils/cache/cache.service", () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
}));

jest.mock("../../helpers/audit.helper", () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock("../../services/notification.service", () => ({
  NotificationService: {
    notifyOrderCreated: jest.fn(),
    notifyOrderStatusUpdated: jest.fn(),
  },
}));

const CheckoutService = require("../../services/checkout.service");
const { order } = require("../../models/order.model");
const { logAuditEvent } = require("../../helpers/audit.helper");

describe("CheckoutService.updateOrderStatusByShop", () => {
  it("denies status update if shop does not own order items", async () => {
    order.findById.mockResolvedValueOnce({
      _id: "order-1",
      order_status: "pending",
      order_products: [{ shopId: "shop-other" }],
      save: jest.fn(),
    });

    await expect(
      CheckoutService.updateOrderStatusByShop({
        orderId: "order-1",
        shopId: "shop-1",
        status: "confirmed",
      }),
    ).rejects.toThrow("You do not have permission to update this order");

    expect(logAuditEvent).toHaveBeenCalledWith(
      "checkout.shop.update_status.denied",
      expect.objectContaining({ reason: "shop_not_owner" }),
    );
  });

  it("denies invalid status transition", async () => {
    order.findById.mockResolvedValueOnce({
      _id: "order-1",
      order_status: "pending",
      order_products: [{ shopId: "shop-1" }],
      save: jest.fn(),
    });

    await expect(
      CheckoutService.updateOrderStatusByShop({
        orderId: "order-1",
        shopId: "shop-1",
        status: "delivered",
      }),
    ).rejects.toThrow("Invalid status transition from pending to delivered");
  });

  it("updates status on valid transition", async () => {
    const save = jest.fn();
    const foundOrder = {
      _id: "order-1",
      order_status: "pending",
      order_products: [{ shopId: "shop-1" }],
      save,
    };
    order.findById.mockResolvedValueOnce(foundOrder);

    const result = await CheckoutService.updateOrderStatusByShop({
      orderId: "order-1",
      shopId: "shop-1",
      status: "confirmed",
    });

    expect(result.order_status).toBe("confirmed");
    expect(save).toHaveBeenCalledTimes(1);
  });
});
