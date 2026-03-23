const app = require("./app");
const dotenv = require("dotenv");
const { checkOverload } = require("./helpers/check.connect");
dotenv.config();
const PORT = process.env.PORT || 8386;

require("./configs/init.mongodb");
const { initRedis } = require("./configs/init.redis");

checkOverload();

// Initialize Redis
initRedis().catch((err) => {
  console.error("Failed to initialize Redis:", err.message);
  process.exit(1);
});

app.get("/", (req, res) => {
  res.status(200).send("Wellcome server");
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT:${PORT} `);
});
