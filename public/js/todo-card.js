(function () {
  const API_BASE = "https://api.adamjones.ca";
  const TIMEOUT_MS = 4000;

  const card = document.querySelector("[data-todo-card]");
  if (!card) return;

  const list = card.querySelector("[data-todo-list]");
  const form = card.querySelector("[data-todo-form]");
  const input = card.querySelector("[data-todo-input]");
  const status = card.querySelector("[data-todo-status]");

  hydrate();

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = (input?.value || "").trim();
    if (!text) return;

    setStatus("Saving...");
    const optimisticId = `optimistic-${Date.now()}`;
    renderAdd({ id: optimisticId, text, completed: false }, true);
    input.value = "";

    try {
      const created = await requestJson("/todos", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      replaceItemId(optimisticId, created.data.id);
      setStatus("Synced");
    } catch (error) {
      removeItemById(optimisticId);
      setStatus("Could not save item.");
      console.error(error);
    }
  });

  list?.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

    const li = target.closest("li[data-id]");
    if (!li) return;
    const id = li.getAttribute("data-id");
    const completed = target.checked;
    li.classList.toggle("is-done", completed);

    try {
      await requestJson(`/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });
      setStatus("Synced");
    } catch (error) {
      target.checked = !completed;
      li.classList.toggle("is-done", !completed);
      setStatus("Could not update item.");
      console.error(error);
    }
  });

  list?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || target.dataset.todoDelete !== "true") return;
    const li = target.closest("li[data-id]");
    if (!li) return;
    const id = li.getAttribute("data-id");
    const previous = li.cloneNode(true);
    li.remove();

    try {
      await requestJson(`/todos/${encodeURIComponent(id)}`, { method: "DELETE" });
      setStatus("Synced");
    } catch (error) {
      list.appendChild(previous);
      setStatus("Could not remove item.");
      console.error(error);
    }
  });

  async function hydrate() {
    setStatus("Syncing...");
    try {
      const response = await requestJson("/todos", { method: "GET" });
      renderFull(response.data || []);
      setStatus("Synced");
    } catch (error) {
      setStatus("Live sync unavailable (showing fallback list).");
      console.error(error);
    }
  }

  function renderFull(items) {
    if (!list) return;
    list.innerHTML = "";
    for (const item of items) {
      renderAdd(item, false);
    }
  }

  function renderAdd(item, prepend) {
    if (!list) return;
    const li = buildTodoItem(item);
    if (prepend) {
      list.prepend(li);
    } else {
      list.appendChild(li);
    }
  }

  function buildTodoItem(item) {
    const li = document.createElement("li");
    li.dataset.id = item.id;
    li.className = "todo-item";
    if (item.completed) li.classList.add("is-done");

    const label = document.createElement("label");
    label.className = "todo-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(item.completed);
    checkbox.setAttribute("aria-label", `Mark "${item.text}" as complete`);

    const span = document.createElement("span");
    span.textContent = item.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.todoDelete = "true";
    remove.className = "todo-delete";
    remove.setAttribute("aria-label", `Delete "${item.text}"`);
    remove.textContent = "Delete";

    label.appendChild(checkbox);
    label.appendChild(span);
    li.appendChild(label);
    li.appendChild(remove);
    return li;
  }

  function replaceItemId(from, to) {
    const node = list?.querySelector(`li[data-id="${CSS.escape(from)}"]`);
    if (node) node.setAttribute("data-id", to);
  }

  function removeItemById(id) {
    const node = list?.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    node?.remove();
  }

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  async function requestJson(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const headers = { ...(options?.headers || {}) };
    if (options?.body && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
})();
