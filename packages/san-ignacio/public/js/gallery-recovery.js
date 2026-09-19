(() => {
  "use strict";

  const legacySources = ["/img/site-photos/galeria-01.jpg","/img/site-photos/galeria-02.jpg","/img/site-photos/galeria-03.jpg","/img/site-photos/galeria-04.jpg","/img/site-photos/galeria-05.jpg","/img/site-photos/galeria-06.jpg","/img/site-photos/galeria-07.jpg","/img/site-photos/galeria-08.jpg","/img/site-photos/galeria-09.jpg","/img/site-photos/galeria-10.jpg","/img/site-photos/galeria-11.jpg","/img/site-photos/galeria-12.jpg","/img/site-photos/galeria-13.jpg","/img/site-photos/galeria-14.jpg","/img/site-photos/galeria-15.jpg","/img/site-photos/galeria-16.jpg","/img/site-photos/galeria-17.jpg","/img/site-photos/galeria-18.jpg","/img/site-photos/galeria-19.jpg","/img/site-photos/galeria-20.jpg","/img/site-photos/galeria-21.jpg","/img/site-photos/galeria-22.jpg","/img/site-photos/galeria-23.jpg"];

  let photos = [];
  let currentIndex = 0;
  let rebuilding = false;
  let lightbox = null;

  const rootSelector = [
    "#galeria",
    '[data-view="galeria"]',
    '[data-route="galeria"]'
  ].join(",");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeUrl(value) {
    try {
      return new URL(
        value,
        location.origin
      ).href
        .split("#")[0];
    } catch {
      return String(value || "");
    }
  }

  function filenameFromUrl(value) {
    try {
      const parsed =
        new URL(
          value,
          location.origin
        );

      const filename =
        decodeURIComponent(
          parsed.pathname
            .split("/")
            .pop() || ""
        );

      return filename
        .replace(
          /\.(jpe?g|png|webp)$/i,
          ""
        )
        .replace(/[-_]+/g, " ")
        .trim() || "Fotografía";

    } catch {
      return "Fotografía";
    }
  }

  function normalizeItem(item) {

    if (!item) {
      return null;
    }

    if (typeof item === "string") {
      return {
        src: item,
        caption: ""
      };
    }

    const src =
      item.src ||
      item.image_url ||
      item.secure_url ||
      item.url ||
      "";

    if (!src) {
      return null;
    }

    return {
      src,
      caption:
        item.caption ||
        item.alt_text ||
        item.image_alt ||
        ""
    };
  }

  function mergeUnique() {

    const result = [];
    const seen = new Set();

    for (const group of arguments) {

      for (const raw of group || []) {

        const item =
          normalizeItem(raw);

        if (!item || !item.src) {
          continue;
        }

        const key =
          normalizeUrl(item.src);

        if (!key || seen.has(key)) {
          continue;
        }

        seen.add(key);

        result.push(item);
      }
    }

    return result;
  }

  function collectExistingImages(root) {

    if (!root) {
      return [];
    }

    return [
      ...root.querySelectorAll("img")
    ]
      .map((image) => {

        const src =
          image.currentSrc ||
          image.getAttribute("src") ||
          image.src ||
          "";

        return {
          src,
          caption:
            image.getAttribute("alt") ||
            ""
        };
      })
      .filter(
        (item) =>
          item.src &&
          !item.src.startsWith("data:")
      );
  }

  function ensureLightbox() {

    if (lightbox) {
      return lightbox;
    }

    const box =
      document.createElement("div");

    box.className =
      "si-gallery-recovery-lightbox";

    box.hidden = true;

    box.innerHTML = `
      <button
        type="button"
        class="si-gallery-recovery-close"
        aria-label="Cerrar"
      >×</button>

      <button
        type="button"
        class="si-gallery-recovery-prev"
        aria-label="Anterior"
      >‹</button>

      <figure
        class="si-gallery-recovery-stage"
      >
        <img
          class="si-gallery-recovery-main"
          alt=""
        >

        <figcaption
          class="si-gallery-recovery-caption"
        ></figcaption>
      </figure>

      <button
        type="button"
        class="si-gallery-recovery-next"
        aria-label="Siguiente"
      >›</button>

      <div
        class="si-gallery-recovery-counter"
      ></div>
    `;

    document.body.append(box);

    box
      .querySelector(
        ".si-gallery-recovery-close"
      )
      .addEventListener(
        "click",
        closeLightbox
      );

    box
      .querySelector(
        ".si-gallery-recovery-prev"
      )
      .addEventListener(
        "click",
        () => step(-1)
      );

    box
      .querySelector(
        ".si-gallery-recovery-next"
      )
      .addEventListener(
        "click",
        () => step(1)
      );

    box.addEventListener(
      "click",
      (event) => {
        if (event.target === box) {
          closeLightbox();
        }
      }
    );

    lightbox = box;

    return box;
  }

  function renderLightbox() {

    if (!photos.length) {
      return;
    }

    const item =
      photos[currentIndex];

    const box =
      ensureLightbox();

    const image =
      box.querySelector(
        ".si-gallery-recovery-main"
      );

    const caption =
      box.querySelector(
        ".si-gallery-recovery-caption"
      );

    const counter =
      box.querySelector(
        ".si-gallery-recovery-counter"
      );

    image.src =
      item.src;

    image.alt =
      item.caption ||
      filenameFromUrl(item.src);

    caption.textContent =
      item.caption || "";

    caption.hidden =
      !item.caption;

    counter.textContent =
      `${currentIndex + 1} / ${photos.length}`;
  }

  function openLightbox(index) {

    if (!photos.length) {
      return;
    }

    currentIndex =
      Math.max(
        0,
        Math.min(
          Number(index) || 0,
          photos.length - 1
        )
      );

    const box =
      ensureLightbox();

    renderLightbox();

    box.hidden = false;

    document.documentElement
      .classList
      .add(
        "si-gallery-recovery-open"
      );

    box
      .querySelector(
        ".si-gallery-recovery-close"
      )
      .focus();
  }

  function closeLightbox() {

    if (!lightbox) {
      return;
    }

    lightbox.hidden = true;

    document.documentElement
      .classList
      .remove(
        "si-gallery-recovery-open"
      );
  }

  function step(direction) {

    if (!photos.length) {
      return;
    }

    currentIndex =
      (
        currentIndex +
        direction +
        photos.length
      ) % photos.length;

    renderLightbox();
  }

  function renderGallery(root) {

    root.innerHTML = `
      <div
        class="si-gallery-recovery-shell"
        data-si-gallery-recovery-shell
      >
        <header
          class="si-gallery-recovery-heading"
        >
          <h2>Galería</h2>

          <p>
            ${photos.length}
            ${
              photos.length === 1
                ? "fotografía"
                : "fotografías"
            }
          </p>
        </header>

        <div
          class="si-gallery-recovery-grid"
        >
          ${
            photos
              .map(
                (item, index) => `
                  <button
                    type="button"
                    class="si-gallery-recovery-thumb"
                    data-gallery-index="${index}"
                    aria-label="Abrir fotografía ${index + 1}"
                  >
                    <img
                      src="${escapeHtml(item.src)}"
                      alt="${escapeHtml(
                        item.caption ||
                        filenameFromUrl(item.src)
                      )}"
                      loading="lazy"
                    >
                  </button>
                `
              )
              .join("")
          }
        </div>
      </div>
    `;

    root
      .querySelectorAll(
        "[data-gallery-index]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              openLightbox(
                Number(
                  button.dataset.galleryIndex
                )
              );
            }
          );
        }
      );
  }

  function rebuild() {

    if (rebuilding) {
      return;
    }

    const root =
      document.querySelector(
        rootSelector
      );

    if (!root) {
      return;
    }

    rebuilding = true;

    try {

      /*
       * Antes de borrar lo que haya pintado editorial.js,
       * capturamos todas las fotos que haya puesto el CMS.
       */
      const cmsPhotos =
        collectExistingImages(root);

      photos =
        mergeUnique(
          legacySources,
          cmsPhotos
        );

      if (photos.length < 23) {
        throw new Error(
          `Galería incompleta: ${photos.length} fotos.`
        );
      }

      renderGallery(root);

    } catch (error) {

      console.error(
        "No fue posible reconstruir la galería:",
        error
      );

    } finally {

      rebuilding = false;
    }
  }

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        !lightbox ||
        lightbox.hidden
      ) {
        return;
      }

      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        step(-1);
      }

      if (event.key === "ArrowRight") {
        step(1);
      }
    }
  );

  function start() {

    /*
     * Primer intento:
     * si editorial.js ya pintó su foto,
     * la recoge.
     */
    rebuild();

    /*
     * Segundo y tercer intento:
     * cubren el caso en que el fetch del CMS
     * termina después.
     */
    setTimeout(
      rebuild,
      700
    );

    setTimeout(
      rebuild,
      1800
    );

    const root =
      document.querySelector(
        rootSelector
      );

    if (!root) {
      return;
    }

    let timer = null;

    const observer =
      new MutationObserver(() => {

        if (
          root.querySelector(
            "[data-si-gallery-recovery-shell]"
          )
        ) {
          return;
        }

        clearTimeout(timer);

        timer =
          setTimeout(
            rebuild,
            100
          );
      });

    observer.observe(
      root,
      {
        childList: true,
        subtree: true
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );

  } else {

    start();
  }
})();