(function () {
  var MOBILE_MODE_QUERY = "(max-width: 62rem)";

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

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.classList.add("js");
    updateMode();

    if (window.panelController) {
      window.panelController.applyMode();
    }

    bindHotspots();
    bindGlobalShortcuts();

    window.addEventListener("resize", function () {
      var beforeMode = window.machineState ? window.machineState.mode : null;
      var afterMode = updateMode();

      if (beforeMode !== afterMode && window.panelController) {
        window.panelController.applyMode();
      }
    });
  });
})();
