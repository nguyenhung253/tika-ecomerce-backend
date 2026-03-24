"use strict";

jest.mock("../../configs/init.redis", () => ({
  getRedis: jest.fn(),
}));

jest.mock("../../configs/auth.config", () => ({
  GLOBAL_API_RATE_LIMIT_MAX_REQUESTS: 3,
  GLOBAL_API_RATE_LIMIT_WINDOW_SECONDS: 60,
}));

const { getRedis } = require("../../configs/init.redis");
const {
  globalApiRateLimit,
  loginEmailRateLimit,
} = require("../../auth/rateLimit");

const runMiddleware = (middleware, req = {}) => {
  return new Promise((resolve, reject) => {
    middleware(req, {}, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

describe("rate limit middlewares", () => {
  const redisClient = {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRedis.mockReturnValue(redisClient);
  });

  it("allows request for global limiter under threshold", async () => {
    redisClient.incr.mockResolvedValueOnce(1);

    await expect(
      runMiddleware(globalApiRateLimit, {
        headers: {
          "x-api-key": "key-1",
          "x-client-id": "client-1",
        },
        ip: "127.0.0.1",
      }),
    ).resolves.toBeUndefined();

    expect(redisClient.incr).toHaveBeenCalledTimes(1);
    expect(redisClient.expire).toHaveBeenCalledWith(
      expect.stringContaining("rate-limit:api:global"),
      60,
    );
  });

  it("blocks request for global limiter when threshold exceeded", async () => {
    redisClient.incr.mockResolvedValueOnce(4);
    redisClient.ttl.mockResolvedValueOnce(30);

    await expect(
      runMiddleware(globalApiRateLimit, {
        headers: {
          "x-api-key": "key-1",
          "x-client-id": "client-1",
        },
        ip: "127.0.0.1",
      }),
    ).rejects.toMatchObject({
      status: 429,
      errorCode: "TOO_MANY_REQUESTS_ERROR",
    });

    expect(redisClient.ttl).toHaveBeenCalledTimes(1);
  });

  it("skips login email limiter when email is missing", async () => {
    await expect(
      runMiddleware(loginEmailRateLimit, {
        body: {},
      }),
    ).resolves.toBeUndefined();

    expect(redisClient.incr).not.toHaveBeenCalled();
  });

  it("blocks login email limiter when threshold exceeded", async () => {
    redisClient.incr.mockResolvedValueOnce(6);
    redisClient.ttl.mockResolvedValueOnce(45);

    await expect(
      runMiddleware(loginEmailRateLimit, {
        body: {
          email: "user@example.com",
        },
      }),
    ).rejects.toMatchObject({
      status: 429,
      errorCode: "TOO_MANY_REQUESTS_ERROR",
    });
  });
});
