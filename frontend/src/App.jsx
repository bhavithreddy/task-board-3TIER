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

  const progress = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
  const dbLabel = dbStatus === 'connected' ? 'DB Connected' : 'Connecting…';

  return (
    <div className="app">
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <span className="brand-text">
            Task<span>Flow</span>
          </span>
        </a>

        <nav className="nav" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#board">Board</a>
          <a href="#about">About</a>
        </nav>

        <div className="topbar-right">
          <span className={`db-indicator db-${dbStatus}`}>
            <span className="db-dot" />
            {dbLabel}
          </span>
          <a className="btn-nav" href="#board">
            Open board
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Colorful productivity · 3-tier stack</p>
            <h1>
              Plan boldly.
              <span className="hero-accent"> Ship joyfully.</span>
            </h1>
            <p className="hero-lead">
              TaskFlow turns scattered to-dos into a bright, focused board — create tasks, move them
              through progress, and celebrate what gets done.
            </p>
            <div className="hero-actions">
              <a className="btn-primary" href="#board">
                Start organizing
              </a>
              <a className="btn-ghost" href="#features">
                See how it works
              </a>
            </div>
            <div className="hero-pills" aria-hidden="true">
              <span>React UI</span>
              <span>Express API</span>
              <span>MongoDB</span>
            </div>
          </div>

          <div className="hero-panel" aria-hidden="true">
            <div className="preview-card">
              <div className="preview-header">
                <span className="preview-dot coral" />
                <span className="preview-dot amber" />
                <span className="preview-dot mint" />
                <strong>Today&apos;s focus</strong>
              </div>
              <div className="preview-row">
                <span className="chip chip-blue">To Do</span>
                <span>Sketch landing hero</span>
              </div>
              <div className="preview-row">
                <span className="chip chip-amber">In Progress</span>
                <span>Polish task cards</span>
              </div>
              <div className="preview-row">
                <span className="chip chip-mint">Done</span>
                <span>Wire API proxy</span>
              </div>
              <div className="preview-meter">
                <div
                  className="preview-meter-fill"
                  style={{ width: `${Math.max(progress, 28)}%` }}
                />
              </div>
              <p className="preview-caption">{progress}% complete on your live board</p>
            </div>
          </div>
        </section>

        <section id="features" className="features container">
          <div className="section-heading">
            <p className="eyebrow">Why TaskFlow</p>
            <h2>A board that feels like a product, not a spreadsheet</h2>
          </div>
          <div className="feature-grid">
            <article className="feature-card feature-coral">
              <div className="feature-icon">🎯</div>
              <h3>Clear priorities</h3>
              <p>Tag work as low, medium, or high so the urgent stuff never hides in the noise.</p>
            </article>
            <article className="feature-card feature-violet">
              <div className="feature-icon">🔁</div>
              <h3>Status that moves</h3>
              <p>
                Advance cards from to-do → in progress → done with one click. Loop back anytime.
              </p>
            </article>
            <article className="feature-card feature-mint">
              <div className="feature-icon">⚡</div>
              <h3>Always in sync</h3>
              <p>
                Your React UI talks to a live Express API and MongoDB — updates show up instantly.
              </p>
            </article>
          </div>
        </section>

        <section id="board" className="board container">
          <div className="section-heading board-heading">
            <div>
              <p className="eyebrow">Your workspace</p>
              <h2>Task board</h2>
            </div>
            <div className="progress-card">
              <div className="progress-label">
                <span>Completion</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

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
              { label: 'Total', value: stats.total, cls: 'stat-total', hint: 'Everything tracked' },
              { label: 'To Do', value: stats.todo, cls: 'stat-todo', hint: 'Ready to start' },
              {
                label: 'In Progress',
                value: stats.inProgress,
                cls: 'stat-inprog',
                hint: 'In motion',
              },
              { label: 'Done', value: stats.done, cls: 'stat-done', hint: 'Shipped' },
            ].map((stat) => (
              <div key={stat.label} className={`stat-card ${stat.cls}`}>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-hint">{stat.hint}</div>
              </div>
            ))}
          </div>

          <div className="workspace-grid">
            <div className="form-card">
              <div className="form-heading">
                <span className="form-kicker">Quick capture</span>
                <h3>Create a new task</h3>
              </div>
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
                  placeholder="What needs to happen?"
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
                  placeholder="Add context, links, or acceptance notes…"
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
                    {submitting ? 'Adding…' : 'Add task'}
                  </button>
                </div>
              </form>
            </div>

            <div className="board-panel">
              <div className="filter-bar" role="group" aria-label="Filter tasks">
                <span className="filter-label">Filter</span>
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
                    ✨
                  </div>
                  <div className="empty-title">No tasks found</div>
                  <div className="empty-sub">
                    {error
                      ? 'Check backend connection above'
                      : 'Create your first task to the left'}
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
            </div>
          </div>
        </section>

        <section id="about" className="about container">
          <div className="about-card">
            <p className="eyebrow">Under the hood</p>
            <h2>A classic 3-tier architecture, dressed for 2026</h2>
            <p>
              This UI is only the presentation layer. Your tasks still live in MongoDB and move
              through the Express API — nothing about the backend contract changed. Refresh, filter,
              and ship with confidence.
            </p>
            <div className="about-steps">
              <div>
                <strong>01</strong>
                <span>Frontend</span>
              </div>
              <div>
                <strong>02</strong>
                <span>API</span>
              </div>
              <div>
                <strong>03</strong>
                <span>Database</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="brand-text">
              Task<span>Flow</span>
            </div>
            <p>Built for demos, workshops, and delightful day-to-day tracking.</p>
          </div>
          <div className="footer-links">
            <a href="#top">Back to top</a>
            <a href="#board">Board</a>
            <a href="#features">Features</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
