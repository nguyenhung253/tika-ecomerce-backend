"use strict";

jest.mock("../../models/notification.model", () => ({
  notification: {
    findById: jest.fn(),
  },
}));

jest.mock("../../configs/init.mailer", () => ({
  sendMail: jest.fn(),
}));

const { notification } = require("../../models/notification.model");
const { sendMail } = require("../../configs/init.mailer");
const {
  processNotificationEmailJob,
} = require("../../workers/notification.worker");

describe("notification worker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks notification as sent when email delivery succeeds", async () => {
    const save = jest.fn();
    notification.findById.mockResolvedValueOnce({
      notification_email: {
        status: "queued",
        attempts: 0,
        sentAt: null,
        lastError: "",
      },
      save,
    });

    await processNotificationEmailJob({
      data: {
        notificationId: "notification-1",
        to: "user@example.com",
        subject: "Hello",
        text: "Body",
      },
      attemptsMade: 0,
      opts: {
        attempts: 3,
      },
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("marks notification as failed on final attempt", async () => {
    const save = jest.fn();
    notification.findById.mockResolvedValueOnce({
      notification_email: {
        status: "queued",
        attempts: 1,
        sentAt: null,
        lastError: "",
      },
      save,
    });
    sendMail.mockRejectedValueOnce(new Error("smtp failed"));

    await expect(
      processNotificationEmailJob({
        data: {
          notificationId: "notification-1",
          to: "user@example.com",
          subject: "Hello",
          text: "Body",
        },
        attemptsMade: 2,
        opts: {
          attempts: 3,
        },
      }),
    ).rejects.toThrow("smtp failed");

    expect(save).toHaveBeenCalledTimes(1);
  });
});
