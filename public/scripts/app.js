(function () {
  var MOBILE_MODE_QUERY = "(max-width: 62rem)";
  var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  function detectMode() {
    if (window.machineStateApi && typeof window.machineStateApi.getModeFromViewport === "function") {
      return window.machineStateApi.getModeFromViewport();
    }

    return window.matchMedia(MOBILE_MODE_QUERY).matches ? "mobile" : "desktop";
  }

  function setMode(mode) {
    if (window.machineStateApi) {
      window.machineStateApi.setMode(mode);
      return;
    }

    if (window.machineState) {
      window.machineState.mode = mode;
    }
  }

  function setActivePanel(panelId) {
    if (window.machineStateApi) {
      window.machineStateApi.setActivePanel(panelId);
      return;
    }

    if (window.machineState) {
      window.machineState.activePanel = panelId;
    }
  }

  function getActivePanel() {
    if (window.machineState) {
      return window.machineState.activePanel;
    }

    return null;
  }

  function updateMode() {
    var experience = document.querySelector(".machine-experience");
    var nextMode = detectMode();

    setMode(nextMode);

    if (experience) {
      experience.setAttribute("data-mode", nextMode);
    }

    return nextMode;
  }

  function detectReducedMotion() {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  function updateMotionMode() {
    var scene = document.querySelector(".machine-scene");
    var isReduced = detectReducedMotion();

    if (window.machineStateApi) {
      window.machineStateApi.setReducedMotion(isReduced);
    } else if (window.machineState) {
      window.machineState.reducedMotion = isReduced;
    }

    if (!scene) {
      return;
    }

    scene.classList.toggle("is-animated", !isReduced);
    scene.classList.toggle("is-reduced-motion", isReduced);
  }

  function getExistingDecorativeAsset(container) {
    var children = container ? container.children : [];
    var index;

    for (index = 0; index < children.length; index += 1) {
      if (children[index].classList.contains("asset-image")) {
        return children[index];
      }
    }

    return null;
  }

  function setAssetState(element, isReady) {
    if (!element) {
      return;
    }

    element.classList.toggle("asset-ready", isReady);
    element.classList.toggle("asset-missing", !isReady);
  }

  function loadDecorativeAsset(container, source) {
    var image = getExistingDecorativeAsset(container);

    if (!container || !source) {
      return;
    }

    if (image) {
      return;
    }

    image = document.createElement("img");
    image.className = "asset-image";
    image.alt = "";
    image.decoding = "async";
    image.loading = container.classList.contains("layer") ? "eager" : "lazy";
    image.width = container.classList.contains("layer") ? 1280 : 1600;
    image.height = container.classList.contains("layer") ? 1600 : 900;
    image.setAttribute("aria-hidden", "true");

    image.addEventListener("load", function () {
      setAssetState(container, true);
    });

    image.addEventListener("error", function () {
      if (image.parentNode === container) {
        container.removeChild(image);
      }

      setAssetState(container, false);
    });

    container.classList.add("asset-shell");
    container.appendChild(image);
    image.src = source;
  }

  function loadInlineAsset(image, source) {
    var figure;

    if (!image || !source || image.getAttribute("src")) {
      return;
    }

    figure = image.closest("figure");

    image.classList.add("asset-inline");

    image.addEventListener("load", function () {
      setAssetState(image, true);
      setAssetState(figure, true);
    });

    image.addEventListener("error", function () {
      image.removeAttribute("src");
      setAssetState(image, false);
      setAssetState(figure, false);
    });

    image.src = source;
  }

  function initializeAssets() {
    var assets = document.querySelectorAll("[data-asset]");

    assets.forEach(function (node) {
      var source = node.getAttribute("data-asset");

      if (!source) {
        return;
      }

      if (node.tagName === "IMG") {
        loadInlineAsset(node, source);
        return;
      }

      loadDecorativeAsset(node, source);
    });
  }

  function bindHotspots() {
    var buttons = document.querySelectorAll(".hotspot");

    buttons.forEach(function (button) {
      var moduleId = button.getAttribute("data-target");

      button.addEventListener("mouseenter", function () {
        if (window.panelController) {
          window.panelController.setHoveredModule(moduleId);
        }
      });

      button.addEventListener("mouseleave", function () {
        if (window.panelController) {
          window.panelController.clearHoveredModule();
        }
      });

      button.addEventListener("focus", function () {
        if (window.panelController) {
          window.panelController.setHoveredModule(moduleId);
        }
      });

      button.addEventListener("blur", function () {
        if (window.panelController) {
          window.panelController.clearHoveredModule();
        }
      });

      button.addEventListener(
        "touchstart",
        function () {
          if (window.panelController) {
            window.panelController.setHoveredModule(moduleId);
          }
        },
        { passive: true }
      );

      button.addEventListener("click", function (event) {
        event.preventDefault();

        if (window.panelController) {
          window.panelController.activateFromButton(button);
        }
      });
    });
  }

  function getMobileDrawerForButton(button) {
    if (!button) {
      return null;
    }

    var drawerId = button.getAttribute("aria-controls");
    if (!drawerId) {
      return null;
    }

    return document.getElementById(drawerId);
  }

  function setMobileDrawerState(button, drawer, shouldOpen) {
    var moduleCard = button ? button.closest(".mobile-module") : null;

    if (!button || !drawer) {
      return;
    }

    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    drawer.hidden = !shouldOpen;
    drawer.setAttribute("aria-hidden", shouldOpen ? "false" : "true");

    if (moduleCard) {
      moduleCard.classList.toggle("is-open", shouldOpen);
    }

    if (shouldOpen) {
      setActivePanel(drawer.id);
      return;
    }

    if (getActivePanel() === drawer.id) {
      setActivePanel(null);
    }
  }

  function closeMobileDrawers() {
    var toggles = document.querySelectorAll(".mobile-module-toggle");

    toggles.forEach(function (button) {
      var drawer = getMobileDrawerForButton(button);
      if (!drawer) {
        return;
      }

      setMobileDrawerState(button, drawer, false);
    });
  }

  function bindMobileStripModules() {
    var toggles = document.querySelectorAll(".mobile-module-toggle");

    toggles.forEach(function (button) {
      button.addEventListener("click", function (event) {
        var drawer = getMobileDrawerForButton(button);

        event.preventDefault();

        if (!drawer) {
          return;
        }

        setMobileDrawerState(button, drawer, drawer.hidden);
      });
    });
  }

  function bindGlobalShortcuts() {
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }

      if (window.panelController) {
        window.panelController.closeAllPanels();
      }

      closeMobileDrawers();
    });
  }

  function bindMotionPreference() {
    var mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionMode);
      return;
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(updateMotionMode);
    }
  }

  function bindResizeModeHandling() {
    window.addEventListener("resize", function () {
      var previousMode = window.machineState ? window.machineState.mode : null;
      var nextMode = updateMode();

      if (previousMode !== nextMode && window.panelController) {
        window.panelController.applyMode();
        closeMobileDrawers();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.classList.add("js");
    initializeAssets();
    updateMode();
    updateMotionMode();

    if (window.panelController) {
      window.panelController.applyMode();
    }

    closeMobileDrawers();
    bindHotspots();
    bindMobileStripModules();
    bindGlobalShortcuts();
    bindMotionPreference();
    bindResizeModeHandling();
  });
})();
