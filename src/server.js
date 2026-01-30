const app = require("./app");
const dotenv = require("dotenv");
const { checkOverload } = require("./helpers/check.connect");
dotenv.config();
const PORT = process.env.PORT || 3000;

require("./configs/init.mongodb");
checkOverload();
app.get("/", (req, res) => {
  res.status(200).send("Wellcome server");
});
const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT:${PORT} `);
});
