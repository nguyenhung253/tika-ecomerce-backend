"use strict";

const { Queue } = require("bullmq");
const { buildBullConnection } = require("../configs/queue.config");

const NOTIFICATION_QUEUE_NAME = "notification-email";

let notificationQueue = null;

const getNotificationQueue = () => {
  if (!notificationQueue) {
    notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: buildBullConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }

  return notificationQueue;
};

const addNotificationEmailJob = async (jobPayload) => {
  const queue = getNotificationQueue();
  return queue.add("send-email", jobPayload);
};

module.exports = {
  NOTIFICATION_QUEUE_NAME,
  getNotificationQueue,
  addNotificationEmailJob,
};
