(function () {
  const cards = document.querySelectorAll("[data-focus-card]");
  if (!cards.length) return;

  for (const card of cards) {
    const front = card.querySelector('[data-focus-face="front"]');
    const back = card.querySelector('[data-focus-face="back"]');
    syncCardState(card, front, back, false);

    card.addEventListener("click", () => {
      const flipped = !card.classList.contains("is-flipped");
      syncCardState(card, front, back, flipped);
    });
  }

  function syncCardState(card, front, back, flipped) {
    card.classList.toggle("is-flipped", flipped);
    card.setAttribute("aria-pressed", flipped ? "true" : "false");
    front?.setAttribute("aria-hidden", flipped ? "true" : "false");
    back?.setAttribute("aria-hidden", flipped ? "false" : "true");
  }
})();
