"use strict";

const redis = require("redis");
require("dotenv").config();

const statusConnectRedis = {
  CONNECT: "connect",
  END: "end",
  RECONNECT: "reconnecting",
  ERROR: "error",
};

let client = null;

const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    client = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("Max Redis reconnection attempts reached");
            return new Error("Max retries exceeded");
          }
          return retries * 100;
        },
      },
    });

    // Event listeners
    client.on(statusConnectRedis.CONNECT, () => {
      console.log(" Redis connected successfully");
    });

    client.on(statusConnectRedis.RECONNECT, () => {
      console.log(" Redis reconnecting...");
    });

    client.on(statusConnectRedis.ERROR, (err) => {
      console.error(" Redis error:", err.message);
    });

    client.on(statusConnectRedis.END, () => {
      console.log(" Redis connection closed");
    });

    // Connect to Redis
    await client.connect();
    console.log(" Redis client connected");

    return client;
  } catch (error) {
    console.error("Redis initialization error:", error.message);
    process.exit(1);
  }
};

const getRedis = () => {
  if (!client) {
    throw new Error("Redis client not initialized. Call initRedis() first.");
  }
  return client;
};

const closeRedis = async () => {
  if (client) {
    await client.quit();
    console.log(" Redis connection closed");
  }
};

module.exports = {
  initRedis,
  getRedis,
  closeRedis,
};
