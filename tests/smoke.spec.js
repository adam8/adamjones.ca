const { test, expect } = require("@playwright/test");

const MODULES = ["sketch", "workbench", "todos", "news", "calendar", "findme"];

async function panelState(page, moduleId) {
  return page.$eval(`#panel-${moduleId}`, (panel) => ({
    hidden: panel.hidden,
    ariaHidden: panel.getAttribute("aria-hidden"),
    isOpenClass: panel.classList.contains("is-open"),
  }));
}

async function openDesktopPanelCount(page) {
  return page.$$eval(".panel-layer .panel", (panels) =>
    panels.filter(
      (panel) => !panel.hidden && panel.getAttribute("aria-hidden") === "false" && panel.classList.contains("is-open")
    ).length
  );
}

async function hotspotExpanded(page, moduleId) {
  return page.getAttribute(`.hotspot-${moduleId}`, "aria-expanded");
}

test.describe("desktop smoke", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("hotspots open the matching panel and preserve single-open state", async ({ page }) => {
    await page.goto("/");

    expect(await openDesktopPanelCount(page)).toBe(0);

    for (const moduleId of MODULES) {
      await page.click(`.hotspot-${moduleId}`);

      const state = await panelState(page, moduleId);
      expect(state.hidden).toBe(false);
      expect(state.ariaHidden).toBe("false");
      expect(state.isOpenClass).toBe(true);
      expect(await hotspotExpanded(page, moduleId)).toBe("true");
      expect(await openDesktopPanelCount(page)).toBe(1);

      const otherModules = MODULES.filter((id) => id !== moduleId);
      for (const otherModuleId of otherModules) {
        expect(await hotspotExpanded(page, otherModuleId)).toBe("false");
      }
    }
  });

  test("escape closes an open desktop panel and restores focus to hotspot", async ({ page }) => {
    await page.goto("/");

    const button = page.locator(".hotspot-news");
    await button.focus();
    await page.keyboard.press("Enter");

    expect(await hotspotExpanded(page, "news")).toBe("true");
    expect((await panelState(page, "news")).hidden).toBe(false);

    await page.keyboard.press("Escape");

    expect(await hotspotExpanded(page, "news")).toBe("false");
    expect((await panelState(page, "news")).hidden).toBe(true);
    await expect(button).toBeFocused();
  });
});

test.describe("mid-size smoke", () => {
  test.use({ viewport: { width: 1040, height: 900 } });

  test("desktop hotspots form a ring and panels stay outside the center hub", async ({ page }) => {
    await page.goto("/");

    const hotspotGeometry = await page.evaluate((moduleIds) => {
      const stage = document.querySelector(".machine-stage");
      if (!stage) {
        return null;
      }

      const stageRect = stage.getBoundingClientRect();
      const centerX = stageRect.left + stageRect.width / 2;
      const centerY = stageRect.top + stageRect.height / 2;

      return {
        stageWidth: stageRect.width,
        hotspots: moduleIds.map((id) => {
          const button = document.querySelector(`.hotspot-${id}`);
          if (!button) {
            return null;
          }

          const rect = button.getBoundingClientRect();
          const buttonCenterX = rect.left + rect.width / 2;
          const buttonCenterY = rect.top + rect.height / 2;

          return {
            id,
            distance: Math.hypot(buttonCenterX - centerX, buttonCenterY - centerY),
            angle: Math.atan2(buttonCenterY - centerY, buttonCenterX - centerX),
          };
        }),
      };
    }, MODULES);

    expect(hotspotGeometry).not.toBeNull();
    expect(hotspotGeometry.hotspots).toHaveLength(MODULES.length);

    for (const hotspot of hotspotGeometry.hotspots) {
      expect(hotspot).not.toBeNull();
      expect(hotspot.distance).toBeGreaterThan(hotspotGeometry.stageWidth * 0.18);
      expect(hotspot.distance).toBeLessThan(hotspotGeometry.stageWidth * 0.42);
    }

    const sortedAngles = hotspotGeometry.hotspots.map((hotspot) => hotspot.angle).sort((a, b) => a - b);
    const wrappedAngles = [...sortedAngles, sortedAngles[0] + Math.PI * 2];

    for (let index = 1; index < wrappedAngles.length; index += 1) {
      expect(wrappedAngles[index] - wrappedAngles[index - 1]).toBeGreaterThan(0.3);
    }

    for (const moduleId of MODULES) {
      await page.click(`.hotspot-${moduleId}`);

      const anchor = await page.evaluate((id) => {
        const stage = document.querySelector(".machine-stage");
        const button = document.querySelector(`.hotspot-${id}`);
        const panel = document.getElementById(`panel-${id}`);

        if (!stage || !button || !panel) {
          return null;
        }

        const stageRect = stage.getBoundingClientRect();
        const centerX = stageRect.left + stageRect.width / 2;
        const centerY = stageRect.top + stageRect.height / 2;
        const buttonRect = button.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();

        const buttonCenterX = buttonRect.left + buttonRect.width / 2;
        const buttonCenterY = buttonRect.top + buttonRect.height / 2;
        const panelCenterX = panelRect.left + panelRect.width / 2;
        const panelCenterY = panelRect.top + panelRect.height / 2;

        return {
          stageWidth: stageRect.width,
          innerHubRadius: stageRect.width * 0.22,
          buttonToPanelDistance: Math.hypot(panelCenterX - buttonCenterX, panelCenterY - buttonCenterY),
          panelDistanceFromCenter: Math.hypot(panelCenterX - centerX, panelCenterY - centerY),
          panelHidden: panel.hidden,
          panelAriaHidden: panel.getAttribute("aria-hidden"),
        };
      }, moduleId);

      expect(anchor).not.toBeNull();
      expect(anchor.panelHidden).toBe(false);
      expect(anchor.panelAriaHidden).toBe("false");
      expect(anchor.panelDistanceFromCenter).toBeGreaterThan(anchor.innerHubRadius);
      expect(anchor.buttonToPanelDistance).toBeLessThan(anchor.stageWidth * 0.55);
      expect(await openDesktopPanelCount(page)).toBe(1);
    }
  });
});

