(() => {
  "use strict";

  const hero =
    document.querySelector(".si-revelation-hero");

  if (!hero) {
    return;
  }

  const slides =
    Array.from(
      hero.querySelectorAll(".si-hero-slide")
    );

  if (!slides.length) {
    return;
  }

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  let current = 0;
  let rotationTimer = null;

  function showSlide(index) {

    slides.forEach((slide, i) => {

      slide.classList.toggle(
        "is-active",
        i === index
      );

    });

    current = index;
  }

  function nextSlide() {

    const next =
      (current + 1) % slides.length;

    showSlide(next);
  }

  function beginRotation() {

    if (slides.length < 2) {
      return;
    }

    if (rotationTimer) {
      clearInterval(rotationTimer);
    }

    rotationTimer =
      window.setInterval(
        nextSlide,
        7000
      );
  }

  showSlide(0);

  if (reducedMotion) {

    hero.classList.add(
      "is-photo-revealed",
      "is-live"
    );

    beginRotation();

    return;
  }

  /*
    0.0s  fondo blanco
    0.2s  nace el logotipo en la neblina
    3.5s  comienza a aparecer la fotografía real
    5.9s  desaparece el símbolo abstracto
    6.1s  aparece texto
    9.0s  empieza la rotación de interiores
  */

  window.setTimeout(
    () => {
      hero.classList.add(
        "is-photo-revealed"
      );
    },
    3500
  );

  window.setTimeout(
    () => {
      hero.classList.add(
        "is-live"
      );
    },
    5900
  );

  window.setTimeout(
    () => {
      beginRotation();
    },
    9000
  );

  document.addEventListener(
    "visibilitychange",
    () => {

      if (document.hidden) {

        if (rotationTimer) {
          clearInterval(rotationTimer);
          rotationTimer = null;
        }

        return;
      }

      if (hero.classList.contains("is-live")) {
        beginRotation();
      }
    }
  );
})();