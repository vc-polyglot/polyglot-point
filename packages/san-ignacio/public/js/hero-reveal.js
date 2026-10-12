(() => {
  "use strict";

  /* SAN IGNACIO HERO REVELATION V183B */

  const hero =
    document.querySelector(
      ".si-revelation-hero"
    );

  if (!hero) {
    return;
  }

  const slides =
    Array.from(
      hero.querySelectorAll(
        ".si-hero-slide"
      )
    );

  if (!slides.length) {
    return;
  }

  /*
    LA NIEBLA SE VA.

    No se oculta parcialmente:
    se elimina del DOM.
  */

  hero
    .querySelectorAll(
      ".si-hero-mist"
    )
    .forEach(
      (mist) => mist.remove()
    );

  /*
    ESTE ES EL BLANCO REAL ORIGINAL
    QUE YA EXISTE EN EL HERO.
  */

  const white =
    hero.querySelector(
      ".si-hero-white"
    );

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  let current = 0;
  let rotationTimer = null;


  function showSlide(index) {

    slides.forEach(
      (slide, i) => {

        slide.classList.toggle(
          "is-active",
          i === index
        );
      }
    );

    current = index;
  }


  function nextSlide() {

    const next =
      (current + 1) %
      slides.length;

    showSlide(next);
  }


  function beginRotation() {

    if (slides.length < 2) {
      return;
    }

    if (rotationTimer) {

      clearInterval(
        rotationTimer
      );
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
      "is-white-gone",
      "is-live"
    );

    beginRotation();

    return;
  }


  /*
    V183B

    0.00 s
    Blanco sólido.

    0.15 - 3.55 s aprox.
    Las cruces aparecen.

    3.25 s
    La fotografía queda preparada DEBAJO,
    pero el blanco NO desaparece todavía.

    4.75 s
    Empieza el único desvanecimiento.

    BLANCO + CRUCES
    MISMO INICIO
    MISMO PERFIL
    MISMA DURACIÓN

    4.75 - 7.15 s
    Fade de 2.4 segundos.

    7.20 s
    Entra estado live/texto.

    10.20 s
    Carrusel.
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

      const symbol =
        hero.querySelector(
          ".si-hero-symbol"
        );

      const duration =
        2400;

      const easing =
        "cubic-bezier(.22,.61,.36,1)";

      const animations =
        [];


      /*
        PERFIL ÚNICO DE DESVANECIMIENTO.
      */

      const frames =
        [
          {
            opacity: 1,
            offset: 0
          },
          {
            opacity: .93,
            offset: .16
          },
          {
            opacity: .80,
            offset: .34
          },
          {
            opacity: .61,
            offset: .52
          },
          {
            opacity: .39,
            offset: .70
          },
          {
            opacity: .18,
            offset: .86
          },
          {
            opacity: 0,
            offset: 1
          }
        ];


      /*
        FONDO BLANCO
      */

      if (white) {

        const computed =
          Number.parseFloat(
            window
              .getComputedStyle(white)
              .opacity
          );

        const start =
          Number.isFinite(computed)
            ? computed
            : 1;

        animations.push(
          white.animate(
            frames.map(
              (frame) => ({
                opacity:
                  start *
                  frame.opacity,

                offset:
                  frame.offset
              })
            ),
            {
              duration,
              easing,
              fill:
                "forwards"
            }
          )
        );
      }


      /*
        CRUCES
      */

      if (symbol) {

        const computed =
          Number.parseFloat(
            window
              .getComputedStyle(symbol)
              .opacity
          );

        const start =
          Number.isFinite(computed)
            ? computed
            : 1;

        animations.push(
          symbol.animate(
            [
              {
                opacity: start,
                filter: "blur(0px)",
                offset: 0
              },
              {
                opacity: start * .93,
                filter: "blur(.4px)",
                offset: .16
              },
              {
                opacity: start * .80,
                filter: "blur(.9px)",
                offset: .34
              },
              {
                opacity: start * .61,
                filter: "blur(1.7px)",
                offset: .52
              },
              {
                opacity: start * .39,
                filter: "blur(2.9px)",
                offset: .70
              },
              {
                opacity: start * .18,
                filter: "blur(4.6px)",
                offset: .86
              },
              {
                opacity: 0,
                filter: "blur(7px)",
                offset: 1
              }
            ],
            {
              duration,
              easing,
              fill:
                "forwards"
            }
          )
        );
      }


      /*
        SOLO AL TERMINAR AMBOS
        SE APLICAN LOS ESTADOS FINALES.
      */

      Promise
        .all(
          animations.map(
            (animation) =>
              animation.finished.catch(
                () => null
              )
          )
        )
        .then(
          () => {

            hero.classList.add(
              "is-logo-gone",
              "is-white-gone"
            );

            animations.forEach(
              (animation) =>
                animation.cancel()
            );
          }
        );

    },
    4750
  );


  /*
    4.75 + 2.40 = 7.15 s
    Dejamos 50 ms de margen.
  */

  window.setTimeout(
    () => {

      hero.classList.add(
        "is-live"
      );
    },
    7200
  );


  window.setTimeout(
    () => {

      beginRotation();
    },
    10200
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (document.hidden) {

        if (rotationTimer) {

          clearInterval(
            rotationTimer
          );

          rotationTimer =
            null;
        }

        return;
      }

      if (
        hero.classList.contains(
          "is-live"
        )
      ) {

        beginRotation();
      }
    }
  );
})();
