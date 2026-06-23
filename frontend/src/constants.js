export const STATUS_NEXT = {
  todo: "in-progress",
  "in-progress": "done",
  done: "todo",
};

export const STATUS_LABEL = {
  todo: "TODO",
  "in-progress": "IN PROG",
  done: "DONE",
};

export const TASK_FILTERS = [
  { id: "all", label: "ALL" },
  { id: "todo", label: "TODO" },
  { id: "in-progress", label: "IN PROG" },
  { id: "done", label: "DONE" },
];

export const DEFAULT_FORM_STATE = {
  title: "",
  description: "",
  priority: "medium",
};
