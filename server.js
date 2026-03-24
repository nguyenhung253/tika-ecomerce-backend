const dotenv = require("dotenv");
dotenv.config();
const app = require("./app");
const { checkOverload } = require("./helpers/check.connect");
const { startNotificationWorker } = require("./workers/notification.worker");
const PORT = process.env.PORT || 8386;

require("./configs/init.mongodb");
const { initRedis } = require("./configs/init.redis");

checkOverload();

// Initialize Redis
initRedis()
  .then(() => {
    startNotificationWorker();
  })
  .catch((err) => {
    console.error("Failed to initialize Redis:", err.message);
    process.exit(1);
  });

const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT:${PORT} `);
});
