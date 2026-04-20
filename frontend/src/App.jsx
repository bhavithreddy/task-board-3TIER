// ================================================================
// TaskFlow Frontend — React App
//
// API URL strategy (in priority order):
//   1. Local dev  → Vite proxies /api → http://localhost:5000
//      (configured in vite.config.js proxy section)
//   2. Docker/K8s → NGINX proxies /api → http://backend:5000
//      (configured in nginx.conf via BACKEND_HOST env var)
//
// In both cases the frontend calls /api/tasks — no hardcoded
// host/port needed. Everything is transparent via the proxy.
// ================================================================

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// Always use /api as the base — the proxy handles routing
const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Status progression cycle
const STATUS_NEXT = { todo: "in-progress", "in-progress": "done", done: "todo" };
const STATUS_LABEL = { todo: "TODO", "in-progress": "IN PROG", done: "DONE" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── TaskCard ─────────────────────────────────────────────────
function TaskCard({ task, onDelete, onStatusChange }) {
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(task._id);
    setDeleting(false);
  };

  const handleStatus = async () => {
    setUpdating(true);
    await onStatusChange(task._id, STATUS_NEXT[task.status]);
    setUpdating(false);
  };

  return (
    <div className={`task-card status-${task.status}`}>
      <div className="task-left">
        <button
          className={`status-dot dot-${task.status}`}
          onClick={handleStatus}
          disabled={updating}
          title="Click to advance status"
        >
          {updating ? "…" : ""}
        </button>
      </div>

      <div className="task-body">
        <div className={`task-title ${task.status === "done" ? "done" : ""}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="task-desc">{task.description}</div>
        )}
        <div className="task-meta">
          <span className={`badge badge-status badge-${task.status}`}>
            {STATUS_LABEL[task.status]}
          </span>
          <span className={`badge badge-priority badge-p-${task.priority}`}>
            {task.priority}
          </span>
          <span className="task-date">{formatDate(task.createdAt)}</span>
        </div>
      </div>

      <div className="task-actions">
        <button
          className="btn-cycle"
          onClick={handleStatus}
          disabled={updating}
          title={`Move to ${STATUS_LABEL[STATUS_NEXT[task.status]]}`}
        >
          {updating ? "…" : `→ ${STATUS_LABEL[STATUS_NEXT[task.status]]}`}
        </button>
        <button
          className="btn-delete"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" });
  const [submitting, setSubmitting] = useState(false);
  const [dbStatus, setDbStatus] = useState("unknown");

  // ── Check backend health ────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res = await api.get("/tasks").catch(() => null);
      if (res) setDbStatus("connected");
    } catch (_) {
      setDbStatus("connecting");
    }
  }, []);

  // ── Fetch tasks ─────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const params = filter !== "all" ? { status: filter } : {};
      const res = await api.get("/tasks", { params });
      setTasks(res.data.data || []);
      setDbStatus("connected");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.code === "ECONNABORTED"
          ? "Request timed out — is the backend running?"
          : err.message === "Network Error"
          ? "Cannot reach backend. Start the backend server (npm start in /backend)"
          : "Failed to fetch tasks");
      setError(msg);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  // Auto-retry every 5s if there's an error (for when backend starts late)
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(fetchTasks, 5000);
    return () => clearTimeout(t);
  }, [error, fetchTasks]);

  // ── Create task ─────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post("/tasks", form);
      setTasks((prev) => [res.data.data, ...prev]);
      setForm({ title: "", description: "", priority: "medium" });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete task ─────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete task");
    }
  };

  // ── Update status ───────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await api.put(`/tasks/${id}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data.data : t)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update task");
    }
  };

  // Filter for display
  const displayedTasks =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  // Stats (always from full list)
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inprog: tasks.filter((t) => t.status === "in-progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="app">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="header">
        <div className="logo">
          Task<span>Flow</span>
        </div>
        <div className="header-right">
          <span className={`db-indicator db-${dbStatus}`}>
            <span className="db-dot" />
            {dbStatus === "connected" ? "DB Connected" : "Connecting…"}
          </span>
          <span className="k8s-badge">K8S EDITION</span>
        </div>
      </header>

      <main className="container">
        {/* ── ERROR BANNER ──────────────────────────────────── */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <div>
              <strong>{error}</strong>
              <div className="error-hint">Auto-retrying in 5s…</div>
            </div>
          </div>
        )}

        {/* ── STATS ─────────────────────────────────────────── */}
        <div className="stats-grid">
          {[
            { label: "Total", value: stats.total, cls: "stat-total" },
            { label: "To Do", value: stats.todo, cls: "stat-todo" },
            { label: "In Progress", value: stats.inprog, cls: "stat-inprog" },
            { label: "Done", value: stats.done, cls: "stat-done" },
          ].map((s) => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── CREATE FORM ───────────────────────────────────── */}
        <div className="form-card">
          <div className="form-heading">▸ NEW TASK</div>
          <form onSubmit={handleCreate}>
            <input
              className="input"
              type="text"
              placeholder="Task title…"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="textarea"
              placeholder="Description (optional)…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <div className="form-row">
              <select
                className="select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button
                className="btn-primary"
                type="submit"
                disabled={submitting || !form.title.trim()}
              >
                {submitting ? "Adding…" : "▸ ADD TASK"}
              </button>
            </div>
          </form>
        </div>

        {/* ── FILTER BAR ────────────────────────────────────── */}
        <div className="filter-bar">
          <span className="filter-label">FILTER:</span>
          {["all", "todo", "in-progress", "done"].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "ALL" : STATUS_LABEL[f] || f.toUpperCase()}
            </button>
          ))}
          <span className="task-count">{displayedTasks.length} tasks</span>
        </div>

        {/* ── TASK LIST ─────────────────────────────────────── */}
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Loading tasks…</span>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">◻</div>
            <div className="empty-title">No tasks found</div>
            <div className="empty-sub">
              {error ? "Check backend connection above" : "Create your first task above"}
            </div>
          </div>
        ) : (
          <div className="task-list">
            {displayedTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
