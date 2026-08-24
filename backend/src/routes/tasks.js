const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/task');

const ALLOWED_TASK_UPDATE_FIELDS = ['title', 'description', 'status', 'priority'];
const ALLOWED_STATUSES = ['todo', 'in-progress', 'done'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const isValidObjectId = (id) => OBJECT_ID_PATTERN.test(id) && mongoose.Types.ObjectId.isValid(id);

const checkDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database is connecting, please retry in a moment',
    });
  }
  next();
};

async function updateGauge(app) {
  try {
    const count = await Task.countDocuments({ status: { $ne: 'done' } });
    if (app?.locals?.activeTasksGauge) {
      app.locals.activeTasksGauge.set(count);
    }
  } catch (err) {
    console.error('updateGauge failed:', err.message);
  }
}

router.get('/', checkDB, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!ALLOWED_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ success: false, error: 'Invalid status filter' });
      }
      filter.status = req.query.status;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    console.error('GET /api/tasks error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

router.post('/', checkDB, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const priority = req.body.priority || 'medium';

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    if (title.length > 200) {
      return res.status(400).json({ success: false, error: 'Title too long' });
    }

    if (description.length > 2000) {
      return res.status(400).json({ success: false, error: 'Description too long' });
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority' });
    }

    const task = await Task.create({
      title,
      description,
      priority,
    });

    await updateGauge(req.app);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error('POST /api/tasks error:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

router.put('/:id', checkDB, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid task ID' });
  }

  try {
    const updates = {};
    ALLOWED_TASK_UPDATE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] =
          field === 'title' || field === 'description'
            ? typeof req.body[field] === 'string'
              ? req.body[field].trim()
              : req.body[field]
            : req.body[field];
      }
    });

    if (updates.title !== undefined && !String(updates.title).trim()) {
      return res.status(400).json({ success: false, error: 'Title cannot be empty' });
    }

    if (updates.status !== undefined && !ALLOWED_STATUSES.includes(updates.status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    if (updates.priority !== undefined && !ALLOWED_PRIORITIES.includes(updates.priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await updateGauge(req.app);
    res.json({ success: true, data: task });
  } catch (err) {
    console.error('PUT /api/tasks/:id error:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

router.delete('/:id', checkDB, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid task ID' });
  }

  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await updateGauge(req.app);
    res.json({ success: true, message: 'Task deleted', data: task });
  } catch (err) {
    console.error('DELETE /api/tasks/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = router;
