"use strict";

const mongoose = require("mongoose");
const os = require("os");
const process = require("process");

// Đếm số lượng connections
const countConnect = () => {
  const numConnect = mongoose.connections.length;
  console.log(`Number of connections: ${numConnect}`);
  return numConnect;
};

// Kiểm tra quá tải hệ thống
const checkOverload = () => {
  setInterval(() => {
    const numConnection = mongoose.connections.length;
    const numCores = os.cpus().length;
    const memoryUsage = process.memoryUsage().rss;

    // Giả sử mỗi core chịu được tối đa 5 connections
    const maxConnections = numCores * 5;

    if (numConnection > maxConnections) {
      console.log(` Connection overload detected!`);
      console.log(`Active connections: ${numConnection}/${maxConnections}`);
      console.log(`Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    }
  }, 5000); // Monitor mỗi 5 giây
};

module.exports = {
  countConnect,
  checkOverload,
};
