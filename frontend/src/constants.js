export const STATUS_NEXT = {
  todo: 'in-progress',
  'in-progress': 'done',
  done: 'todo',
};

export const STATUS_LABEL = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

export const TASK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
];

export const DEFAULT_FORM_STATE = {
  title: '',
  description: '',
  priority: 'medium',
};
