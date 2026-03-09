#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(rootDir, "public", "index.html");
const html = readFileSync(indexPath, "utf8");

const REQUIRED_MODULES = ["sketch", "workbench", "todos", "news", "calendar", "findme"];
const SNAPSHOT_MARKERS = [
  {
    label: "Focus cards",
    start: "<!-- FOCUS_CARDS_SNAPSHOT_START -->",
    end: "<!-- FOCUS_CARDS_SNAPSHOT_END -->",
  },
  {
    label: "To-do",
    start: "<!-- TODO_SNAPSHOT_START -->",
    end: "<!-- TODO_SNAPSHOT_END -->",
  },
  {
    label: "Upcoming holidays",
    start: "<!-- UPCOMING_HOLIDAYS_START -->",
    end: "<!-- UPCOMING_HOLIDAYS_END -->",
  },
];

function parseAttributes(tag) {
  const attrs = {};
  const attrRegex = /([a-zA-Z_:-][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attrRegex.exec(tag))) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4];

    if (name === "button" || name === "article" || name === "div") {
      continue;
    }

    attrs[name] = value === undefined ? true : value;
  }

  return attrs;
}

function findTags(regex) {
  return Array.from(html.matchAll(regex), (match) => ({
    tag: match[0],
    attrs: parseAttributes(match[0]),
  }));
}

function collectElementIds() {
  return new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]));
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function checkSnapshotMarkers(failures) {
  for (const marker of SNAPSHOT_MARKERS) {
    const firstStart = html.indexOf(marker.start);
    const secondStart = firstStart === -1 ? -1 : html.indexOf(marker.start, firstStart + 1);
    const firstEnd = html.indexOf(marker.end);
    const secondEnd = firstEnd === -1 ? -1 : html.indexOf(marker.end, firstEnd + 1);

    assert(firstStart !== -1, `${marker.label} start marker is missing.`, failures);
    assert(firstEnd !== -1, `${marker.label} end marker is missing.`, failures);
    assert(secondStart === -1, `${marker.label} start marker appears more than once.`, failures);
    assert(secondEnd === -1, `${marker.label} end marker appears more than once.`, failures);

    if (firstStart !== -1 && firstEnd !== -1) {
      assert(firstStart < firstEnd, `${marker.label} marker order is invalid.`, failures);
    }
  }
}

function checkDesktopPanelsAndHotspots(failures) {
  const allIds = collectElementIds();
  const panelTags = findTags(/<article\b[^>]*\bclass="[^"]*\bpanel\b[^"]*"[^>]*>/gi);
  const hotspotTags = findTags(/<button\b[^>]*\bclass="[^"]*\bhotspot\b[^"]*"[^>]*>/gi);

  const panelsByModule = new Map();
  const hotspotsByModule = new Map();

  panelTags.forEach(({ attrs }) => {
    const moduleId = attrs["data-module"];
    if (moduleId) {
      panelsByModule.set(String(moduleId), attrs);
    }
  });

  hotspotTags.forEach(({ attrs }) => {
    const moduleId = attrs["data-target"];
    if (moduleId) {
      hotspotsByModule.set(String(moduleId), attrs);
    }
  });

  for (const moduleId of REQUIRED_MODULES) {
    const panelAttrs = panelsByModule.get(moduleId);
    const hotspotAttrs = hotspotsByModule.get(moduleId);
    const expectedPanelId = `panel-${moduleId}`;

    assert(Boolean(panelAttrs), `Missing desktop panel for module "${moduleId}".`, failures);
    assert(Boolean(hotspotAttrs), `Missing hotspot button for module "${moduleId}".`, failures);

    if (panelAttrs) {
      assert(panelAttrs.id === expectedPanelId, `Panel for "${moduleId}" must have id="${expectedPanelId}".`, failures);
      assert(panelAttrs.hidden === true, `Panel "${expectedPanelId}" must include hidden on initial render.`, failures);
      assert(
        panelAttrs["aria-hidden"] === "true",
        `Panel "${expectedPanelId}" must start with aria-hidden="true".`,
        failures
      );
      assert(
        panelAttrs["data-module"] === moduleId,
        `Panel "${expectedPanelId}" must map data-module="${moduleId}".`,
        failures
      );
    }

    if (hotspotAttrs) {
      assert(
        hotspotAttrs["aria-controls"] === expectedPanelId,
        `Hotspot "${moduleId}" must control "${expectedPanelId}".`,
        failures
      );
      assert(
        hotspotAttrs["aria-expanded"] === "false",
        `Hotspot "${moduleId}" must start with aria-expanded="false".`,
        failures
      );
      assert(
        hotspotAttrs["data-target"] === moduleId,
        `Hotspot "${moduleId}" must have data-target="${moduleId}".`,
        failures
      );
    }
  }

  hotspotTags.forEach(({ attrs }) => {
    const targetId = attrs["aria-controls"];
    if (!targetId) {
      failures.push(`Hotspot button "${attrs.class || "(unknown)"}" is missing aria-controls.`);
      return;
    }

    assert(allIds.has(String(targetId)), `Hotspot aria-controls references missing id "${targetId}".`, failures);
  });
}

function checkMobileDrawerLinks(failures) {
  const allIds = collectElementIds();
  const toggleTags = findTags(/<button\b[^>]*\bclass="[^"]*\bmobile-module-toggle\b[^"]*"[^>]*>/gi);
  const drawerTags = findTags(/<div\b[^>]*\bclass="[^"]*\bmobile-module-drawer\b[^"]*"[^>]*>/gi);

  const drawerIdSet = new Set();
  drawerTags.forEach(({ attrs }) => {
    const drawerId = attrs.id;
    if (drawerId) {
      drawerIdSet.add(String(drawerId));
    }

    assert(attrs.hidden === true, `Mobile drawer "${drawerId || "(unknown)"}" must include hidden initially.`, failures);
    assert(
      attrs["aria-hidden"] === "true",
      `Mobile drawer "${drawerId || "(unknown)"}" must start with aria-hidden="true".`,
      failures
    );
  });

  toggleTags.forEach(({ attrs }) => {
    const controlsId = attrs["aria-controls"];
    assert(Boolean(controlsId), `Mobile toggle "${attrs.class || "(unknown)"}" is missing aria-controls.`, failures);
    assert(
      attrs["aria-expanded"] === "false",
      `Mobile toggle for "${controlsId || "(unknown)"}" must start with aria-expanded="false".`,
      failures
    );

    if (controlsId) {
      assert(allIds.has(String(controlsId)), `Mobile toggle aria-controls references missing id "${controlsId}".`, failures);
      assert(drawerIdSet.has(String(controlsId)), `Mobile toggle must reference a .mobile-module-drawer id: "${controlsId}".`, failures);
    }
  });
}

const failures = [];
checkSnapshotMarkers(failures);
checkDesktopPanelsAndHotspots(failures);
checkMobileDrawerLinks(failures);

if (failures.length > 0) {
  console.error("ERROR: HTML structural checks failed.");
  failures.forEach((failure) => {
    console.error(`- ${failure}`);
  });
  process.exit(1);
}

console.log("OK   HTML structure and snapshot markers are valid.");
