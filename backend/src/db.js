const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/taskflow";
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
    retries += 1;
    console.error(`[DB] ❌ Connection failed: ${err.message}`);
    if (retries < MAX_RETRIES) {
      const delay = Math.min(retries * 2000, 10000);
      console.log(`[DB] Retrying in ${delay / 1000}s... (${retries}/${MAX_RETRIES})`);
      setTimeout(connectDB, delay);
    } else {
      console.error("[DB] Max retries reached. Check MongoDB is running.");
    }
  }
};

const isDbConnected = () => mongoose.connection.readyState === 1;

const closeDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
};

module.exports = {
  connectDB,
  closeDB,
  isDbConnected,
  MONGO_URI,
};
