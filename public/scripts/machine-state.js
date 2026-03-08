(function () {
  var MOBILE_MODE_QUERY = "(max-width: 62rem)";
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function getModeFromViewport() {
    return window.matchMedia(MOBILE_MODE_QUERY).matches ? "mobile" : "desktop";
  }

  var state = {
    mode: getModeFromViewport(),
    activePanel: null,
    reducedMotion: reduceMotionQuery.matches,
    hoveredModule: null,
  };

  function setMode(mode) {
    state.mode = mode;
  }

  function setActivePanel(panelId) {
    state.activePanel = panelId;
  }

  function setHoveredModule(moduleId) {
    state.hoveredModule = moduleId;
  }

  function setReducedMotion(isReduced) {
    state.reducedMotion = isReduced;
  }

  if (typeof reduceMotionQuery.addEventListener === "function") {
    reduceMotionQuery.addEventListener("change", function (event) {
      setReducedMotion(event.matches);
    });
  } else if (typeof reduceMotionQuery.addListener === "function") {
    reduceMotionQuery.addListener(function (event) {
      setReducedMotion(event.matches);
    });
  }

  window.machineState = state;
  window.machineStateApi = {
    getModeFromViewport: getModeFromViewport,
    setMode: setMode,
    setActivePanel: setActivePanel,
    setHoveredModule: setHoveredModule,
    setReducedMotion: setReducedMotion,
  };
})();
