/* TaskForge v1 application controller. */
(() => {
  const $ = (id) => document.getElementById(id);
  const data = TaskForgeStorage.load();

  let currentView = "all";
  let currentProject = null;
  let currentStatus = "all";
  let toastTimer;

  const todayISO = () => {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const projectName = id =>
    data.projects.find(p => p.id === id)?.name || "Inbox";

  const projectColor = id =>
    data.projects.find(p => p.id === id)?.color || "#8b91e8";

  const save = () => {
    if (!TaskForgeStorage.save(data)) {
      notify("Couldn't save. Browser storage may be full.");
    }

    updateCounts();
  };

  function notify(message) {
    const toast = $("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(
      () => toast.classList.remove("show"),
      2300
    );
  }

  function formatDate(date) {
    if (!date) return "No date";

    const d = new Date(date + "T12:00:00");

    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function viewTitle() {
    if (currentProject) {
      return projectName(currentProject);
    }

    return ({
      all: "All tasks",
      today: "Today",
      upcoming: "Upcoming",
      overdue: "Overdue",
      completed: "Completed"
    })[currentView] || "All tasks";
  }

  function visibleTasks() {
    const today = todayISO();
    const query = $("searchInput").value.trim().toLowerCase();
    const priority = $("priorityFilter").value;
    const sort = $("sortSelect").value;

    let result = data.tasks.filter(t =>
      TaskForgeTasks.matchesView(t, currentView, today)
    );

    if (currentProject) {
      result = result.filter(t => t.projectId === currentProject);
    }

    if (currentStatus !== "all") {
      result = result.filter(t => t.status === currentStatus);
    }

    if (priority !== "all") {
      result = result.filter(t => t.priority === priority);
    }

    if (query) {
      result = result.filter(t =>
        [
          t.title,
          t.description,
          projectName(t.projectId),
          ...(t.tags || [])
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    result.sort((a, b) => {
      if (sort === "due") {
        return (a.dueDate || "9999").localeCompare(
          b.dueDate || "9999"
        );
      }

      if (sort === "priority") {
        return (
          TaskForgeTasks.priorityRank(a.priority) -
          TaskForgeTasks.priorityRank(b.priority)
        );
      }

      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }

      return b.createdAt.localeCompare(a.createdAt);
    });

    return result;
  }

  function renderTasks() {
    const tasks = visibleTasks();

    $("taskList").innerHTML = tasks.map(t => {
      const overdue = TaskForgeTasks.isOverdue(t);

      const tags = (t.tags || []).length
        ? `<div class="task-description">${escapeHTML(t.tags.join(" · "))}</div>`
        : (
            t.description
              ? `<div class="task-description">${escapeHTML(t.description)}</div>`
              : ""
          );

      const dueLabel = t.dueDate
        ? formatDate(t.dueDate) +
          (t.dueTime ? " · " + escapeHTML(t.dueTime) : "")
        : "No date";

      return `
        <article class="task-row ${t.status === "done" ? "is-done" : ""}"
          data-id="${escapeHTML(t.id)}">

          <div class="task-main">
            <button
              class="complete-toggle"
              data-action="toggle"
              aria-label="${t.status === "done" ? "Mark incomplete" : "Complete task"}">
              ${t.status === "done" ? "✓" : ""}
            </button>

            <div class="task-copy">
              <div class="task-title"
                data-action="edit"
                title="Edit task">
                ${escapeHTML(t.title)}
              </div>

              ${tags}
            </div>
          </div>

          <span class="project-chip">
            <i style="background:${escapeHTML(projectColor(t.projectId))}"></i>
            ${escapeHTML(projectName(t.projectId))}
          </span>

          <span class="priority-pill priority-${escapeHTML(t.priority)}">
            ${escapeHTML(t.priority[0].toUpperCase() + t.priority.slice(1))}
          </span>

          <span class="due-date ${overdue ? "late" : ""}">
            ${overdue ? "Overdue · " : ""}${dueLabel}
          </span>

          <span class="status-pill status-${escapeHTML(t.status)}">
            ${
              t.status === "in-progress"
                ? "In progress"
                : t.status === "done"
                  ? "Done"
                  : "To do"
            }
          </span>

          <div class="row-actions">
            <button class="more-button"
              data-action="menu"
              aria-label="Task actions">···</button>
          </div>
        </article>
      `;
    }).join("");

    $("emptyState").hidden = tasks.length !== 0;
    $("taskList").hidden = tasks.length === 0;

    $("visibleCount").textContent =
      `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

    $("currentViewLabel").textContent = viewTitle();
    $("pageTitle").textContent = viewTitle();

    $("pageSubtitle").textContent = currentProject
      ? "Tasks in this project."
      : ({
          all: "Everything you need to move forward.",
          today: "A clear view of what is due today.",
          upcoming: "See what's coming up next.",
          overdue: "Tasks past their due date that need attention.",
          completed: "A record of the progress you've made."
        })[currentView];
  }

  function updateCounts() {
    const open = data.tasks.filter(t => t.status !== "done");

    $("allCount").textContent = open.length;

    $("overdueCount").textContent =
      open.filter(TaskForgeTasks.isOverdue).length;

    $("statTotal").textContent = data.tasks.length;

    $("statProgress").textContent =
      data.tasks.filter(t => t.status === "in-progress").length;

    $("statCompleted").textContent =
      data.tasks.filter(t => t.status === "done").length;

    $("statOverdue").textContent =
      open.filter(TaskForgeTasks.isOverdue).length;

    renderProjects();
    renderTasks();
  }

  function renderProjects() {
    $("projectList").innerHTML = data.projects.map(p => {
      const count = data.tasks.filter(
        t => t.projectId === p.id && t.status !== "done"
      ).length;

      return `
        <button class="project-item ${currentProject === p.id ? "active" : ""}"
          data-project="${escapeHTML(p.id)}">

          <span class="project-dot"
            style="background:${escapeHTML(p.color)}"></span>

          ${escapeHTML(p.name)}

          <span class="project-count">${count}</span>
        </button>
      `;
    }).join("");

    $("taskProject").innerHTML = data.projects.map(p => `
      <option value="${escapeHTML(p.id)}">
        ${escapeHTML(p.name)}
      </option>
    `).join("");
  }

  function setView(view) {
    currentView = view;
    currentProject = null;
    currentStatus = "all";

    document.querySelectorAll(".nav-item").forEach(b => {
      b.classList.toggle("active", b.dataset.view === view);
    });

    document.querySelectorAll(".project-item").forEach(b => {
      b.classList.remove("active");
    });

    document.querySelectorAll(".tab").forEach(b => {
      b.classList.toggle("active", b.dataset.status === "all");
    });

    updateCounts();
  }

  function openTaskDialog(task = null) {
    $("taskForm").reset();

    $("taskId").value = task?.id || "";

    $("dialogTitle").textContent =
      task ? "Edit task" : "Create a task";

    $("saveTaskButton").textContent =
      task ? "Save changes" : "Create task";

    $("taskTitle").value = task?.title || "";
    $("taskDescription").value = task?.description || "";
    $("taskDue").value = task?.dueDate || "";
    $("taskTime").value = task?.dueTime || "";
    $("taskPriority").value = task?.priority || "medium";
    $("taskStatus").value = task?.status || "todo";

    $("taskProject").value =
      task?.projectId ||
      currentProject ||
      data.projects[0]?.id ||
      "inbox";

    $("taskTags").value = (task?.tags || []).join(", ");

    $("taskDialog").showModal();

    setTimeout(() => $("taskTitle").focus(), 50);
  }

  function closeTaskDialog() {
    $("taskDialog").close();
  }

  function openProjectDialog() {
    $("projectForm").reset();

    $("projectDialog").showModal();

    setTimeout(() => $("projectName").focus(), 50);
  }

  // Navigation
  document.querySelectorAll(".nav-item").forEach(b => {
    b.addEventListener("click", () => setView(b.dataset.view));
  });

  // Status filters
  document.querySelectorAll(".tab").forEach(b => {
    b.addEventListener("click", () => {
      currentStatus = b.dataset.status;

      document.querySelectorAll(".tab").forEach(x => {
        x.classList.toggle("active", x === b);
      });

      renderTasks();
    });
  });

  // Project selection
  $("projectList").addEventListener("click", e => {
    const b = e.target.closest("[data-project]");

    if (!b) return;

    currentProject = b.dataset.project;
    currentView = "all";
    currentStatus = "all";

    document.querySelectorAll(".nav-item").forEach(x => {
      x.classList.remove("active");
    });

    document.querySelectorAll(".tab").forEach(x => {
      x.classList.toggle("active", x.dataset.status === "all");
    });

    updateCounts();
  });

  // Task actions
  $("taskList").addEventListener("click", e => {
    const action = e.target.closest("[data-action]");

    if (!action) return;

    const row = action.closest(".task-row");

    const task = data.tasks.find(
      t => t.id === row?.dataset.id
    );

    if (!task) return;

    if (action.dataset.action === "toggle") {
      task.status = task.status === "done" ? "todo" : "done";
      task.updatedAt = new Date().toISOString();

      save();

      notify(
        task.status === "done"
          ? "Task completed"
          : "Task reopened"
      );

    } else if (action.dataset.action === "edit") {
      openTaskDialog(task);

    } else if (action.dataset.action === "menu") {
      document.querySelectorAll(".row-menu").forEach(m => m.remove());

      const menu = document.createElement("div");

      menu.className = "row-menu";

      menu.innerHTML = `
        <button data-menu-action="edit">Edit task</button>
        <button data-menu-action="delete" class="danger">Delete task</button>
      `;

      action.parentElement.appendChild(menu);

      menu.addEventListener("click", ev => {
        const choice = ev.target.dataset.menuAction;

        if (!choice) return;

        if (choice === "edit") {
          openTaskDialog(task);
        }

        if (
          choice === "delete" &&
          confirm(`Delete "${task.title}"?`)
        ) {
          data.tasks = data.tasks.filter(
            t => t.id !== task.id
          );

          save();
          notify("Task deleted");
        }

      }, { once: true });
    }
  });

  // Create and edit tasks
  $("taskForm").addEventListener("submit", e => {
    e.preventDefault();

    const title = $("taskTitle").value.trim();

    if (!title) {
      return $("taskTitle").focus();
    }

    const input = {
      title,
      description: $("taskDescription").value,
      dueDate: $("taskDue").value,
      dueTime: $("taskTime").value,
      priority: $("taskPriority").value,
      status: $("taskStatus").value,
      projectId: $("taskProject").value,

      tags: $("taskTags").value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 10)
    };

    const id = $("taskId").value;

    if (id) {
      const task = data.tasks.find(t => t.id === id);

      if (task) {
        Object.assign(task, input, {
          updatedAt: new Date().toISOString()
        });
      }

      notify("Changes saved");

    } else {
      data.tasks.unshift(TaskForgeTasks.createTask(input));

      notify("Task created");
    }

    closeTaskDialog();
    save();
  });

  // Buttons
  $("newTaskButton").addEventListener(
    "click",
    () => openTaskDialog()
  );

  $("sidebarAdd").addEventListener(
    "click",
    () => openTaskDialog()
  );

  $("emptyAdd").addEventListener(
    "click",
    () => openTaskDialog()
  );

  $("closeDialog").addEventListener(
    "click",
    closeTaskDialog
  );

  $("cancelDialog").addEventListener(
    "click",
    closeTaskDialog
  );

  $("addProject").addEventListener(
    "click",
    openProjectDialog
  );

  $("closeProjectDialog").addEventListener(
    "click",
    () => $("projectDialog").close()
  );

  $("cancelProject").addEventListener(
    "click",
    () => $("projectDialog").close()
  );

  // Create project
  $("projectForm").addEventListener("submit", e => {
    e.preventDefault();

    const name = $("projectName").value.trim();

    if (!name) return;

    if (
      data.projects.some(
        p => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return notify("That project already exists");
    }

    const palette = [
      "#8b91e8",
      "#36a889",
      "#d5a044",
      "#d47c9a",
      "#6e9acb"
    ];

    data.projects.push({
      id: "project-" + Date.now(),
      name,
      color: palette[data.projects.length % palette.length]
    });

    $("projectDialog").close();

    save();
    notify("Project created");
  });

  // Search, filters and sorting
  $("searchInput").addEventListener("input", renderTasks);
  $("priorityFilter").addEventListener("change", renderTasks);
  $("sortSelect").addEventListener("change", renderTasks);

  // Date label
  $("dateLabel").textContent = new Date().toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  ).toUpperCase();

  // Close menus when clicking elsewhere
  document.addEventListener("click", e => {
    if (!e.target.closest(".row-actions")) {
      document.querySelectorAll(".row-menu").forEach(m => m.remove());
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".row-menu").forEach(m => m.remove());
    }

    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement.tagName
    );

    if (
      !typing &&
      !e.ctrlKey &&
      !e.metaKey &&
      e.key.toLowerCase() === "n"
    ) {
      e.preventDefault();
      openTaskDialog();
    }

    if (!typing && e.key === "/") {
      e.preventDefault();
      $("searchInput").focus();
    }
  });

  // Mobile sidebar
  $("openSidebar").addEventListener("click", () => {
    $("sidebar").classList.add("open");
    $("overlay").classList.add("show");
  });

  $("closeSidebar").addEventListener("click", closeSidebar);
  $("overlay").addEventListener("click", closeSidebar);

  function closeSidebar() {
    $("sidebar").classList.remove("open");
    $("overlay").classList.remove("show");
  }

  // Initial render
  updateCounts();

})();
