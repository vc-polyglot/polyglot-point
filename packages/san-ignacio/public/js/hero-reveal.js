(() => {
  "use strict";

  /* SAN IGNACIO HERO REVELATION V174 */

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
      "is-logo-gone",
      "is-live"
    );

    beginRotation();

    return;
  }

  /*
    V174

    0.0 s
    Fondo blanco.

    0.2 - 3.2 s
    Cruces abstractas emergen.

    3.25 s
    Empieza a revelarse la fotografía real.

    4.75 s
    El logo abstracto sigue vivo 1 segundo más.
    Aquí comienza su desvanecimiento.

    4.75 - 6.15 s
    Fade suave del logo abstracto.

    ~6.15 s
    Logo completamente fuera.

    6.4 s
    Texto visible EN EL MISMO SITIO.

    9.4 s
    Comienza carrusel interior.
  */

  window.setTimeout(
    () => {
      hero.classList.add(
        "is-photo-revealed"
      );
    },
    3250
  );

  window.setTimeout(
    () => {
      hero.classList.add(
        "is-logo-gone"
      );
    },
    4750
  );

  window.setTimeout(
    () => {
      hero.classList.add(
        "is-live"
      );
    },
    6400
  );

  window.setTimeout(
    () => {
      beginRotation();
    },
    9400
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