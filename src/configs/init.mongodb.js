const mongoose = require("mongoose");
require("dotenv").config();

const connectString = process.env.MONGODB_URL;

class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    Database.instance = this;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  connect() {
    // Check if connection string exists
    if (!connectString) {
      console.error(" MONGODB_URL is not defined in .env file");
      process.exit(1);
    }

    // Enable debug mode in development
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", { color: true });
    }

    mongoose.set("strictQuery", true);

    mongoose
      .connect(connectString)
      .then(() => {
        console.log(" MongoDB connected successfully");
      })
      .catch((err) => {
        console.error("MongoDB connection error:");
        console.error(err.message);
        process.exit(1);
      });

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log(" Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error(" Mongoose connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.log(" Mongoose disconnected from MongoDB");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log(" MongoDB connection closed due to app termination");
      process.exit(0);
    });
  }
}

const instanceMongodb = Database.getInstance();
instanceMongodb.connect();

module.exports = instanceMongodb;
