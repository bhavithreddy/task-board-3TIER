require("dotenv").config();

const app = require("./app");
const { connectDB, closeDB, MONGO_URI } = require("./db");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 TaskFlow API running on http://localhost:${PORT}`);
  console.log(`📊 Metrics:      http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health:       http://localhost:${PORT}/health`);
  console.log(`🗄️  MongoDB URI:  ${MONGO_URI}\n`);
  connectDB();
});

const gracefulShutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  try {
    await closeDB();
    server.close(() => {
      console.log("HTTP server closed");
    });
  } catch (err) {
    console.error("Graceful shutdown failed:", err.message);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
