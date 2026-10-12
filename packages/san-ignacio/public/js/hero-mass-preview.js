(() => {
  "use strict";

  /* SAN IGNACIO HERO POLISH V179 */

  const hero =
    document.querySelector(".si-revelation-hero");

  if (!hero) {
    return;
  }


  /* --------------------------------------------------------
     HORARIOS
     -------------------------------------------------------- */

  const previous =
    document.querySelector(".si-mass-preview");

  if (previous) {
    previous.remove();
  }


  const block =
    document.createElement("aside");

  block.className =
    "si-mass-preview";

  block.setAttribute(
    "aria-label",
    "Horarios de misa"
  );


  block.innerHTML = `
    <div class="si-mass-preview__row">

      <h2 class="si-mass-preview__title">
        Horarios de misa
      </h2>

      <div class="si-mass-preview__grid">

        <div class="si-mass-preview__day">
          <strong>Lunes a viernes</strong>
          <span>7:30 · 13:30 · 18:30</span>
        </div>

        <div class="si-mass-preview__day">
          <strong>Sábado</strong>
          <span>7:30 · 18:30</span>
        </div>

        <div class="si-mass-preview__day">
          <strong>Domingo</strong>
          <span>9:00 · 10:30 · 12:00 · 13:30 · 18:30</span>
        </div>

      </div>

      <a
        class="si-mass-preview__link"
        href="/vida-liturgica"
      >
        Horarios de misa
      </a>

    </div>
  `;


  hero.appendChild(block);


  /* --------------------------------------------------------
     BOTON HORARIOS
     Usa el router existente cuando sea posible.
     -------------------------------------------------------- */

  const scheduleLink =
    block.querySelector(
      ".si-mass-preview__link"
    );


  if (scheduleLink) {

    scheduleLink.addEventListener(
      "click",
      (event) => {

        const navCandidates =
          Array.from(
            document.querySelectorAll(
              '.primary-nav a'
            )
          );


        const navLink =
          navCandidates.find(
            (candidate) => {

              const href =
                candidate.getAttribute("href") || "";

              return (
                href === "#liturgia" ||
                href === "/vida-liturgica" ||
                href.endsWith("/vida-liturgica")
              );
            }
          );


        if (navLink) {

          event.preventDefault();

          navLink.click();

          return;
        }


        const target =
          document.querySelector(
            "#liturgia"
          );


        if (target) {

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );
  }


  /* --------------------------------------------------------
     MENU MOVIL
     -------------------------------------------------------- */

  const menuControl =
    document.querySelector(
      ".nav-toggle"
    );


  if (menuControl) {

    menuControl.classList.add(
      "si-menu-emphasis"
    );
  }


  /* --------------------------------------------------------
     HERO:
     NINGUNA FOTO ABRE GALERIA.
     No afecta el boton de horarios.
     No afecta la navegacion superior.
     -------------------------------------------------------- */

  const heroStage =
    hero.querySelector(
      ".si-hero-stage"
    );


  if (heroStage) {

    heroStage
      .querySelectorAll(
        'a[href*="galeria"], a[href*="gallery"]'
      )
      .forEach(
        (anchor) => {

          anchor.removeAttribute(
            "href"
          );

          anchor.removeAttribute(
            "target"
          );

          anchor.setAttribute(
            "aria-disabled",
            "true"
          );

          anchor.setAttribute(
            "tabindex",
            "-1"
          );
        }
      );


    heroStage.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        event.stopImmediatePropagation();
      },
      true
    );


    heroStage.addEventListener(
      "auxclick",
      (event) => {

        event.preventDefault();

        event.stopImmediatePropagation();
      },
      true
    );


    heroStage.addEventListener(
      "dragstart",
      (event) => {

        if (
          event.target.closest(
            ".si-hero-slide"
          )
        ) {
          event.preventDefault();
        }
      },
      true
    );
  }
})();