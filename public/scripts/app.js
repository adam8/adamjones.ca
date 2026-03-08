(function () {
  function updateMode() {
    var experience = document.querySelector(".machine-experience");
    if (!experience || !window.machineState) {
      return;
    }

    window.machineState.mode = window.matchMedia("(max-width: 48rem)").matches
      ? "mobile"
      : "desktop";
    experience.setAttribute("data-mode", window.machineState.mode);
  }

  function bindHotspots() {
    var buttons = document.querySelectorAll(".hotspot");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (window.panelController) {
          window.panelController.focusModuleSection(button);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.classList.add("js");
    updateMode();
    bindHotspots();
    window.addEventListener("resize", updateMode);
  });
})();
