(function () {
  const API_BASE = "https://api.adamjones.ca";
  const TIMEOUT_MS = 4000;

  const root = document.querySelector("[data-focus-cards]");
  if (!root) return;

  const cards = Array.from(root.querySelectorAll("[data-focus-card]"))
    .map(buildCardState)
    .filter(Boolean);
  if (!cards.length) return;

  const cardsBySlot = new Map(cards.map((card) => [card.slot, card]));
  const editorStatus = root.querySelector("[data-focus-editor-status]");
  const editorToggle = root.querySelector("[data-focus-editor-toggle]");
  const editorForm = root.querySelector("[data-focus-editor-form]");
  const editorCancel = root.querySelector("[data-focus-editor-cancel]");
  const editorFieldsets = Array.from(root.querySelectorAll("[data-focus-editor-card]"));

  for (const card of cards) {
    syncCardState(card, false);
    card.node.addEventListener("click", () => {
      const flipped = !card.node.classList.contains("is-flipped");
      syncCardState(card, flipped);
    });
  }

  populateEditorForm(readCardsFromDom());
  setApiAuthState(false);
  setStatus("Static snapshot loaded.");
  setEditorOpen(false);
  hydrate();

  editorToggle?.addEventListener("click", () => {
    if (!root.classList.contains("is-api-authenticated")) return;
    const shouldOpen = editorForm?.hasAttribute("hidden");
    if (shouldOpen) {
      populateEditorForm(readCardsFromDom());
    }
    setEditorOpen(shouldOpen);
    setStatus(shouldOpen ? "Editing live cards." : "Live cards synced.");
  });

  editorCancel?.addEventListener("click", () => {
    populateEditorForm(readCardsFromDom());
    setEditorOpen(false);
    setStatus("Live cards synced.");
  });

  editorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editorForm.reportValidity()) return;

    const updates = collectEditorValues();
    if (!updates) return;

    const currentBySlot = new Map(readCardsFromDom().map((item) => [item.slot, item]));
    const changed = updates.filter((item) => {
      const current = currentBySlot.get(item.slot);
      return (
        !current ||
        current.label !== item.label ||
        current.front !== item.front ||
        current.back !== item.back
      );
    });

    if (!changed.length) {
      setEditorOpen(false);
      setStatus("No live changes to save.");
      return;
    }

    setFormDisabled(true);
    setStatus("Saving...");

    try {
      for (const item of changed) {
        await requestJson(`/focus-cards/${encodeURIComponent(item.slot)}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: item.label,
            front: item.front,
            back: item.back,
          }),
        });
      }

      const response = await requestJson("/focus-cards", { method: "GET" });
      const liveCards = Array.isArray(response.data) ? response.data : [];
      applyCards(liveCards);
      populateEditorForm(liveCards);
      setEditorOpen(false);
      setStatus("Live cards saved.");
    } catch (error) {
      console.error(error);
      setStatus("Could not save cards.");
      try {
        const response = await requestJson("/focus-cards", { method: "GET" });
        const liveCards = Array.isArray(response.data) ? response.data : [];
        applyCards(liveCards);
        populateEditorForm(liveCards);
      } catch (reloadError) {
        console.error(reloadError);
      }
    } finally {
      setFormDisabled(false);
    }
  });

  async function hydrate() {
    try {
      const response = await requestJson("/focus-cards", { method: "GET" });
      const liveCards = Array.isArray(response.data) ? response.data : [];
      setApiAuthState(true);
      applyCards(liveCards);
      populateEditorForm(liveCards);
      setStatus("Live cards synced.");
    } catch (error) {
      setApiAuthState(false);
      setEditorOpen(false);
      populateEditorForm(readCardsFromDom());
      setStatus("Static snapshot loaded.");
      console.error(error);
    }
  }

  function buildCardState(node) {
    const slot = node.dataset.focusSlot || "";
    const frontFace = node.querySelector('[data-focus-face="front"]');
    const backFace = node.querySelector('[data-focus-face="back"]');
    const frontCopy = frontFace?.querySelector("[data-focus-copy]");
    const backCopy = backFace?.querySelector("[data-focus-copy]");
    const labelNodes = node.querySelectorAll("[data-focus-label]");

    if (!slot || !frontFace || !backFace || !frontCopy || !backCopy || labelNodes.length < 2) {
      return null;
    }

    return {
      slot,
      node,
      frontFace,
      backFace,
      frontCopy,
      backCopy,
      labelNodes: Array.from(labelNodes),
    };
  }

  function applyCards(items) {
    for (const item of items) {
      const card = cardsBySlot.get(item?.slot);
      if (!card) continue;
      const label = String(item.label || "").trim();
      const front = String(item.front || "").trim();
      const back = String(item.back || "").trim();
      if (!label || !front || !back) continue;

      for (const labelNode of card.labelNodes) {
        labelNode.textContent = label;
      }
      card.frontCopy.textContent = front;
      card.backCopy.textContent = back;
    }
  }

  function readCardsFromDom() {
    return cards.map((card) => ({
      slot: card.slot,
      label: card.labelNodes[0]?.textContent?.trim() || "",
      front: card.frontCopy.textContent.trim(),
      back: card.backCopy.textContent.trim(),
    }));
  }

  function populateEditorForm(items) {
    const itemsBySlot = new Map(items.map((item) => [item.slot, item]));
    for (const fieldset of editorFieldsets) {
      const slot = fieldset.dataset.focusEditorCard || "";
      const item = itemsBySlot.get(slot);
      if (!item) continue;

      const labelInput = fieldset.querySelector('[data-focus-input="label"]');
      const frontInput = fieldset.querySelector('[data-focus-input="front"]');
      const backInput = fieldset.querySelector('[data-focus-input="back"]');
      if (!labelInput || !frontInput || !backInput) continue;

      labelInput.value = item.label || "";
      frontInput.value = item.front || "";
      backInput.value = item.back || "";
    }
  }

  function collectEditorValues() {
    const items = [];

    for (const fieldset of editorFieldsets) {
      const slot = fieldset.dataset.focusEditorCard || "";
      const labelInput = fieldset.querySelector('[data-focus-input="label"]');
      const frontInput = fieldset.querySelector('[data-focus-input="front"]');
      const backInput = fieldset.querySelector('[data-focus-input="back"]');
      if (!slot || !labelInput || !frontInput || !backInput) continue;

      const label = labelInput.value.trim();
      const front = frontInput.value.trim();
      const back = backInput.value.trim();

      if (!label || !front || !back) {
        setStatus("Each live card needs label, front, and back text.");
        return null;
      }

      items.push({ slot, label, front, back });
    }

    return items;
  }

  function syncCardState(card, flipped) {
    card.node.classList.toggle("is-flipped", flipped);
    card.node.setAttribute("aria-pressed", flipped ? "true" : "false");
    card.frontFace.setAttribute("aria-hidden", flipped ? "true" : "false");
    card.backFace.setAttribute("aria-hidden", flipped ? "false" : "true");
  }

  function setEditorOpen(isOpen) {
    if (!editorForm || !editorToggle) return;
    editorForm.hidden = !isOpen;
    editorToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    editorToggle.textContent = isOpen ? "Hide editor" : "Edit cards";
  }

  function setApiAuthState(isAuthenticated) {
    root.classList.toggle("is-api-authenticated", Boolean(isAuthenticated));
    if (!isAuthenticated) setEditorOpen(false);
  }

  function setFormDisabled(isDisabled) {
    if (editorToggle) editorToggle.disabled = isDisabled;
    if (editorCancel) editorCancel.disabled = isDisabled;
    if (!editorForm) return;

    const controls = editorForm.querySelectorAll("input, textarea, button");
    for (const control of controls) {
      control.disabled = isDisabled;
    }
  }

  function setStatus(text) {
    if (editorStatus) editorStatus.textContent = text;
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
