import { useState } from 'react';
import { STATUS_NEXT, STATUS_LABEL } from './constants';
import { formatDate } from './utils';

export default function TaskCard({ task, onDelete, onStatusChange }) {
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(task._id);
    } catch (err) {
      console.error('Task delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatus = async () => {
    setUpdating(true);
    try {
      await onStatusChange(task._id, STATUS_NEXT[task.status]);
    } catch (err) {
      console.error('Task status update failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const nextLabel = STATUS_LABEL[STATUS_NEXT[task.status]] || 'Next';

  return (
    <article className={`task-card status-${task.status}`}>
      <div className="task-left">
        <button
          type="button"
          className={`status-dot dot-${task.status}`}
          onClick={handleStatus}
          disabled={updating}
          title="Click to advance status"
          aria-label={`Advance status for ${task.title}`}
        >
          {task.status === 'done' ? '✓' : updating ? '…' : ''}
        </button>
      </div>

      <div className="task-body">
        <div className={`task-title ${task.status === 'done' ? 'done' : ''}`}>{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-meta">
          <span className={`badge badge-status badge-${task.status}`}>
            {STATUS_LABEL[task.status]}
          </span>
          <span className={`badge badge-priority badge-p-${task.priority}`}>{task.priority}</span>
          <span className="task-date">{formatDate(task.createdAt)}</span>
        </div>
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="btn-cycle"
          onClick={handleStatus}
          disabled={updating}
          title={`Move to ${nextLabel}`}
        >
          {updating ? '…' : `Move to ${nextLabel}`}
        </button>
        <button
          type="button"
          className="btn-delete"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete task ${task.title}`}
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </article>
  );
}
