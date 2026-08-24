require('dotenv').config();

const app = require('./app');
const { connectDB, closeDB, getMongoUri, redactMongoUri } = require('./db');

const PORT = Number.parseInt(process.env.PORT, 10) || 5000;
const SHUTDOWN_TIMEOUT_MS = 10000;

const server = app.listen(PORT, () => {
  console.log(`TaskFlow API running on http://localhost:${PORT}`);
  console.log(`Metrics: http://localhost:${PORT}/metrics`);
  console.log(`Health:  http://localhost:${PORT}/health`);
  console.log(`Ready:   http://localhost:${PORT}/ready`);
  console.log(`MongoDB: ${redactMongoUri(getMongoUri())}`);
  connectDB();
});

const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(async () => {
    try {
      await closeDB();
      console.log('HTTP server and database connections closed');
      process.exit(0);
    } catch (err) {
      console.error('Graceful shutdown failed:', err.message);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
