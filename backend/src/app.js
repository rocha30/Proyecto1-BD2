const express = require("express");
const cors = require("cors");
const { MongoServerError } = require("mongodb");

const usersRouter = require("./routes/users");
const restaurantsRouter = require("./routes/restaurants");
const ordersRouter = require("./routes/orders");
const reviewsRouter = require("./routes/reviews");
const analyticsRouter = require("./routes/analytics");

function createApp() {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : "*";

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use("/api/users", usersRouter);
  app.use("/api/restaurants", restaurantsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/analytics", analyticsRouter);

  app.use((error, _req, res, _next) => {
    if (error instanceof MongoServerError && error.code === 11000) {
      return res.status(409).json({
        error: "Duplicate key error",
        details: error.keyValue
      });
    }

    const status = error.status || 500;
    const message = error.message || "Internal server error";
    if (status >= 500) {
      console.error(error);
    }

    return res.status(status).json({
      error: message
    });
  });

  return app;
}

module.exports = {
  createApp
};
