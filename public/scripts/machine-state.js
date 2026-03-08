(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  window.machineState = {
    mode: "desktop",
    activePanel: null,
    reducedMotion: reduceMotionQuery.matches,
    hoveredModule: null,
  };
})();
