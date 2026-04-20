// ================================================================
// TaskFlow Backend — Express API
// FIX LOG:
//   - CORS now allows ALL origins (fixes browser fetch errors)
//   - MongoDB retries with backoff (no crash on first connect fail)
//   - Routes mounted at /api/tasks with proper error handling
//   - /health always responds (even if DB is down)
//   - Prometheus metrics on /metrics
// ================================================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const client = require("prom-client");

const taskRoutes = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/taskflow";

// ── Prometheus setup ─────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const activeTasksGauge = new client.Gauge({
  name: "taskflow_active_tasks_total",
  help: "Number of active (non-done) tasks",
  registers: [register],
});

app.locals.activeTasksGauge = activeTasksGauge;

// ── Middleware ───────────────────────────────────────────────
// FIX: Allow ALL origins so browser can talk to backend
// whether running locally on port 3000 or via K8s Ingress
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Track metrics for every request
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
  });
  next();
});

// ── Health & Metrics Routes ───────────────────────────────────
// FIX: /health always returns 200 even if DB is down
// so K8s liveness probe doesn't restart the pod unnecessarily
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "connecting...",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe: only 200 when DB is connected
app.get("/ready", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ status: "ready" });
  }
  res.status(503).json({ status: "not ready", reason: "DB not connected yet" });
});

// Prometheus scrape endpoint
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ── API Routes ────────────────────────────────────────────────
// FIX: Tasks router mounted at /api/tasks
app.use("/api/tasks", taskRoutes);

// Root route — confirms API is live
app.get("/", (req, res) => {
  res.json({ message: "TaskFlow API is running", version: "1.0.0" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── MongoDB Connection with Retry ────────────────────────────
// FIX: Retry loop so the server doesn't crash if Mongo isn't
// ready yet (common in Docker Compose where both start together)
let retries = 0;
const MAX_RETRIES = 10;

const connectDB = async () => {
  try {
    console.log(`[DB] Connecting to: ${MONGO_URI} (attempt ${retries + 1})`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("[DB] ✅ MongoDB connected successfully");
    retries = 0;
  } catch (err) {
    retries++;
    console.error(`[DB] ❌ Connection failed: ${err.message}`);
    if (retries < MAX_RETRIES) {
      const delay = Math.min(retries * 2000, 10000); // back-off up to 10s
      console.log(`[DB] Retrying in ${delay / 1000}s... (${retries}/${MAX_RETRIES})`);
      setTimeout(connectDB, delay);
    } else {
      console.error("[DB] Max retries reached. Check MongoDB is running.");
    }
  }
};

// ── Start Server ─────────────────────────────────────────────
// FIX: Start HTTP server FIRST, then connect to DB.
// This way the /health endpoint responds immediately.
app.listen(PORT, () => {
  console.log(`\n🚀 TaskFlow API running on http://localhost:${PORT}`);
  console.log(`📊 Metrics:      http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health:       http://localhost:${PORT}/health`);
  console.log(`🗄️  MongoDB URI:  ${MONGO_URI}\n`);
  connectDB();
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});
