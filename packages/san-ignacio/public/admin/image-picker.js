(() => {
  "use strict";

  let imagesCache = [];
  let imagesPromise = null;
  let activePicker = null;
  let modal = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function api(url, options = {}) {
    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(!isFormData && options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {})
      },
      ...options
    });

    if (response.status === 401) {
      location.href = "/admin";
      throw new Error("Sesión terminada.");
    }

    let payload = null;

    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        `No se pudo completar la operación (${response.status}).`
      );
    }

    return payload;
  }

  function imageName(image) {
    return (
      image?.alt_text ||
      `Fotografía ${image?.id || ""}`
    );
  }

  function imageUrl(image) {
    return image?.secure_url || image?.url || "";
  }

  function mergeImage(image) {
    if (!image?.id) return;

    imagesCache = [
      image,
      ...imagesCache.filter(
        (item) => Number(item.id) !== Number(image.id)
      )
    ];
  }

  async function loadImages(force = false) {
    if (!force && imagesCache.length) {
      return imagesCache;
    }

    if (imagesPromise) {
      return imagesPromise;
    }

    imagesPromise = api("/api/admin/media/images")
      .then(({ images = [] }) => {
        imagesCache = images;
        return imagesCache;
      })
      .finally(() => {
        imagesPromise = null;
      });

    return imagesPromise;
  }

  function ensureModal() {
    if (modal) return modal;

    const wrapper = document.createElement("div");
    wrapper.className = "si-image-picker";
    wrapper.hidden = true;

    wrapper.innerHTML = `
      <div class="si-image-picker-backdrop" data-si-image-close></div>

      <section
        class="si-image-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="si-image-picker-title"
      >
        <header class="si-image-picker-header">
          <div>
            <p class="si-image-picker-kicker">
              Biblioteca de fotos
            </p>

            <h2 id="si-image-picker-title">
              Elegir fotografía
            </h2>
          </div>

          <button
            type="button"
            class="secondary-button"
            data-si-image-close
          >
            Cerrar
          </button>
        </header>

        <div class="si-image-picker-upload">
          <div>
            <strong>Subir una nueva desde mi PC</strong>
            <small>
              También quedará guardada en la Biblioteca de fotos.
            </small>
          </div>

          <input
            id="si-image-picker-file"
            type="file"
            accept="image/*"
          >

          <input
            id="si-image-picker-alt"
            type="text"
            maxlength="300"
            placeholder="Descripción de la fotografía"
          >

          <button
            id="si-image-picker-upload-button"
            type="button"
          >
            Subir y usar
          </button>
        </div>

        <p
          id="si-image-picker-status"
          class="si-image-picker-status"
          role="status"
        ></p>

        <div class="si-image-picker-toolbar">
          <input
            id="si-image-picker-search"
            type="search"
            placeholder="Buscar en la biblioteca"
            autocomplete="off"
          >

          <button
            id="si-image-picker-none"
            type="button"
            class="secondary-button"
          >
            Sin fotografía
          </button>
        </div>

        <div
          id="si-image-picker-grid"
          class="si-image-picker-grid"
        ></div>
      </section>
    `;

    document.body.append(wrapper);
    modal = wrapper;

    wrapper
      .querySelectorAll("[data-si-image-close]")
      .forEach((button) => {
        button.addEventListener("click", closePicker);
      });

    wrapper
      .querySelector("#si-image-picker-search")
      .addEventListener("input", renderGrid);

    wrapper
      .querySelector("#si-image-picker-none")
      .addEventListener("click", () => {
        chooseImage(null);
      });

    wrapper
      .querySelector("#si-image-picker-upload-button")
      .addEventListener("click", uploadAndChoose);

    return modal;
  }

  function closePicker() {
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("si-image-picker-open");
    activePicker = null;
  }

  function renderGrid() {
    ensureModal();

    const grid =
      modal.querySelector("#si-image-picker-grid");

    const search =
      modal
        .querySelector("#si-image-picker-search")
        .value
        .trim()
        .toLocaleLowerCase("es");

    const images = imagesCache.filter((image) => {
      if (!search) return true;

      return imageName(image)
        .toLocaleLowerCase("es")
        .includes(search);
    });

    if (!images.length) {
      grid.innerHTML = `
        <div class="si-image-picker-empty">
          No hay fotografías que coincidan.
        </div>
      `;
      return;
    }

    grid.innerHTML = images.map((image) => `
      <button
        type="button"
        class="si-image-picker-card"
        data-si-image-id="${Number(image.id)}"
      >
        <img
          src="${escapeHtml(imageUrl(image))}"
          alt="${escapeHtml(imageName(image))}"
          loading="lazy"
        >

        <span>
          ${escapeHtml(imageName(image))}
        </span>
      </button>
    `).join("");

    grid
      .querySelectorAll("[data-si-image-id]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const id = Number(button.dataset.siImageId);
          const image = imagesCache.find(
            (item) => Number(item.id) === id
          );

          if (image) {
            chooseImage(image);
          }
        });
      });
  }

  function ensureSelectOption(target, image) {
    if (
      !image ||
      target.tagName !== "SELECT"
    ) {
      return;
    }

    const exists = Array.from(target.options)
      .some(
        (option) =>
          Number(option.value) === Number(image.id)
      );

    if (exists) return;

    const option = document.createElement("option");
    option.value = String(image.id);
    option.textContent = imageName(image);

    target.append(option);
  }

  function controlFor(target) {
    if (!target?.id) return null;

    return document.querySelector(
      `[data-si-picker-for="${target.id}"]`
    );
  }

  function updateControl(target) {
    const control = controlFor(target);

    if (!control) return;

    const preview =
      control.querySelector(".si-image-picker-current");

    const remove =
      control.querySelector("[data-si-picker-remove]");

    const id = Number(target.value || 0);

    const image = imagesCache.find(
      (item) => Number(item.id) === id
    );

    if (!id) {
      preview.innerHTML = `
        <span class="si-image-picker-no-image">
          Sin fotografía seleccionada
        </span>
      `;

      if (remove) remove.hidden = true;
      return;
    }

    if (image) {
      preview.innerHTML = `
        <img
          src="${escapeHtml(imageUrl(image))}"
          alt="${escapeHtml(imageName(image))}"
        >
        <span>
          ${escapeHtml(imageName(image))}
        </span>
      `;
    } else {
      preview.innerHTML = `
        <span>
          Fotografía ${id}
        </span>
      `;
    }

    if (remove) remove.hidden = false;
  }

  function chooseImage(image) {
    if (!activePicker?.target) return;

    const {
      target,
      afterClick
    } = activePicker;

    if (image) {
      mergeImage(image);
      ensureSelectOption(target, image);

      window.dispatchEvent(
        new CustomEvent("si:image-picked", {
          detail: { image }
        })
      );

      target.value = String(image.id);
    } else {
      target.value = "";
    }

    target.dispatchEvent(
      new Event("change", { bubbles: true })
    );

    updateControl(target);

    closePicker();

    if (afterClick) {
      queueMicrotask(() => {
        document.querySelector(afterClick)?.click();

        queueMicrotask(() => {
          updateControl(target);
        });
      });
    }
  }

  async function uploadAndChoose() {
    ensureModal();

    const fileInput =
      modal.querySelector("#si-image-picker-file");

    const altInput =
      modal.querySelector("#si-image-picker-alt");

    const button =
      modal.querySelector("#si-image-picker-upload-button");

    const status =
      modal.querySelector("#si-image-picker-status");

    const file = fileInput.files?.[0];

    if (!file) {
      status.textContent =
        "Selecciona una fotografía de tu computadora.";
      status.classList.add("error");
      return;
    }

    status.classList.remove("error");
    status.textContent = "Subiendo fotografía…";
    button.disabled = true;

    try {
      const data = new FormData();

      data.append("image", file);

      data.append(
        "alt_text",
        altInput.value.trim() ||
        file.name.replace(/\.[^.]+$/, "")
      );

      const result = await api(
        "/api/admin/media/images",
        {
          method: "POST",
          body: data
        }
      );

      const image = result?.image;

      if (!image?.id) {
        throw new Error(
          "La fotografía se subió pero no recibí su identificador."
        );
      }

      mergeImage(image);

      window.dispatchEvent(
        new CustomEvent("si:image-library-updated", {
          detail: { image }
        })
      );

      fileInput.value = "";
      altInput.value = "";
      status.textContent = "Fotografía guardada.";

      chooseImage(image);

    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    } finally {
      button.disabled = false;
    }
  }

  async function openPicker(target, options = {}) {
    if (!target) return;

    ensureModal();

    activePicker = {
      target,
      afterClick: options.afterClick || null
    };

    modal.hidden = false;
    document.body.classList.add("si-image-picker-open");

    const title =
      modal.querySelector("#si-image-picker-title");

    title.textContent =
      options.title || "Elegir fotografía";

    modal
      .querySelector("#si-image-picker-none")
      .hidden = options.allowNone === false;

    modal
      .querySelector("#si-image-picker-status")
      .textContent = "";

    modal
      .querySelector("#si-image-picker-search")
      .value = "";

    modal
      .querySelector("#si-image-picker-grid")
      .innerHTML =
        `<div class="si-image-picker-empty">
          Cargando fotografías…
        </div>`;

    try {
      await loadImages(true);
      updateControl(target);
      renderGrid();
    } catch (error) {
      modal
        .querySelector("#si-image-picker-status")
        .textContent = error.message;
    }
  }

  function ensureNoticeTarget() {
    const form =
      document.querySelector("#notice-form");

    if (!form) return;

    if (
      document.querySelector("#notice-image-media-id")
    ) {
      return;
    }

    const oldFile =
      form.querySelector('input[name="image"][type="file"]');

    if (!oldFile) return;

    const hidden =
      document.createElement("input");

    hidden.type = "hidden";
    hidden.name = "image_media_id";
    hidden.id = "notice-image-media-id";
    hidden.value = "";

    oldFile.replaceWith(hidden);

    const help =
      form.querySelector(
        'label:has(#notice-image-media-id) .help-text'
      );

    if (help) {
      help.textContent =
        "Puedes elegir una fotografía guardada o subir una nueva.";
    }
  }

  const fixedControls = [
    {
      id: "pastoral-image-select",
      label: "Elegir de biblioteca o subir",
      title: "Fotografía del mensaje pastoral"
    },
    {
      id: "notice-image-media-id",
      label: "Elegir de biblioteca o subir",
      title: "Fotografía del aviso"
    },
    {
      id: "about-image-select",
      label: "Elegir de biblioteca o subir",
      title: "Fotografía de Nosotros"
    },
    {
      id: "staff-image-select",
      label: "Elegir de biblioteca o subir",
      title: "Fotografía del integrante"
    },
    {
      id: "si-event-image",
      label: "Elegir de biblioteca o subir",
      title: "Fotografía del evento"
    },
    {
      id: "si-gallery-image",
      label: "Añadir fotografía",
      title: "Añadir fotografía a la galería",
      allowNone: false,
      afterClick: "#si-gallery-add"
    }
  ];

  function enhanceTarget(target, config = {}) {
    if (!target) return;

    if (!target.id) {
      const slot =
        target.dataset.slot ||
        Math.random().toString(36).slice(2);

      target.id =
        `si-site-image-${slot}`;
    }

    if (target.dataset.siImageEnhanced === "1") {
      return;
    }

    target.dataset.siImageEnhanced = "1";
    target.classList.add("si-image-native-control");

    const control =
      document.createElement("div");

    control.className =
      "si-image-picker-control";

    control.dataset.siPickerFor =
      target.id;

    control.innerHTML = `
      <div class="si-image-picker-current">
        <span class="si-image-picker-no-image">
          Sin fotografía seleccionada
        </span>
      </div>

      <div class="si-image-picker-actions">
        <button
          type="button"
          class="secondary-button"
          data-si-picker-open
        >
          ${escapeHtml(
            config.label ||
            "Elegir de biblioteca o subir"
          )}
        </button>

        <button
          type="button"
          class="secondary-button"
          data-si-picker-remove
          hidden
        >
          Quitar
        </button>
      </div>
    `;

    target.insertAdjacentElement(
      "afterend",
      control
    );

    control
      .querySelector("[data-si-picker-open]")
      .addEventListener("click", () => {
        openPicker(target, config);
      });

    control
      .querySelector("[data-si-picker-remove]")
      .addEventListener("click", () => {
        target.value = "";

        target.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );

        updateControl(target);
      });

    target.addEventListener(
      "change",
      () => updateControl(target)
    );

    loadImages()
      .then(() => updateControl(target))
      .catch(() => {});
  }

  function scan() {
    ensureNoticeTarget();

    fixedControls.forEach((config) => {
      const target =
        document.getElementById(config.id);

      if (target) {
        enhanceTarget(target, config);
      }
    });

    document
      .querySelectorAll(
        "#si-site-image-editor select[data-slot]"
      )
      .forEach((target) => {
        const slotLabel =
          target
            .closest(".si-site-image-row")
            ?.querySelector("span")
            ?.textContent
            ?.trim();

        enhanceTarget(target, {
          label: "Elegir o subir",
          title: slotLabel
            ? `Fotografía: ${slotLabel}`
            : "Fotografía del sitio"
        });
      });

    const oldEventUpload =
      document.querySelector("#si-go-images");

    if (oldEventUpload) {
      oldEventUpload.hidden = true;
    }

    const gallerySelect =
      document.querySelector("#si-gallery-image");

    const galleryAdd =
      document.querySelector("#si-gallery-add");

    if (
      gallerySelect?.dataset.siImageEnhanced === "1" &&
      galleryAdd
    ) {
      galleryAdd.hidden = true;
    }
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        modal &&
        !modal.hidden
      ) {
        closePicker();
      }
    }
  );

  const start = () => {
    scan();

    const observer =
      new MutationObserver(() => {
        scan();
      });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

  window.SIImagePicker = {
    open(target, options = {}) {
      return openPicker(target, options);
    },

    refresh() {
      return loadImages(true);
    }
  };
})();