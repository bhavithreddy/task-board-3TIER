const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { metricsMiddleware, register, activeTasksGauge } = require("./metrics");
const taskRoutes = require("./routes/tasks");
const { isDbConnected } = require("./db");

const app = express();
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];

app.locals.activeTasksGauge = activeTasksGauge;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin denied: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(metricsMiddleware);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: isDbConnected() ? "connected" : "connecting...",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  if (isDbConnected()) {
    return res.status(200).json({ status: "ready" });
  }
  res.status(503).json({ status: "not ready", reason: "DB not connected yet" });
});

app.get("/metrics", async (req, res) => {
  try {
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    console.error("GET /metrics error:", err.message);
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.json({ message: "TaskFlow API is running", version: "1.0.0" });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
