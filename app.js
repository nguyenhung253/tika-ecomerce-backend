const express = require("express");
const cors = require("cors");
const app = express();
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./docs/swagger/openapi");

// CORS configuration
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:3000",
//       "https://tikashop.qzz.io",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: [
//       "Content-Type",
//       "Authorization",
//       "x-api-key",
//       "x-client-id",
//       "x-rtoken-id",
//     ],
//   }),
// );

// Logging mọi request gửi đến server
app.use(morgan("dev"));

// Thiết lập các HTTP security headers để bảo vệ
app.use(helmet());

// Nén response trước khi gửi về client để tăng tốc độ tải trang
app.use(compression());

// Parse JSON body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
require("./configs/init.mongodb");

// API documentation
app.get("/api-docs.json", (req, res) => {
  res.status(200).json(openapiSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    explorer: true,
    customSiteTitle: "Ecommerce Backend API Docs",
  }),
);

// Health check endpoints (for Docker/orchestration)
app.get("/health", async (req, res) => {
  try {
    // Check database connectivity
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: "unhealthy",
        message: "Database not connected",
        timestamp: new Date().toISOString(),
      });
    }

    // Check Redis connectivity
    const redisClient = require("./utils/index").getRedisClient?.();
    if (redisClient) {
      const pingResult = await redisClient.ping();
      if (pingResult !== "PONG") {
        return res.status(503).json({
          status: "unhealthy",
          message: "Redis not responding",
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness probe (simple version for quick checks)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Ecommerce Backend API",
    version: "1.0.0",
  });
});

// Routes
app.use("/api/v1", require("./routes"));

// Error handling

// Catch error route không tồn tại
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    code: statusCode,
    errorCode: err.errorCode || "INTERNAL_SERVER_ERROR",
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
