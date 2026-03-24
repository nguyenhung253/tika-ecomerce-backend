"use strict";

const buildBullConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const parsedUrl = new URL(redisUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
    db:
      parsedUrl.pathname && parsedUrl.pathname !== "/"
        ? Number(parsedUrl.pathname.replace("/", "")) || 0
        : 0,
  };
};

module.exports = {
  buildBullConnection,
};
