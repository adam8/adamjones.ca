(function () {
  var OPEN_CLASS_PREFIX = "is-open-";
  var HOVER_CLASS_PREFIX = "is-hovering-";
  var MODULE_IDS = ["sketch", "workbench", "todos", "news", "calendar", "findme"];
  var lastDesktopTrigger = null;

  function getScene() {
    return document.querySelector(".machine-scene");
  }

  function getHotspots() {
    return Array.prototype.slice.call(document.querySelectorAll(".hotspot"));
  }

  function getPanels() {
    return Array.prototype.slice.call(document.querySelectorAll(".panel-layer .panel"));
  }

  function getMode() {
    if (window.machineState) {
      return window.machineState.mode;
    }

    return "desktop";
  }

  function getModuleIdFromButton(button) {
    if (!button) {
      return null;
    }

    return button.getAttribute("data-target");
  }

  function getPanelForButton(button) {
    if (!button) {
      return null;
    }

    var panelId = button.getAttribute("aria-controls");
    if (!panelId) {
      return null;
    }

    return document.getElementById(panelId);
  }

  function setButtonExpanded(button, isExpanded) {
    if (!button) {
      return;
    }

    button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  }

  function setPanelVisibility(panel, isOpen) {
    if (!panel) {
      return;
    }

    panel.hidden = !isOpen;
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    panel.classList.toggle("is-open", isOpen);
  }

  function clearSceneModuleClasses(scene, prefix) {
    if (!scene) {
      return;
    }

    MODULE_IDS.forEach(function (moduleId) {
      scene.classList.remove(prefix + moduleId);
    });
  }

  function updateActivePanel(panelId) {
    if (window.machineStateApi) {
      window.machineStateApi.setActivePanel(panelId);
      return;
    }

    if (window.machineState) {
      window.machineState.activePanel = panelId;
    }
  }

  function updateHoveredModule(moduleId) {
    if (window.machineStateApi) {
      window.machineStateApi.setHoveredModule(moduleId);
      return;
    }

    if (window.machineState) {
      window.machineState.hoveredModule = moduleId;
    }
  }

  function focusPanel(panel) {
    focusElement(panel);
  }

  function focusElement(element) {
    if (!element || typeof element.focus !== "function") {
      return;
    }

    element.focus({ preventScroll: true });
  }

  function shouldRestoreFocus(options) {
    return Boolean(options && options.restoreFocus);
  }

  function closeAllPanels(options) {
    var scene = getScene();
    var restoreFocus = shouldRestoreFocus(options);
    var focusTarget = restoreFocus ? lastDesktopTrigger : null;

    getPanels().forEach(function (panel) {
      setPanelVisibility(panel, false);
    });

    getHotspots().forEach(function (button) {
      setButtonExpanded(button, false);
    });

    clearSceneModuleClasses(scene, OPEN_CLASS_PREFIX);
    updateActivePanel(null);

    if (restoreFocus && focusTarget && document.contains(focusTarget)) {
      focusElement(focusTarget);
    }
  }

  function closeAllPanelsWithFocusRestore() {
    closeAllPanels({ restoreFocus: true });
  }

  function isPanelOpen(panel) {
    return Boolean(panel && !panel.hidden);
  }

  function openDesktopPanel(button) {
    var scene = getScene();
    var panel = getPanelForButton(button);
    var moduleId = getModuleIdFromButton(button);

    if (!scene || !panel || !moduleId) {
      return;
    }

    lastDesktopTrigger = button;
    closeAllPanels();
    setPanelVisibility(panel, true);
    setButtonExpanded(button, true);
    scene.classList.add(OPEN_CLASS_PREFIX + moduleId);
    updateActivePanel(panel.id);
    focusPanel(panel);
  }

  function toggleMobilePanel(button) {
    var scene = getScene();
    var panel = getPanelForButton(button);
    var moduleId = getModuleIdFromButton(button);

    if (!scene || !panel || !moduleId) {
      return;
    }

    var shouldOpen = !isPanelOpen(panel);

    setPanelVisibility(panel, shouldOpen);
    setButtonExpanded(button, shouldOpen);
    scene.classList.toggle(OPEN_CLASS_PREFIX + moduleId, shouldOpen);

    if (shouldOpen) {
      updateActivePanel(panel.id);
      focusPanel(panel);
      return;
    }

    if (window.machineState && window.machineState.activePanel === panel.id) {
      updateActivePanel(null);
    }
  }

  function activateFromButton(button) {
    if (getMode() === "mobile") {
      toggleMobilePanel(button);
      return;
    }

    openDesktopPanel(button);
  }

  function setHoveredModule(moduleId) {
    var scene = getScene();

    if (!scene) {
      return;
    }

    clearSceneModuleClasses(scene, HOVER_CLASS_PREFIX);

    if (moduleId) {
      scene.classList.add(HOVER_CLASS_PREFIX + moduleId);
    }

    updateHoveredModule(moduleId || null);
  }

  function clearHoveredModule() {
    setHoveredModule(null);
  }

  function applyMode() {
    closeAllPanels();
    clearHoveredModule();
  }

  window.panelController = {
    activateFromButton: activateFromButton,
    closeAllPanels: closeAllPanels,
    closeAllPanelsWithFocusRestore: closeAllPanelsWithFocusRestore,
    setHoveredModule: setHoveredModule,
    clearHoveredModule: clearHoveredModule,
    applyMode: applyMode,
  };
})();
