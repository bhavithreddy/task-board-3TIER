// ================================================================
// Task Routes — CRUD for /api/tasks
// FIX: Added DB connection check before every query
//      Returns 503 (not 500) when DB is connecting
// ================================================================

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Task = require("../models/task");

// Helper: check DB is connected before running queries
const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "Database is connecting, please retry in a moment",
    });
  }
  next();
};

// Helper: update activeTasksGauge
async function updateGauge(app) {
  try {
    const count = await Task.countDocuments({ status: { $ne: "done" } });
    if (app?.locals?.activeTasksGauge) {
      app.locals.activeTasksGauge.set(count);
    }
  } catch (_) {}
}

// ── GET /api/tasks ────────────────────────────────────────────
router.get("/", checkDB, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    console.error("GET /api/tasks error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch tasks" });
  }
});

// ── POST /api/tasks ───────────────────────────────────────────
router.post("/", checkDB, async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "Title is required" });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || "",
      priority: priority || "medium",
    });

    await updateGauge(req.app);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("POST /api/tasks error:", err.message);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: "Failed to create task" });
  }
});

// ── PUT /api/tasks/:id ────────────────────────────────────────
router.put("/:id", checkDB, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    await updateGauge(req.app);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error("PUT /api/tasks/:id error:", err.message);
    res.status(500).json({ success: false, error: "Failed to update task" });
  }
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────
router.delete("/:id", checkDB, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    await updateGauge(req.app);
    res.json({ success: true, message: "Task deleted", data: task });
  } catch (err) {
    console.error("DELETE /api/tasks/:id error:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete task" });
  }
});

module.exports = router;
