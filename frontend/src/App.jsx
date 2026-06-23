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

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "./api";
import TaskCard from "./TaskCard";
import { getErrorMessage } from "./utils";
import { TASK_FILTERS, DEFAULT_FORM_STATE } from "./constants";

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" });
  const [submitting, setSubmitting] = useState(false);
  const [dbStatus, setDbStatus] = useState("unknown");

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
      setForm(DEFAULT_FORM_STATE);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create task"));
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
      setError(getErrorMessage(err, "Failed to delete task"));
    }
  };

  // ── Update status ───────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await api.put(`/tasks/${id}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data.data : t)));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update task"));
    }
  };

  // Filter for display
  const displayedTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [filter, tasks]
  );

  // Stats (always from full list)
  const stats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks]
  );

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
            { label: "In Progress", value: stats.inProgress, cls: "stat-inprog" },
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
          {TASK_FILTERS.map((filterOption) => (
            <button
              key={filterOption.id}
              className={`filter-btn ${filter === filterOption.id ? "active" : ""}`}
              onClick={() => setFilter(filterOption.id)}
            >
              {filterOption.label}
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
