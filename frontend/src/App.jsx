import { useState, useEffect, useCallback, useMemo } from 'react';
import api from './api';
import TaskCard from './TaskCard';
import { getErrorMessage } from './utils';
import { TASK_FILTERS, DEFAULT_FORM_STATE } from './constants';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(DEFAULT_FORM_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [dbStatus, setDbStatus] = useState('unknown');

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
      setDbStatus('connected');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch tasks'));
      setTasks([]);
      setDbStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(fetchTasks, 5000);
    return () => clearTimeout(timer);
  }, [error, fetchTasks]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/tasks', form);
      setTasks((prev) => [res.data.data, ...prev]);
      setForm(DEFAULT_FORM_STATE);
      setError(null);
      setDbStatus('connected');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create task'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((task) => task._id !== id));
  };

  const handleStatusChange = async (id, newStatus) => {
    const res = await api.put(`/tasks/${id}`, { status: newStatus });
    setTasks((prev) => prev.map((task) => (task._id === id ? res.data.data : task)));
  };

  const displayedTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks],
  );

  const stats = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === 'todo').length,
      inProgress: tasks.filter((task) => task.status === 'in-progress').length,
      done: tasks.filter((task) => task.status === 'done').length,
    }),
    [tasks],
  );

  const dbLabel = dbStatus === 'connected' ? 'DB Connected' : 'Connecting…';

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          Task<span>Flow</span>
        </div>
        <div className="header-right">
          <span className={`db-indicator db-${dbStatus}`}>
            <span className="db-dot" />
            {dbLabel}
          </span>
          <span className="k8s-badge">3-TIER</span>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">
              ⚠
            </span>
            <div>
              <strong>{error}</strong>
              <div className="error-hint">Auto-retrying in 5s…</div>
            </div>
          </div>
        )}

        <div className="stats-grid">
          {[
            { label: 'Total', value: stats.total, cls: 'stat-total' },
            { label: 'To Do', value: stats.todo, cls: 'stat-todo' },
            { label: 'In Progress', value: stats.inProgress, cls: 'stat-inprog' },
            { label: 'Done', value: stats.done, cls: 'stat-done' },
          ].map((stat) => (
            <div key={stat.label} className={`stat-card ${stat.cls}`}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="form-card">
          <div className="form-heading">▸ NEW TASK</div>
          <form onSubmit={handleCreate}>
            <label className="field-label" htmlFor="task-title">
              Title
            </label>
            <input
              id="task-title"
              className="input"
              type="text"
              name="title"
              maxLength={200}
              placeholder="Task title…"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
            <label className="field-label" htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              className="textarea"
              name="description"
              maxLength={2000}
              placeholder="Description (optional)…"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
            />
            <div className="form-row">
              <label className="field-label sr-only" htmlFor="task-priority">
                Priority
              </label>
              <select
                id="task-priority"
                className="select"
                name="priority"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
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
                {submitting ? 'Adding…' : '▸ ADD TASK'}
              </button>
            </div>
          </form>
        </div>

        <div className="filter-bar" role="group" aria-label="Filter tasks">
          <span className="filter-label">FILTER:</span>
          {TASK_FILTERS.map((filterOption) => (
            <button
              key={filterOption.id}
              type="button"
              className={`filter-btn ${filter === filterOption.id ? 'active' : ''}`}
              onClick={() => setFilter(filterOption.id)}
              aria-pressed={filter === filterOption.id}
            >
              {filterOption.label}
            </button>
          ))}
          <span className="task-count">{displayedTasks.length} tasks</span>
        </div>

        {loading ? (
          <div className="loading" role="status">
            <div className="spinner" aria-hidden="true" />
            <span>Loading tasks…</span>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="empty">
            <div className="empty-icon" aria-hidden="true">
              ◻
            </div>
            <div className="empty-title">No tasks found</div>
            <div className="empty-sub">
              {error ? 'Check backend connection above' : 'Create your first task above'}
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
