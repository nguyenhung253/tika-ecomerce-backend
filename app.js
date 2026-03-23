const express = require("express");
const cors = require("cors");
const app = express();
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");

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
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
