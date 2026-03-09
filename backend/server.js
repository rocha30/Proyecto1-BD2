const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { createApp } = require("./src/app");
const { connectToDatabase, closeDatabase } = require("./src/db");

const port = Number.parseInt(process.env.PORT, 10) || 3000;

async function startServer() {
  await connectToDatabase();

  const app = createApp();
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Unable to start server:", error);
  process.exit(1);
});
