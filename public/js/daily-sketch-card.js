(function () {
  const API_BASE = "https://api.adamjones.ca";
  const MANIFEST_PATH = "/data/sketch.json";
  const TIMEOUT_MS = 4000;

  const card = document.querySelector("[data-daily-sketch-card]");
  if (!card) return;

  const status = card.querySelector("[data-sketch-status]");
  const image = card.querySelector("[data-sketch-image]");
  const dateLabel = card.querySelector("[data-sketch-date]");
  const noteLabel = card.querySelector("[data-sketch-note]");

  hydrate();

  async function hydrate() {
    setStatus("Loading latest sketch...");
    let hasRendered = false;
    let manifestStatus = "Using fallback sketch.";

    try {
      const manifest = await requestManifest();
      const latestFromManifest = pickLatestSketch(manifest?.items);
      if (latestFromManifest) {
        renderSketch(latestFromManifest);
        manifestStatus = "Loaded from static sketch manifest.";
        hasRendered = true;
      } else {
        manifestStatus = "No sketches in manifest yet.";
        if (!hasRendered) {
          setStatus(manifestStatus);
        }
      }
    } catch (error) {
      manifestStatus = "Could not load sketch manifest.";
      if (!hasRendered) {
        setStatus(manifestStatus);
      }
      console.error(error);
    }

    try {
      const latestResponse = await requestApi("/sketches/latest", { method: "GET" });
      const latest = latestResponse?.data;
      if (latest && typeof latest === "object") {
        renderSketch(latest);
        setStatus("Live sketch synced.");
        return;
      }
      setStatus(manifestStatus);
    } catch (error) {
      setStatus(manifestStatus);
      console.error(error);
    }
  }

  function renderSketch(sketch) {
    const imageUrl = sanitizeText(sketch.image_url);
    if (imageUrl && image) {
      image.src = imageUrl;
    }

    const timestamp = toTimestamp(sketch.sketch_at);
    if (dateLabel) {
      dateLabel.textContent = timestamp
        ? formatSketchDate(new Date(timestamp))
        : "Undated sketch";
    }

    if (image) {
      image.alt = timestamp
        ? `Daily sketch from ${formatSketchAltDate(new Date(timestamp))}`
        : "Daily sketch";
    }

    const note = sanitizeText(sketch.note);
    if (noteLabel) {
      noteLabel.textContent = note;
      noteLabel.hidden = !note;
    }
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

  function pickLatestSketch(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    let latest = null;
    let latestTs = Number.NEGATIVE_INFINITY;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const ts = toTimestamp(item.sketch_at);
      if (!Number.isFinite(ts)) continue;
      if (ts > latestTs) {
        latestTs = ts;
        latest = item;
      }
    }
    return latest;
  }

  function toTimestamp(value) {
    if (typeof value !== "string" || !value.trim()) return Number.NaN;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
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
