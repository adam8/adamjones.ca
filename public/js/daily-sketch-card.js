(function () {
  const API_BASE = "https://api.adamjones.ca";
  const MANIFEST_PATH = "/data/sketch.json";
  const TIMEOUT_MS = 4000;
  const API_LIST_LIMIT = 60;

  const card = document.querySelector("[data-daily-sketch-card]");
  if (!card) return;

  const status = card.querySelector("[data-sketch-status]");
  const rail = card.querySelector("[data-sketch-rail]");
  const prevButton = card.querySelector("[data-sketch-prev]");
  const nextButton = card.querySelector("[data-sketch-next]");
  if (!rail) return;

  setupNavigation();
  hydrate();

  async function hydrate() {
    setStatus("Loading sketches...");
    let hasManifestData = false;
    let manifestStatus = "Using fallback sketch.";

    try {
      const manifest = await requestManifest();
      const manifestItems = normalizeSketches(manifest?.items);
      if (manifestItems.length > 0) {
        renderSketches(manifestItems);
        manifestStatus = "Loaded from static sketch manifest.";
        hasManifestData = true;
      } else {
        manifestStatus = "No sketches in manifest yet.";
        if (!hasManifestData) {
          setStatus(manifestStatus);
        }
      }
    } catch (error) {
      manifestStatus = "Could not load sketch manifest.";
      if (!hasManifestData) {
        setStatus(manifestStatus);
      }
      console.error(error);
    }

    try {
      const liveResponse = await requestApi(`/sketches?limit=${API_LIST_LIMIT}`, {
        method: "GET",
      });
      const liveItems = normalizeSketches(liveResponse?.data);
      if (liveItems.length > 0) {
        renderSketches(liveItems);
        setStatus("Live sketches synced.");
        return;
      }
      setStatus(manifestStatus);
    } catch (error) {
      setStatus(manifestStatus);
      console.error(error);
    }
  }

  function normalizeSketches(items) {
    if (!Array.isArray(items)) return [];

    const seen = new Set();
    const normalized = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const imageUrl = sanitizeText(raw.image_url);
      if (!imageUrl) continue;
      const timestamp = toTimestamp(raw.sketch_at);
      if (!Number.isFinite(timestamp)) continue;
      const id = sanitizeText(raw.id) || `${raw.sketch_at}|${imageUrl}`;
      if (seen.has(id)) continue;
      seen.add(id);
      normalized.push({
        id,
        image_url: imageUrl,
        note: sanitizeText(raw.note),
        sketch_at: new Date(timestamp).toISOString(),
        timestamp,
      });
    }
    normalized.sort((a, b) => b.timestamp - a.timestamp);
    return normalized;
  }

  function renderSketches(items) {
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      fragment.appendChild(buildSketchFigure(item, index));
    });
    rail.innerHTML = "";
    rail.appendChild(fragment);
    rail.scrollTo({ left: 0, behavior: "auto" });
    updateNavState();
  }

  function buildSketchFigure(item, index) {
    const figure = document.createElement("figure");
    figure.className = "sketch-figure";

    const image = document.createElement("img");
    image.className = "sketch-image";
    image.src = item.image_url;
    image.alt = `Daily sketch from ${formatSketchAltDate(new Date(item.timestamp))}`;
    image.loading = index === 0 ? "eager" : "lazy";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    caption.className = "sketch-caption";

    const dateLabel = document.createElement("span");
    dateLabel.className = "sketch-date";
    dateLabel.textContent = formatSketchDate(new Date(item.timestamp));

    const note = document.createElement("p");
    note.className = "sketch-note";
    note.textContent = item.note;
    note.hidden = !item.note;

    caption.appendChild(dateLabel);
    caption.appendChild(note);
    figure.appendChild(image);
    figure.appendChild(caption);
    return figure;
  }

  function toTimestamp(value) {
    if (typeof value !== "string" || !value.trim()) return Number.NaN;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }

  function setupNavigation() {
    rail.addEventListener("scroll", updateNavState, { passive: true });
    window.addEventListener("resize", updateNavState);
    prevButton?.addEventListener("click", () => scrollByStep(-1));
    nextButton?.addEventListener("click", () => scrollByStep(1));
    updateNavState();
  }

  function scrollByStep(direction) {
    const step = getScrollStep();
    rail.scrollBy({
      left: direction * step,
      behavior: "smooth",
    });
  }

  function getScrollStep() {
    const figures = rail.querySelectorAll(".sketch-figure");
    if (figures.length > 1) {
      const first = figures[0];
      const second = figures[1];
      const delta = Math.abs(second.offsetLeft - first.offsetLeft);
      if (delta > 0) {
        return delta;
      }
    }
    return Math.max(rail.clientWidth, 1);
  }

  function updateNavState() {
    if (!prevButton || !nextButton) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    if (maxScroll <= 2) {
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }
    prevButton.disabled = rail.scrollLeft <= 2;
    nextButton.disabled = rail.scrollLeft >= maxScroll - 2;
  }

  async function requestManifest() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(MANIFEST_PATH, {
        method: "GET",
        cache: "no-cache",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Manifest request failed: ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function requestApi(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
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

  function formatSketchDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function formatSketchAltDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function sanitizeText(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function setStatus(text) {
    if (status) {
      status.textContent = text;
    }
  }
})();