test.describe("mobile smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile layout follows a vertical spiral rhythm and drawers toggle with synchronized ARIA", async ({ page }) => {
    await page.goto("/");

    const layout = await page.evaluate(() => {
      const scene = document.querySelector(".machine-scene");
      const strip = document.querySelector(".mobile-machine-strip");
      const modules = Array.from(document.querySelectorAll(".mobile-module")).map((module) => {
        const rect = module.getBoundingClientRect();

        return {
          top: rect.top,
          bottom: rect.bottom,
          centerX: rect.left + rect.width / 2,
        };
      });
      const sceneDisplay = scene ? window.getComputedStyle(scene).display : "";
      const stripDisplay = strip ? window.getComputedStyle(strip).display : "";
      const viewportMid = window.innerWidth / 2;
      const bands = modules.map((module) => {
        if (module.centerX < viewportMid - 24) {
          return "left";
        }

        if (module.centerX > viewportMid + 24) {
          return "right";
        }

        return "center";
      });

      let topIncreasing = true;
      for (let index = 1; index < modules.length; index += 1) {
        if (modules[index].top < modules[index - 1].bottom - 1) {
          topIncreasing = false;
          break;
        }
      }

      let directionChanges = 0;
      for (let index = 1; index < bands.length; index += 1) {
        if (bands[index] !== bands[index - 1]) {
          directionChanges += 1;
        }
      }

      return {
        sceneDisplay,
        stripDisplay,
        bands,
        centerRange: Math.max(...modules.map((module) => module.centerX)) - Math.min(...modules.map((module) => module.centerX)),
        directionChanges,
        topIncreasing,
      };
    });

    expect(layout.sceneDisplay).toBe("none");
    expect(layout.stripDisplay).not.toBe("none");
    expect(layout.topIncreasing).toBe(true);
    expect(layout.bands).toContain("left");
    expect(layout.bands).toContain("center");
    expect(layout.bands).toContain("right");
    expect(layout.centerRange).toBeGreaterThan(60);
    expect(layout.directionChanges).toBeGreaterThanOrEqual(3);

    const newsButton = page.locator(".module-news .mobile-module-toggle");
    const newsDrawer = page.locator("#mobile-drawer-news");

    await newsButton.click();
    expect(await newsButton.getAttribute("aria-expanded")).toBe("true");
    expect(await newsDrawer.getAttribute("aria-hidden")).toBe("false");
    await expect(newsDrawer).toBeVisible();

    await page.keyboard.press("Escape");
    expect(await newsButton.getAttribute("aria-expanded")).toBe("false");
    expect(await newsDrawer.getAttribute("aria-hidden")).toBe("true");
    await expect(newsDrawer).toBeHidden();
    await expect(newsButton).toBeFocused();
  });

  test("resize mode switches keep panel and drawer state synchronized", async ({ page }) => {
    await page.goto("/");

    const todoButton = page.locator(".module-todos .mobile-module-toggle");
    const todoDrawer = page.locator("#mobile-drawer-todos");
    await todoButton.click();
    await expect(todoDrawer).toBeVisible();

    await page.setViewportSize({ width: 1366, height: 900 });

    expect(await todoButton.getAttribute("aria-expanded")).toBe("false");
    expect(await todoDrawer.getAttribute("aria-hidden")).toBe("true");
    await expect(todoDrawer).toBeHidden();

    await page.click(".hotspot-workbench");
    expect((await panelState(page, "workbench")).hidden).toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });

    expect((await panelState(page, "workbench")).hidden).toBe(true);
    expect(await hotspotExpanded(page, "workbench")).toBe("false");
  });
});

test.describe("reduced motion + asset fallback", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("reduced motion disables animated scene mode", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const sceneFlags = await page.$eval(".machine-scene", (scene) => ({
      isReducedMotion: scene.classList.contains("is-reduced-motion"),
      isAnimated: scene.classList.contains("is-animated"),
    }));

    expect(sceneFlags.isReducedMotion).toBe(true);
    expect(sceneFlags.isAnimated).toBe(false);
  });

  test("missing non-critical assets preserve interaction and avoid fatal runtime errors", async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.route("**/assets/spiral-machine-base.png", (route) => route.abort());
    await page.goto("/");

    await page.click(".hotspot-calendar");
    const calendarState = await panelState(page, "calendar");
    expect(calendarState.hidden).toBe(false);

    const fatalConsoleErrors = consoleErrors.filter(
      (line) => !/Failed to load resource|ERR_FAILED|spiral-machine-base\.png/i.test(line)
    );

    expect(pageErrors).toEqual([]);
    expect(fatalConsoleErrors).toEqual([]);
  });
});
