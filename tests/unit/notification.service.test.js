"use strict";

jest.mock("../../models/notification.model", () => ({
  notification: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../../models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../models/shop.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../queues/notification.queue", () => ({
  addNotificationEmailJob: jest.fn(),
}));

const { notification } = require("../../models/notification.model");
const User = require("../../models/user.model");
const {
  addNotificationEmailJob,
} = require("../../queues/notification.queue");
const { NotificationService } = require("../../services/notification.service");

describe("NotificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates notification and queues email job", async () => {
    User.findById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({
        email: "user@example.com",
        name: "User",
      }),
    });
    notification.create.mockResolvedValueOnce({
      _id: "notification-1",
    });

    await NotificationService.createNotification({
      userId: "user-1",
      type: "order.created",
      title: "Order created",
      message: "Your order is created",
    });

    expect(notification.create).toHaveBeenCalledTimes(1);
    expect(addNotificationEmailJob).toHaveBeenCalledTimes(1);
  });
});
