const scheduleGrid = document.querySelector("#schedule-grid");
const pastoralCard = document.querySelector("#pastoral-card");
const notices = document.querySelector("#notices");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#primary-nav");

navToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function youtubeEmbedUrl(value) {
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    let videoId = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else {
        const parts = parsed.pathname.split("/").filter(Boolean);

        if (["embed", "shorts", "live"].includes(parts[0])) {
          videoId = parts[1] || null;
        }
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return "";
    }

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return "";
  }
}

function formatConcertDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(value));
}

async function loadMusic() {
  const musicContainer = document.querySelector("#music-items-public");
  const concertContainer = document.querySelector("#concerts-public");

  if (!musicContainer || !concertContainer) return;

  try {
    const response = await fetch("/api/music", {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar la sección de música.");
    }

    const { items, concerts } = await response.json();

    if (concerts?.length) {
      concertContainer.innerHTML = concerts.map((concert) => `
        <article class="concert-public-item">
          <strong>${escapeHtml(concert.title)}</strong>
          <span>${escapeHtml(formatConcertDate(concert.starts_at))}</span>

          ${concert.location
            ? `<small>${escapeHtml(concert.location)}</small>`
            : ""
          }

          ${concert.description
            ? `<p>${escapeHtml(concert.description)}</p>`
            : ""
          }
        </article>
      `).join("");
    } else {
      concertContainer.innerHTML =
        `<p class="music-public-empty">No hay conciertos anunciados por el momento.</p>`;
    }

    if (items?.length) {
      musicContainer.innerHTML = items.map((item) => `
        <article class="music-public-item">
          <span class="music-type">${escapeHtml({
            recording: "Grabación",
            repertoire: "Repertorio",
            article: "Artículo"
          }[item.item_type] || item.item_type)}</span>

          <strong>${escapeHtml(item.title)}</strong>

          ${item.description
            ? `<p>${escapeHtml(item.description)}</p>`
            : ""
          }

          ${item.youtube_url
            ? `
              <a
                class="music-youtube-link"
                href="${escapeHtml(item.youtube_url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver en YouTube →
              </a>
            `
            : ""
          }
        </article>
      `).join("");
    } else {
      musicContainer.innerHTML =
        `<p class="music-public-empty">El contenido musical aparecerá aquí próximamente.</p>`;
    }

  } catch (error) {
    console.error(error);

    concertContainer.innerHTML =
      `<p class="music-public-empty">No fue posible cargar la agenda.</p>`;

    musicContainer.innerHTML =
      `<p class="music-public-empty">No fue posible cargar el contenido musical.</p>`;
  }
}

async function loadInstitutional() {
  try {
    const response = await fetch("/api/institutional", {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el contenido institucional.");
    }

    const data = await response.json();

    const about = data.sections?.find(
      (section) => section.slug === "about"
    );

    const spirituality = data.sections?.find(
      (section) => section.slug === "spirituality"
    );

    if (about) {
      const eyebrow = document.querySelector("#about-eyebrow");
      const title = document.querySelector("#about-title");
      const body = document.querySelector("#about-body");
      const image = document.querySelector("#about-image");

      if (eyebrow) {
        eyebrow.textContent = about.eyebrow || "Arquitectura y comunidad";
      }

      if (title) {
        title.textContent = about.title;
      }

      if (body) {
        body.textContent = about.body || "";
      }

      if (image && about.image_url) {
        image.classList.add("has-image");

        image.innerHTML = `
          <img
            src="${escapeHtml(about.image_url)}"
            alt="${escapeHtml(about.image_alt || about.title)}"
            loading="lazy"
          >
        `;
      }
    }

    if (spirituality) {
      const eyebrow = document.querySelector("#spirituality-eyebrow");
      const title = document.querySelector("#spirituality-title");
      const body = document.querySelector("#spirituality-body");

      if (eyebrow) {
        eyebrow.textContent =
          spirituality.eyebrow || "Espiritualidad jesuita";
      }

      if (title) {
        title.textContent = spirituality.title;
      }

      if (body) {
        body.textContent = spirituality.body || "";
      }
    }

    const cardsContainer =
      document.querySelector("#spirituality-cards");

    const spiritualCards = (data.cards || []).filter(
      (card) => card.section_slug === "spirituality"
    );

    if (cardsContainer) {
      if (spiritualCards.length) {
        cardsContainer.innerHTML = spiritualCards.map((card) => `
          <article>
            <span>${escapeHtml(card.label || "")}</span>
            <h3>${escapeHtml(card.title)}</h3>
            ${card.body
              ? `<p>${escapeHtml(card.body)}</p>`
              : ""
            }
          </article>
        `).join("");
      } else {
        cardsContainer.innerHTML = `
          <p class="loading">
            Información en actualización.
          </p>
        `;
      }
    }

    const staffGrid = document.querySelector("#staff-grid");

    if (staffGrid) {
      if (data.staff?.length) {
        staffGrid.innerHTML = data.staff.map((member) => `
          <article class="staff-card">
            ${member.image_url
              ? `
                <figure class="staff-photo">
                  <img
                    src="${escapeHtml(member.image_url)}"
                    alt="${escapeHtml(member.image_alt || member.name)}"
                    loading="lazy"
                  >
                </figure>
              `
              : `
                <div class="staff-photo staff-photo-empty" aria-hidden="true">
                  <span>SI</span>
                </div>
              `
            }

            <div class="staff-copy">
              <p class="staff-role">${escapeHtml(member.role)}</p>
              <h3>${escapeHtml(member.name)}</h3>

              ${member.description
                ? `<p>${escapeHtml(member.description)}</p>`
                : ""
              }
            </div>
          </article>
        `).join("");
      } else {
        staffGrid.innerHTML = `
          <p class="loading">
            La información del equipo pastoral se encuentra en actualización.
          </p>
        `;
      }
    }
  } catch (error) {
    console.error(error);
  }
}
async function loadHome() {
  try {
    const response = await fetch("/api/home", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("No se pudo cargar el contenido.");
    const data = await response.json();

    if (scheduleGrid) {
      if (data.schedules?.length) {
      scheduleGrid.innerHTML = data.schedules.map((item) => `
        <article class="schedule-item">
          <p class="schedule-category">${escapeHtml(item.category)}</p>
          <div class="schedule-day">${escapeHtml(item.day_label)}</div>
          <div class="schedule-time">${escapeHtml(item.time_label)}</div>
          ${item.detail ? `<p class="schedule-detail">${escapeHtml(item.detail)}</p>` : ""}
        </article>
      `).join("");
    } else {
      scheduleGrid.innerHTML = `
        <article class="schedule-item">
          <p class="schedule-category">Horarios</p>
          <div class="schedule-day">Información en actualización</div>
          <div class="schedule-time">Por confirmar</div>
        </article>
      `;
    }
    }

    if (data.pastoral) {
      const embedUrl = youtubeEmbedUrl(data.pastoral.youtube_url);

      pastoralCard.innerHTML = `
        ${data.pastoral.image_url ? `
          <figure class="pastoral-image">
            <img
              src="${escapeHtml(data.pastoral.image_url)}"
              alt="${escapeHtml(data.pastoral.image_alt || "")}"
              loading="lazy"
            >
          </figure>
        ` : ""}

        <div class="pastoral-content">
          <h3>${escapeHtml(data.pastoral.title)}</h3>
          <p class="meta">
            ${escapeHtml(data.pastoral.author_name || "San Ignacio de Loyola")}
            ${data.pastoral.published_at ? ` · ${formatDate(data.pastoral.published_at)}` : ""}
          </p>

          ${data.pastoral.excerpt ? `<p><strong>${escapeHtml(data.pastoral.excerpt)}</strong></p>` : ""}

          ${embedUrl ? `
            <div class="pastoral-video">
              <iframe
                src="${embedUrl}"
                title="${escapeHtml(data.pastoral.title)}"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
          ` : ""}

          <div class="body">${escapeHtml(data.pastoral.body)}</div>
        </div>
      `;
    } else {
      pastoralCard.innerHTML = `
        <h3>Mensaje pastoral</h3>
        <p class="body">El próximo mensaje semanal aparecerá aquí.</p>
      `;
    }

    if (notices && data.notices?.length) {
      notices.hidden = false;
      notices.innerHTML = data.notices.map((notice) => `
        <div class="notice">
          <strong>${escapeHtml(notice.title)}</strong>
          <p>${escapeHtml(notice.body)}</p>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error(error);
    if (scheduleGrid) {
      scheduleGrid.innerHTML = `<p>No fue posible cargar los horarios.</p>`;
    }
    pastoralCard.innerHTML = `<p>No fue posible cargar el mensaje pastoral.</p>`;
  }
}

loadHome();
loadMusic();
loadInstitutional();

const contactForm = document.querySelector("#contact-form");
const contactStatus = document.querySelector("#contact-status");

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const button = form.querySelector('button[type="submit"]');

  if (contactStatus) {
    contactStatus.classList.remove("error");
    contactStatus.textContent = "Enviando…";
  }

  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        subject: data.get("subject"),
        message: data.get("message"),
        website: data.get("website")
      })
    });

    const payload = response.status === 204
      ? {}
      : await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload.error || "No fue posible enviar el mensaje."
      );
    }

    form.reset();

    if (contactStatus) {
      contactStatus.textContent =
        "Su mensaje fue recibido. Gracias.";
    }
  } catch (error) {
    if (contactStatus) {
      contactStatus.textContent = error.message;
      contactStatus.classList.add("error");
    }
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
});


// ============================================================
// SAN IGNACIO CANONICAL HISTORY TABS
// ============================================================

const canonicalHistoryTabs =
  document.querySelectorAll("[data-history-tab]");

const canonicalHistoryPanels =
  document.querySelectorAll("[data-history-panel]");

canonicalHistoryTabs.forEach((tab) => {

  tab.addEventListener("click", () => {

    const target =
      tab.dataset.historyTab;

    canonicalHistoryTabs.forEach((item) => {

      const active =
        item === tab;

      item.classList.toggle(
        "active",
        active
      );

      item.setAttribute(
        "aria-selected",
        String(active)
      );
    });

    canonicalHistoryPanels.forEach((panel) => {

      const active =
        panel.dataset.historyPanel === target;

      panel.classList.toggle(
        "active",
        active
      );

      panel.hidden = !active;
    });
  });
});



/* SAN IGNACIO GALLERY LIGHTBOX V2 */

(() => {

  const launch = document.querySelector("#gallery-launch");
  const lightbox = document.querySelector("#gallery-lightbox");
  const image = document.querySelector("#gallery-image");

  const close = document.querySelector("#gallery-close");
  const previous = document.querySelector("#gallery-prev");
  const next = document.querySelector("#gallery-next");
  const counter = document.querySelector("#gallery-counter");

  const dataNode = document.querySelector("#gallery-data");


  if (
    !launch ||
    !lightbox ||
    !image ||
    !close ||
    !previous ||
    !next ||
    !counter ||
    !dataNode
  ) {
    return;
  }


  let galleryPhotos = [];

  try {

    galleryPhotos = JSON.parse(
      dataNode.textContent || "[]"
    );

  } catch {

    return;
  }


  if (
    !Array.isArray(galleryPhotos) ||
    galleryPhotos.length === 0
  ) {
    return;
  }


  /*
    Fotografías visibles en las demás secciones.
  */

  const pagePhotoNodes = Array.from(
    document.querySelectorAll(
      'main img[src^="/img/site-photos/"]:not(#gallery-image)'
    )
  );


  const pagePhotoUrls = pagePhotoNodes
    .map((node) => node.getAttribute("src"))
    .filter(Boolean);


  /*
    Una sola colección general, sin duplicados.
  */

  const allPhotos = Array.from(
    new Set([
      ...pagePhotoUrls,
      ...galleryPhotos
    ])
  );


  let activePhotos = galleryPhotos;
  let index = 0;

  let touchStartX = 0;
  let touchStartY = 0;

  let opener = null;


  const normalize = (value) => {

    if (value < 0) {
      return activePhotos.length - 1;
    }

    if (value >= activePhotos.length) {
      return 0;
    }

    return value;
  };


  const show = (value) => {

    index = normalize(value);

    image.src = activePhotos[index];

    image.alt =
      `Fotografía ${index + 1} de ${activePhotos.length}`;

    counter.textContent =
      `${index + 1} / ${activePhotos.length}`;
  };


  const showNext = () => {
    show(index + 1);
  };


  const showPrevious = () => {
    show(index - 1);
  };


  const openGallery = (
    source,
    collection
  ) => {

    opener = document.activeElement;

    activePhotos =
      Array.isArray(collection) && collection.length
        ? collection
        : galleryPhotos;


    const requestedIndex =
      activePhotos.indexOf(source);


    index =
      requestedIndex >= 0
        ? requestedIndex
        : 0;


    show(index);

    lightbox.hidden = false;

    document.body.classList.add(
      "gallery-open"
    );

    close.focus();
  };


  const closeGallery = () => {

    lightbox.hidden = true;

    document.body.classList.remove(
      "gallery-open"
    );

    if (
      opener &&
      typeof opener.focus === "function"
    ) {
      opener.focus();
    }
  };


  /* ============================================================
     PORTADA DE GALERÍA
     ============================================================ */

  launch.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      openGallery(
        galleryPhotos[0],
        galleryPhotos
      );
    }
  );


  /* ============================================================
     TODAS LAS DEMÁS FOTOS
     ============================================================ */

  pagePhotoNodes.forEach((photo) => {

    /*
      La portada de Galería ya tiene controlador propio.
    */

    if (photo.closest("#gallery-launch")) {
      return;
    }


    photo.setAttribute(
      "tabindex",
      "0"
    );


    photo.setAttribute(
      "role",
      "button"
    );


    photo.setAttribute(
      "aria-label",
      `${
        photo.alt ||
        "Fotografía"
      }. Abrir imagen`
    );


    const openPhoto = () => {

      const source =
        photo.getAttribute("src");

      openGallery(
        source,
        allPhotos
      );
    };


    photo.addEventListener(
      "click",
      openPhoto
    );


    photo.addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          openPhoto();
        }
      }
    );
  });


  /* ============================================================
     CONTROLES
     ============================================================ */

  close.addEventListener(
    "click",
    closeGallery
  );


  next.addEventListener(
    "click",
    showNext
  );


  previous.addEventListener(
    "click",
    showPrevious
  );


  image.addEventListener(
    "click",
    showNext
  );


  /*
    Tocar el fondo oscuro cierra.
  */

  lightbox.addEventListener(
    "click",
    (event) => {

      if (
        event.target === lightbox ||
        event.target.classList.contains(
          "gallery-stage"
        )
      ) {
        closeGallery();
      }
    }
  );


  /* ============================================================
     TECLADO
     ============================================================ */

  document.addEventListener(
    "keydown",
    (event) => {

      if (lightbox.hidden) {
        return;
      }


      if (event.key === "Escape") {

        event.preventDefault();

        closeGallery();

        return;
      }


      if (event.key === "ArrowRight") {

        event.preventDefault();

        showNext();

        return;
      }


      if (event.key === "ArrowLeft") {

        event.preventDefault();

        showPrevious();
      }
    }
  );


  /* ============================================================
     SWIPE
     ============================================================ */

  image.addEventListener(
    "touchstart",
    (event) => {

      const touch =
        event.changedTouches[0];

      touchStartX =
        touch.clientX;

      touchStartY =
        touch.clientY;
    },
    {
      passive: true
    }
  );


  image.addEventListener(
    "touchend",
    (event) => {

      const touch =
        event.changedTouches[0];

      const dx =
        touch.clientX -
        touchStartX;

      const dy =
        touch.clientY -
        touchStartY;


      if (Math.abs(dx) < 45) {
        return;
      }


      if (
        Math.abs(dx) <=
        Math.abs(dy)
      ) {
        return;
      }


      if (dx < 0) {
        showNext();
      }
      else {
        showPrevious();
      }
    },
    {
      passive: true
    }
  );

})();

/* END SAN IGNACIO GALLERY LIGHTBOX V2 */


/* SAN IGNACIO MENU OUTSIDE CLOSE V1 */

(() => {

  const toggle =
    document.querySelector(".nav-toggle");

  const nav =
    document.querySelector("#primary-nav");


  if (!toggle || !nav) {
    return;
  }


  const closeMenu = () => {

    nav.classList.remove("open");

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );
  };


  /*
    Si el menú está abierto y se toca cualquier zona que NO sea:

    - el propio menú
    - el botón Menú

    entonces se cierra.
  */

  document.addEventListener(
    "pointerdown",
    (event) => {

      if (!nav.classList.contains("open")) {
        return;
      }


      if (nav.contains(event.target)) {
        return;
      }


      if (toggle.contains(event.target)) {
        return;
      }


      closeMenu();
    }
  );


  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape" &&
        nav.classList.contains("open")
      ) {

        closeMenu();

        toggle.focus();
      }
    }
  );

})();

/* END SAN IGNACIO MENU OUTSIDE CLOSE V1 */


/* SAN IGNACIO LITURGY LEGACY CLEAN V117 */

(() => {

  const cleanLegacyLiturgy = () => {

    const liturgy =
      document.querySelector("#liturgia");

    if (!liturgy) {
      return;
    }


    /*
      HORARIO VIEJO

      Ocultamos el padre inmediato de #schedule-grid.
      Así desaparecen juntos:
      - el segundo "Horarios de misa"
      - lunes a viernes
      - sábado
      - domingo

      El horario nuevo .mass-hours-primary NO se toca.
    */

    const oldSchedule =
      liturgy.querySelector("#schedule-grid");

    if (oldSchedule) {

      const parent =
        oldSchedule.parentElement;

      if (
        parent &&
        !parent.classList.contains("mass-hours-primary") &&
        !parent.querySelector(".mass-hours-primary")
      ) {
        parent.classList.add(
          "liturgy-legacy-hidden"
        );

        parent.setAttribute(
          "aria-hidden",
          "true"
        );
      }
      else {
        oldSchedule.classList.add(
          "liturgy-legacy-hidden"
        );
      }
    }


    /*
      CELEBRACIONES ESPECIALES

      Mismo criterio:
      fuera de la composición pública por ahora,
      sin romper el nodo que puede utilizar el CMS.
    */

    const notices =
      liturgy.querySelector("#notices");

    if (notices) {

      const parent =
        notices.parentElement;

      if (
        parent &&
        !parent.classList.contains("mass-hours-primary") &&
        !parent.querySelector(".mass-hours-primary")
      ) {
        parent.classList.add(
          "liturgy-legacy-hidden"
        );

        parent.setAttribute(
          "aria-hidden",
          "true"
        );
      }
      else {
        notices.classList.add(
          "liturgy-legacy-hidden"
        );
      }
    }
  };


  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      cleanLegacyLiturgy,
      { once: true }
    );

  }
  else {

    cleanLegacyLiturgy();

  }

})();

/* END SAN IGNACIO LITURGY LEGACY CLEAN V117 */

/* SAN IGNACIO REMOVE DUPLICATE LITURGY V121 */

(() => {

  const normalize = (value = "") =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();


  let cleaning = false;


  const cleanLiturgy = () => {

    if (cleaning) return;

    cleaning = true;

    try {

      const liturgy =
        document.querySelector("#liturgia");

      if (!liturgy) return;


      /*
       * ÉSTE ES EL HORARIO BUENO.
       * JAMÁS se toca.
       */
      const approved =
        liturgy.querySelector(".mass-hours-primary");

      if (!approved) return;


      /*
       * Buscar fuera del bloque aprobado un contenedor
       * que reúna los tres días y los horarios.
       *
       * En la captura éste es el bloque inferior
       * de tres columnas.
       */
      const candidates =
        Array.from(
          liturgy.querySelectorAll(
            "div, section, article, aside"
          )
        )
        .filter((el) => {

          if (
            el === approved ||
            approved.contains(el) ||
            el.contains(approved)
          ) {
            return false;
          }

          const text =
            normalize(el.textContent);

          return (
            text.includes("lunes a viernes") &&
            text.includes("sabado") &&
            text.includes("domingo") &&
            text.includes("7:30") &&
            text.includes("18:30")
          );
        })
        .sort(
          (a,b) =>
            a.textContent.length -
            b.textContent.length
        );


      const duplicate =
        candidates[0];


      if (duplicate) {

        const previous =
          duplicate.previousElementSibling;

        if (
          previous &&
          normalize(previous.textContent) ===
            "horarios de misa"
        ) {
          previous.remove();
        }

        duplicate.remove();
      }


      /*
       * Quitar cualquier segundo rótulo
       * "Horarios de misa" fuera del bloque bueno.
       */
      Array.from(
        liturgy.querySelectorAll(
          "h1,h2,h3,h4,h5,h6,p,span,strong,div"
        )
      ).forEach((el) => {

        if (
          el === approved ||
          approved.contains(el) ||
          el.contains(approved)
        ) {
          return;
        }

        if (
          normalize(el.textContent) ===
          "horarios de misa"
        ) {
          el.remove();
        }
      });


      /*
       * Celebraciones especiales:
       * fuera por ahora.
       */
      const notices =
        liturgy.querySelector("#notices");

      if (
        notices &&
        !approved.contains(notices)
      ) {

        const card =
          notices.closest(
            "article, aside, .card, .panel"
          );

        if (
          card &&
          !card.contains(approved)
        ) {
          card.remove();
        }
        else {
          notices.remove();
        }
      }


      Array.from(
        liturgy.querySelectorAll(
          "h1,h2,h3,h4,h5,h6,p,span,strong"
        )
      ).forEach((el) => {

        if (approved.contains(el)) {
          return;
        }

        if (
          normalize(el.textContent) ===
          "celebraciones especiales"
        ) {
          el.remove();
        }
      });

    }
    finally {
      cleaning = false;
    }
  };


  const start = () => {

    const liturgy =
      document.querySelector("#liturgia");

    if (!liturgy) return;


    cleanLiturgy();


    /*
     * El horario viejo parece estar entrando después,
     * cuando llegan los datos del CMS.
     *
     * Por eso vigilamos la sección.
     */
    const observer =
      new MutationObserver(() => {
        requestAnimationFrame(cleanLiturgy);
      });


    observer.observe(
      liturgy,
      {
        childList: true,
        subtree: true
      }
    );


    /*
     * Refuerzo durante la carga inicial.
     */
    setTimeout(cleanLiturgy, 50);
    setTimeout(cleanLiturgy, 250);
    setTimeout(cleanLiturgy, 750);
    setTimeout(cleanLiturgy, 1500);
    setTimeout(cleanLiturgy, 3000);
  };


  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );

  }
  else {

    start();

  }

})();

/* END SAN IGNACIO REMOVE DUPLICATE LITURGY V121 */
