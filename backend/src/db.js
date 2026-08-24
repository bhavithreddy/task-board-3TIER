const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/taskflow';
const MAX_RETRIES = 10;

let retries = 0;
let retryTimer = null;

const getMongoUri = () => process.env.MONGO_URI || DEFAULT_MONGO_URI;

const redactMongoUri = (uri) => {
  try {
    const parsed = new URL(uri);
    if (parsed.username) {
      parsed.username = '***';
    }
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '[unparseable MongoDB URI]';
  }
};

const connectDB = async () => {
  const uri = getMongoUri();

  try {
    console.log(`[DB] Connecting to ${redactMongoUri(uri)} (attempt ${retries + 1})`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[DB] MongoDB connected successfully');
    retries = 0;
  } catch (err) {
    retries += 1;
    console.error(`[DB] Connection failed: ${err.message}`);
    if (retries < MAX_RETRIES) {
      const delay = Math.min(retries * 2000, 10000);
      console.log(`[DB] Retrying in ${delay / 1000}s... (${retries}/${MAX_RETRIES})`);
      retryTimer = setTimeout(connectDB, delay);
    } else {
      console.error('[DB] Max retries reached. Check MongoDB is running.');
    }
  }
};

const isDbConnected = () => mongoose.connection.readyState === 1;

const closeDB = async () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

module.exports = {
  connectDB,
  closeDB,
  isDbConnected,
  getMongoUri,
  redactMongoUri,
};
