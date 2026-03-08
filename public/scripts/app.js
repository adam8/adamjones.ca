(function () {
  var MOBILE_MODE_QUERY = "(max-width: 62rem)";
  var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  function detectMode() {
    if (window.machineStateApi && typeof window.machineStateApi.getModeFromViewport === "function") {
      return window.machineStateApi.getModeFromViewport();
    }

    return window.matchMedia(MOBILE_MODE_QUERY).matches ? "mobile" : "desktop";
  }

  function updateMode() {
    var experience = document.querySelector(".machine-experience");
    var nextMode = detectMode();

    if (!experience) {
      return nextMode;
    }

    if (window.machineStateApi) {
      window.machineStateApi.setMode(nextMode);
    } else if (window.machineState) {
      window.machineState.mode = nextMode;
    }

    experience.setAttribute("data-mode", nextMode);
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

      button.addEventListener("touchstart", function () {
        if (window.panelController) {
          window.panelController.setHoveredModule(moduleId);
        }
      });

      button.addEventListener("click", function (event) {
        event.preventDefault();

        if (window.panelController) {
          window.panelController.activateFromButton(button);
        }
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

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.classList.add("js");
    updateMode();
    updateMotionMode();

    if (window.panelController) {
      window.panelController.applyMode();
    }

    bindHotspots();
    bindGlobalShortcuts();
    bindMotionPreference();

    window.addEventListener("resize", function () {
      var beforeMode = window.machineState ? window.machineState.mode : null;
      var afterMode = updateMode();

      if (beforeMode !== afterMode && window.panelController) {
        window.panelController.applyMode();
      }
    });
  });
})();
