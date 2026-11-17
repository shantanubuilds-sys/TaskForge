/* TaskForge persistence layer: all data stays in this browser for v1. */
(function () {
  const KEY = "taskforge.v1";

  const defaultData = {
    projects: [
      { id: "inbox", name: "Inbox", color: "#8b91e8" },
      { id: "personal", name: "Personal", color: "#36a889" },
      { id: "work", name: "Work", color: "#d5a044" }
    ],
    tasks: []
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);

      if (!raw) {
        return structuredClone(defaultData);
      }

      const parsed = JSON.parse(raw);

      return {
        projects: Array.isArray(parsed.projects)
          ? parsed.projects
          : structuredClone(defaultData.projects),

        tasks: Array.isArray(parsed.tasks)
          ? parsed.tasks
          : []
      };

    } catch (error) {
      console.error("TaskForge could not read saved data:", error);
      return structuredClone(defaultData);
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;

    } catch (error) {
      console.error("TaskForge could not save data:", error);
      return false;
    }
  }

  window.TaskForgeStorage = { load, save };
})();
