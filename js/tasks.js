/* Task domain operations. UI code calls these functions instead of editing arrays directly. */
(function () {
  const PRIORITY_ORDER = {
    high: 0,
    medium: 1,
    low: 2
  };

  function createTask(input) {
    const now = new Date().toISOString();

    return {
      id: (
        crypto.randomUUID
          ? crypto.randomUUID()
          : "task-" + Date.now() + Math.random().toString(16).slice(2)
      ),

      title: input.title.trim(),
      description: input.description.trim(),
      dueDate: input.dueDate || "",
      dueTime: input.dueTime || "",
      priority: input.priority || "medium",
      status: input.status || "todo",
      projectId: input.projectId || "inbox",
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now
    };
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === "done") {
      return false;
    }

    const due = new Date(
      task.dueDate + "T" + (task.dueTime || "23:59")
    );

    return due.getTime() < Date.now();
  }

  function matchesView(task, view, today) {
    if (view === "today") {
      return task.dueDate === today && task.status !== "done";
    }

    if (view === "upcoming") {
      return (
        !!task.dueDate &&
        task.dueDate > today &&
        task.status !== "done"
      );
    }

    if (view === "overdue") {
      return isOverdue(task);
    }

    if (view === "completed") {
      return task.status === "done";
    }

    return true;
  }

  function priorityRank(priority) {
    return PRIORITY_ORDER[priority] ?? 1;
  }

  window.TaskForgeTasks = {
    createTask,
    isOverdue,
    matchesView,
    priorityRank
  };
})();
