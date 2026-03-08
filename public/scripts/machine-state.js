(function () {
  var MOBILE_MODE_QUERY = "(max-width: 62rem)";
  var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  var reduceMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  var subscribers = [];

  var state = {
    mode: getModeFromViewport(),
    activePanel: null,
    reducedMotion: reduceMotionQuery.matches,
    hoveredModule: null,
  };

  function getModeFromViewport() {
    return window.matchMedia(MOBILE_MODE_QUERY).matches ? "mobile" : "desktop";
  }

  function getState() {
    return state;
  }

  function notifySubscribers() {
    subscribers.forEach(function (callback) {
      callback(state);
    });
  }

  function setState(patch) {
    var hasChanged = false;

    Object.keys(patch).forEach(function (key) {
      if (state[key] === patch[key]) {
        return;
      }

      state[key] = patch[key];
      hasChanged = true;
    });

    if (hasChanged) {
      notifySubscribers();
    }
  }

  function setMode(mode) {
    setState({ mode: mode });
  }

  function setActivePanel(panelId) {
    setState({ activePanel: panelId || null });
  }

  function setHoveredModule(moduleId) {
    setState({ hoveredModule: moduleId || null });
  }

  function setReducedMotion(isReduced) {
    setState({ reducedMotion: Boolean(isReduced) });
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      return function () {};
    }

    subscribers.push(callback);

    return function unsubscribe() {
      subscribers = subscribers.filter(function (item) {
        return item !== callback;
      });
    };
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
    getState: getState,
    setMode: setMode,
    setActivePanel: setActivePanel,
    setHoveredModule: setHoveredModule,
    setReducedMotion: setReducedMotion,
    subscribe: subscribe,
  };
})();
