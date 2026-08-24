const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { metricsMiddleware, register, activeTasksGauge } = require('./metrics');
const taskRoutes = require('./routes/tasks');
const { isDbConnected } = require('./db');

const app = express();
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

app.locals.activeTasksGauge = activeTasksGauge;
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin denied: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '10kb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    database: isDbConnected() ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  if (isDbConnected()) {
    return res.status(200).json({ success: true, status: 'ready' });
  }
  res.status(503).json({
    success: false,
    status: 'not ready',
    error: 'Database is not connected yet',
  });
});

app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    console.error('GET /metrics error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to get metrics' });
  }
});

app.use('/api/tasks', taskRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'TaskFlow API is running', version: '1.0.0' });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  if (err.message && err.message.startsWith('CORS origin denied')) {
    return res.status(403).json({ success: false, error: 'Origin not allowed' });
  }

  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = app;
