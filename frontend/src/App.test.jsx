import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const sampleTask = {
  _id: '64b64b64b64b64b64b64b64b',
  title: 'Ship CI',
  description: 'Make the pipeline honest',
  status: 'todo',
  priority: 'high',
  createdAt: '2026-08-24T00:00:00.000Z',
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tasks after a successful fetch', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [sampleTask] } });

    render(<App />);

    expect(screen.getByText('Loading tasks…')).toBeInTheDocument();
    expect(await screen.findByText('Ship CI')).toBeInTheDocument();
    expect(screen.getByText('DB Connected')).toBeInTheDocument();
  });

  it('shows an error state when the API is unavailable', async () => {
    api.get.mockRejectedValue({ message: 'Network Error' });

    render(<App />);

    expect(
      await screen.findByText(
        'Cannot reach backend. Start the backend server (npm start in /backend)',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });

  it('creates a task from the form', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });
    api.post.mockResolvedValue({
      data: {
        success: true,
        data: { ...sampleTask, title: 'New task' },
      },
    });

    render(<App />);
    await screen.findByText('No tasks found');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New task' } });
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tasks', {
        title: 'New task',
        description: '',
        priority: 'medium',
      });
    });
    expect(await screen.findByText('New task')).toBeInTheDocument();
  });
});
