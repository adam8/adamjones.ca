(function () {
  function getSectionFromButton(button) {
    if (!button) {
      return null;
    }

    var sectionId = button.getAttribute("data-section-id");
    if (!sectionId) {
      return null;
    }

    return document.getElementById(sectionId);
  }

  function focusModuleSection(button) {
    var section = getSectionFromButton(button);
    if (!section) {
      return;
    }

    section.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.panelController = {
    focusModuleSection: focusModuleSection,
  };
})();
