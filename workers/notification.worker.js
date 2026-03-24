"use strict";

const { Worker } = require("bullmq");
const { notification } = require("../models/notification.model");
const { sendMail } = require("../configs/init.mailer");
const { buildBullConnection } = require("../configs/queue.config");
const { NOTIFICATION_QUEUE_NAME } = require("../queues/notification.queue");

let notificationWorker = null;

const processNotificationEmailJob = async (job) => {
  const foundNotification = await notification.findById(job.data.notificationId);
  if (!foundNotification) {
    return null;
  }

  const attemptNumber = Number(job.attemptsMade || 0) + 1;

  try {
    await sendMail({
      to: job.data.to,
      subject: job.data.subject,
      text: job.data.text,
    });

    foundNotification.notification_email.status = "sent";
    foundNotification.notification_email.attempts = attemptNumber;
    foundNotification.notification_email.sentAt = new Date();
    foundNotification.notification_email.lastError = "";
    await foundNotification.save();

    return foundNotification;
  } catch (error) {
    foundNotification.notification_email.attempts = attemptNumber;
    foundNotification.notification_email.lastError = error.message || "unknown";
    foundNotification.notification_email.status =
      attemptNumber >= Number(job.opts.attempts || 1) ? "failed" : "queued";
    await foundNotification.save();

    throw error;
  }
};

const startNotificationWorker = () => {
  if (
    notificationWorker ||
    process.env.NOTIFICATION_WORKER_ENABLED === "false"
  ) {
    return notificationWorker;
  }

  notificationWorker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    processNotificationEmailJob,
    {
      connection: buildBullConnection(),
      concurrency: 5,
    },
  );

  notificationWorker.on("failed", (job, error) => {
    console.error(
      "Notification worker job failed:",
      job?.id,
      error?.message || "unknown error",
    );
  });

  notificationWorker.on("error", (error) => {
    console.error("Notification worker error:", error.message);
  });

  return notificationWorker;
};

module.exports = {
  startNotificationWorker,
  processNotificationEmailJob,
};
