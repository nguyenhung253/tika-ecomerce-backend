"use strict";

jest.mock("../../models/user.model", () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../models/shop.model", () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("../../utils/authToken", () => ({
  generateAccessToken: jest.fn(() => "access-token"),
  generateRefreshToken: jest.fn(() => "refresh-token"),
}));

jest.mock("../../services/token.service", () => ({
  saveRefreshToken: jest.fn(),
  blacklistToken: jest.fn(),
  blacklistAllUserTokens: jest.fn(),
}));

jest.mock("../../utils/tokenExpiry", () => ({
  parseTokenExpiry: jest.fn(() => new Date("2026-01-01T00:00:00.000Z")),
}));

jest.mock("../../utils/cache/cache.service", () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
}));

jest.mock("../../configs/init.mailer", () => ({
  sendOTP: jest.fn(),
}));

jest.mock("../../helpers/audit.helper", () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock("../../utils/httpClient", () => ({
  sendHttpRequest: jest.fn(),
}));

const AccessService = require("../../services/access.service");
const User = require("../../models/user.model");
const bcrypt = require("bcrypt");
const TokenService = require("../../services/token.service");
const { getCache, setCache } = require("../../utils/cache/cache.service");
const { logAuditEvent } = require("../../helpers/audit.helper");

describe("AccessService.login", () => {
  it("throws when login is blocked", async () => {
    getCache.mockResolvedValueOnce({ blocked: true });

    await expect(
      AccessService.login({
        email: "user@example.com",
        password: "password",
      }),
    ).rejects.toThrow("Too many failed login attempts");

    expect(logAuditEvent).toHaveBeenCalledWith(
      "auth.login.blocked",
      expect.objectContaining({ email: "user@example.com" }),
    );
  });

  it("increments fail counter when password mismatches", async () => {
    getCache.mockResolvedValueOnce(null);
    User.findOne.mockResolvedValueOnce({
      _id: "u1",
      email: "user@example.com",
      role: "customer",
      password: "hashed-password",
      name: "User",
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(
      AccessService.login({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Email or password incorrect");

    expect(setCache).toHaveBeenCalled();
    expect(logAuditEvent).toHaveBeenCalledWith(
      "auth.login.failed",
      expect.objectContaining({ reason: "password_mismatch" }),
    );
  });

  it("returns tokens on successful login", async () => {
    getCache.mockResolvedValueOnce(null);
    User.findOne.mockResolvedValueOnce({
      _id: "u1",
      email: "user@example.com",
      role: "customer",
      password: "hashed-password",
      name: "User",
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await AccessService.login({
      email: "user@example.com",
      password: "correct-password",
    });

    expect(result.tokens.accessToken).toBe("access-token");
    expect(result.tokens.refreshToken).toBe("refresh-token");
    expect(TokenService.saveRefreshToken).toHaveBeenCalledTimes(1);
    expect(logAuditEvent).toHaveBeenCalledWith(
      "auth.login.success",
      expect.objectContaining({ userId: "u1", accountType: "user" }),
    );
  });
});

describe("AccessService Google OAuth", () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      GOOGLE_OAUTH_CLIENT_ID: "google-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "google-client-secret",
      GOOGLE_OAUTH_REDIRECT_URI:
        "http://localhost:4953/api/v1/auth/google/callback",
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it("generates a Google authorization URL and stores state in cache", async () => {
    const result = await AccessService.getGoogleAuthorizationUrl();

    expect(result.authorizationUrl).toContain("accounts.google.com");
    expect(result.authorizationUrl).toContain("client_id=google-client-id");
    expect(setCache).toHaveBeenCalledTimes(1);
    expect(result.state).toBeTruthy();
  });
});
