(() => {
  "use strict";

  const hero = document.querySelector(".si-revelation-hero");
  const copy = hero?.querySelector(".si-hero-copy");

  if (!hero || !copy) return;

  document.querySelector(".si-mass-preview")?.remove();
  document.querySelector(".si-hero-mass-button")?.remove();

  const link = document.createElement("a");

  link.className = "si-hero-mass-button";
  link.href = "/vida-liturgica#horarios-misa";
  link.innerHTML = `
    <span>Horarios de misa</span>
    <b aria-hidden="true">→</b>
  `;

  copy.appendChild(link);
})();
