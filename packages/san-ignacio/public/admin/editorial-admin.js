/* SAN IGNACIO EDITORIAL ADMIN V8 */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const formatDate = (value) => {
    if (!value) return "Sin fecha";

    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return "Fecha inválida";
    }
  };

  const toLocalInput = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const pad = (n) => String(n).padStart(2, "0");

    return [
      date.getFullYear(),
      "-",
      pad(date.getMonth() + 1),
      "-",
      pad(date.getDate()),
      "T",
      pad(date.getHours()),
      ":",
      pad(date.getMinutes())
    ].join("");
  };

  async function api(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    if (response.status === 401) {
      location.href = "/admin";
      throw new Error("Sesión terminada.");
    }

    const payload = response.status === 204 ? null : await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "Error en el servidor.");
    }

    return payload;
  }

  const main = $(".admin-main");
  const nav = $(".admin-sidebar nav");
  const panelTitle = $("#panel-title");

  if (!main || !nav) return;

  $(".admin-sidebar small")?.replaceChildren(
    document.createTextNode("Contenido del sitio")
  );

  const oldMusicButton = $('[data-panel="music"]');
  if (oldMusicButton) oldMusicButton.hidden = true;

  const imagesButton = $('[data-panel="images"]');
  if (imagesButton) imagesButton.textContent = "Biblioteca de fotos";

  const agendaButton = document.createElement("button");
  agendaButton.type = "button";
  agendaButton.className = "sidebar-link si-editorial-sidebar";
  agendaButton.dataset.editorialPanel = "agenda";
  agendaButton.textContent = "Agenda y eventos";

  const galleryButton = document.createElement("button");
  galleryButton.type = "button";
  galleryButton.className = "sidebar-link si-editorial-sidebar";
  galleryButton.dataset.editorialPanel = "gallery";
  galleryButton.textContent = "Galería web";

  const siteImagesButton = document.createElement("button");
  siteImagesButton.type = "button";
  siteImagesButton.className = "sidebar-link si-editorial-sidebar";
  siteImagesButton.dataset.editorialPanel = "site-images";
  siteImagesButton.textContent = "Fotos del sitio";

  if (imagesButton) {
    imagesButton.insertAdjacentElement("afterend", agendaButton);
    agendaButton.insertAdjacentElement("afterend", galleryButton);
    galleryButton.insertAdjacentElement("afterend", siteImagesButton);
  } else {
    nav.append(agendaButton, galleryButton, siteImagesButton);
  }

  main.insertAdjacentHTML("beforeend", `
    <section id="panel-editorial-agenda" class="admin-panel si-editorial-panel">
      <div class="si-editorial-toolbar">
        <div>
          <p class="admin-kicker">Publicación</p>
          <h2>Agenda y eventos</h2>
          <p class="help-text">
            Crea conciertos, retiros, conferencias, celebraciones y actividades.
            Marca “Destacar en portada” para enviarlo al carrusel del inicio.
          </p>
        </div>
        <a class="secondary-button" href="/agenda" target="_blank" rel="noopener">
          Ver agenda ↗
        </a>
      </div>

      <div class="two-column si-editorial-columns">
        <form id="si-event-form" class="admin-card form-stack">
          <input type="hidden" name="id">

          <div class="inline-fields">
            <label>
              Tipo
              <input
                name="event_type"
                list="si-event-types"
                value="Evento"
                maxlength="100"
              >
              <datalist id="si-event-types">
                <option value="Concierto">
                <option value="Retiro">
                <option value="Conferencia">
                <option value="Celebración">
                <option value="Actividad">
                <option value="Evento">
              </datalist>
            </label>

            <label>
              Orden
              <input name="sort_order" type="number" value="0">
            </label>
          </div>

          <label>
            Título
            <input name="title" required maxlength="220">
          </label>

          <label>
            Resumen
            <textarea name="excerpt" rows="3" maxlength="800"></textarea>
          </label>

          <div class="inline-fields">
            <label>
              Inicia
              <input name="starts_at" type="datetime-local" required>
            </label>

            <label>
              Termina
              <input name="ends_at" type="datetime-local">
            </label>
          </div>

          <label>
            Lugar
            <input name="location" maxlength="300">
          </label>

          <label>
            Fotografía
            <select name="image_media_id" id="si-event-image">
              <option value="">Sin fotografía</option>
            </select>
          </label>

          <label>
            Liga de YouTube
            <input
              name="youtube_url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
            >
          </label>

          <label>
            Texto completo
            <textarea name="body" rows="8"></textarea>
          </label>

          <label class="si-editorial-check">
            <input name="featured_home" type="checkbox">
            <span>Destacar en portada</span>
          </label>

          <div class="button-row">
            <button
              type="submit"
              class="secondary-button"
              data-save-event="draft"
            >
              Guardar borrador
            </button>

            <button
              type="submit"
              data-save-event="publish"
            >
              Publicar
            </button>

            <button
              id="si-event-cancel-edit"
              type="button"
              class="secondary-button"
              hidden
            >
              Cancelar edición
            </button>
          </div>

          <p id="si-event-status" class="form-status" role="status"></p>
        </form>

        <div class="admin-card">
          <div class="card-heading-row">
            <div>
              <p class="admin-kicker">Registrados</p>
              <h2>Eventos</h2>
            </div>
            <button
              id="si-go-images"
              type="button"
              class="secondary-button"
            >
              Subir foto
            </button>
          </div>

          <div id="si-event-list" class="si-editorial-list"></div>
        </div>
      </div>
    </section>

    <section id="panel-editorial-gallery" class="admin-panel si-editorial-panel">
      <div class="admin-card">
        <div class="si-editorial-toolbar">
          <div>
            <p class="admin-kicker">Página pública</p>
            <h2>Galería web</h2>
            <p class="help-text">
              Mientras esta lista esté vacía se conserva la galería actual.
              Al guardar fotografías aquí, esta lista pasa a ser la galería pública.
            </p>
          </div>
          <a class="secondary-button" href="/galeria" target="_blank" rel="noopener">
            Ver galería ↗
          </a>
        </div>

        <div class="si-gallery-picker">
          <select id="si-gallery-image">
            <option value="">Selecciona una fotografía</option>
          </select>
          <input id="si-gallery-caption" placeholder="Pie de foto opcional">
          <button id="si-gallery-add" type="button">Añadir</button>
        </div>

        <div id="si-gallery-editor" class="si-gallery-editor"></div>

        <div class="button-row end">
          <button id="si-gallery-save" type="button">Guardar galería</button>
        </div>

        <p id="si-gallery-status" class="form-status" role="status"></p>
      </div>
    </section>

    <section id="panel-editorial-site-images" class="admin-panel si-editorial-panel">
      <div class="admin-card">
        <div class="si-editorial-toolbar">
          <div>
            <p class="admin-kicker">Fotografías</p>
            <h2>Fotos del sitio</h2>
            <p class="help-text">
              Asigna fotografías de la biblioteca a espacios concretos del sitio.
              Si dejas una posición vacía se conserva la fotografía actual.
            </p>
          </div>
          <button
            id="si-site-images-go-library"
            type="button"
            class="secondary-button"
          >
            Biblioteca de fotos
          </button>
        </div>

        <div id="si-site-image-editor" class="si-site-image-editor"></div>

        <div class="button-row end">
          <button id="si-site-images-save" type="button">Guardar fotos</button>
        </div>

        <p id="si-site-images-status" class="form-status" role="status"></p>
      </div>
    </section>
  `);

  const panelInfo = {
    agenda: {
      panel: $("#panel-editorial-agenda"),
      title: "Agenda y eventos",
      loader: loadEvents
    },
    gallery: {
      panel: $("#panel-editorial-gallery"),
      title: "Galería web",
      loader: loadGallery
    },
    "site-images": {
      panel: $("#panel-editorial-site-images"),
      title: "Fotos del sitio",
      loader: loadSiteImages
    }
  };

  function hideEditorialPanels() {
    $$(".si-editorial-panel").forEach((panel) => panel.classList.remove("active"));
    $$(".si-editorial-sidebar").forEach((button) => button.classList.remove("active"));
  }

  function activateEditorial(name) {
    const info = panelInfo[name];
    if (!info) return;

    $$(".sidebar-link").forEach((button) => button.classList.remove("active"));
    $$(".admin-panel").forEach((panel) => panel.classList.remove("active"));

    info.panel.classList.add("active");

    const button = $(`[data-editorial-panel="${name}"]`);
    button?.classList.add("active");

    if (panelTitle) panelTitle.textContent = info.title;

    info.loader().catch((error) => {
      console.error(error);
      alert(error.message);
    });
  }

  $$(".si-editorial-sidebar").forEach((button) => {
    button.addEventListener("click", () => {
      activateEditorial(button.dataset.editorialPanel);
    });
  });

  $$(".sidebar-link:not(.si-editorial-sidebar)").forEach((button) => {
    button.addEventListener("click", hideEditorialPanels);
  });

  const noticePriority = $('#notice-form input[name="priority"]');
  if (noticePriority && !$("#si-notice-feature-help")) {
    const help = document.createElement("p");
    help.id = "si-notice-feature-help";
    help.className = "help-text";
    help.textContent =
      "Prioridad 8–10: el aviso también puede aparecer en el carrusel de portada.";
    noticePriority.closest("label")?.insertAdjacentElement("afterend", help);
  }

  const eventForm = $("#si-event-form");
  const eventStatus = $("#si-event-status");
  const cancelEdit = $("#si-event-cancel-edit");
  let eventsCache = [];
  let imagesCache = [];

window.addEventListener("si:image-picked", (event) => {
  const image = event.detail?.image;

  if (!image?.id) return;

  imagesCache = [
    image,
    ...imagesCache.filter(
      (item) => Number(item.id) !== Number(image.id)
    )
  ];
});
  let galleryState = [];
  let siteSlotState = new Map();

  const siteSlots = [
    ["liturgia", "Vida litúrgica"],
    ["pastoral", "Pastoral"],
    ["espiritualidad", "Espiritualidad"],
    ["nosotros", "Nosotros"],
    ["historia_arquitectura", "Historia · Arquitectura"],
    ["historia_capilla", "Historia · Capilla"]
  ];

  async function loadImagesLibrary() {
    const { images = [] } = await api("/api/admin/media/images");
    imagesCache = images;

    return images;
  }

  function imageOptions(selected = "") {
    return `
      <option value="">Conservar actual / sin fotografía</option>
      ${imagesCache.map((image) => `
        <option
          value="${image.id}"
          ${String(image.id) === String(selected) ? "selected" : ""}
        >
          ${escapeHtml(image.alt_text || `Fotografía ${image.id}`)}
        </option>
      `).join("")}
    `;
  }

  async function loadEvents() {
    const [{ events }, images] = await Promise.all([
      api("/api/admin/editorial/events"),
      loadImagesLibrary()
    ]);

    eventsCache = events;

    const select = $("#si-event-image");
    if (select) select.innerHTML = imageOptions(select.value);

    renderEventList();
  }

  function renderEventList() {
    const list = $("#si-event-list");

    if (!eventsCache.length) {
      list.innerHTML = `<p class="help-text">Todavía no hay eventos.</p>`;
      return;
    }

    list.innerHTML = eventsCache.map((event) => `
      <article class="si-editorial-item">
        ${event.image_url ? `
          <img
            src="${escapeHtml(event.image_url)}"
            alt="${escapeHtml(event.image_alt || "")}"
          >
        ` : ""}

        <div>
          <p class="si-editorial-item-meta">
            ${escapeHtml(event.event_type || "Evento")}
            · ${escapeHtml(formatDate(event.starts_at))}
          </p>

          <strong>${escapeHtml(event.title)}</strong>

          <small>
            ${event.published ? "Publicado" : "Borrador"}
            ${event.featured_home ? " · Portada" : ""}
          </small>

          <div class="si-editorial-actions">
            <button
              type="button"
              class="secondary-button"
              data-event-edit="${event.id}"
            >
              Editar
            </button>

            <button
              type="button"
              class="secondary-button"
              data-event-toggle="${event.id}"
            >
              ${event.published ? "Despublicar" : "Publicar"}
            </button>

            <button
              type="button"
              class="secondary-button si-danger-button"
              data-event-delete="${event.id}"
            >
              Borrar
            </button>
          </div>
        </div>
      </article>
    `).join("");

    $$("[data-event-edit]", list).forEach((button) => {
      button.addEventListener("click", () => editEvent(Number(button.dataset.eventEdit)));
    });

    $$("[data-event-toggle]", list).forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.eventToggle);
        const event = eventsCache.find((item) => Number(item.id) === id);
        if (!event) return;

        await saveExistingEvent(event, {
          published: !event.published
        });

        await loadEvents();
      });
    });

    $$("[data-event-delete]", list).forEach((button) => {
      button.addEventListener("click", async () => {
        const id = Number(button.dataset.eventDelete);
        const event = eventsCache.find((item) => Number(item.id) === id);
        if (!event) return;

        if (!confirm(`¿Borrar “${event.title}”?`)) return;

        await api(`/api/admin/editorial/events/${id}`, {
          method: "DELETE"
        });

        await loadEvents();
      });
    });
  }

  function editEvent(id) {
    const event = eventsCache.find((item) => Number(item.id) === Number(id));
    if (!event) return;

    const form = eventForm.elements;

    form.id.value = event.id;
    form.event_type.value = event.event_type || "Evento";
    form.sort_order.value = Number(event.sort_order || 0);
    form.title.value = event.title || "";
    form.excerpt.value = event.excerpt || "";
    form.starts_at.value = toLocalInput(event.starts_at);
    form.ends_at.value = toLocalInput(event.ends_at);
    form.location.value = event.location || "";
    form.image_media_id.value = event.image_media_id || "";
    form.youtube_url.value = event.youtube_url || "";
    form.body.value = event.body || "";
    form.featured_home.checked = Boolean(event.featured_home);

    cancelEdit.hidden = false;

    eventForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function resetEventForm() {
    eventForm.reset();
    eventForm.elements.id.value = "";
    eventForm.elements.event_type.value = "Evento";
    eventForm.elements.sort_order.value = "0";
    cancelEdit.hidden = true;
  }

  cancelEdit.addEventListener("click", resetEventForm);

  async function saveExistingEvent(event, overrides = {}) {
    const payload = {
      event_type: event.event_type,
      title: event.title,
      excerpt: event.excerpt,
      body: event.body,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      location: event.location,
      image_media_id: event.image_media_id,
      youtube_url: event.youtube_url,
      featured_home: event.featured_home,
      published: event.published,
      sort_order: event.sort_order,
      ...overrides
    };

    return api(`/api/admin/editorial/events/${event.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitter = event.submitter;
    const data = new FormData(eventForm);
    const id = Number(data.get("id") || 0);

    eventStatus.classList.remove("error");
    eventStatus.textContent = "Guardando…";

    const payload = {
      event_type: data.get("event_type"),
      title: data.get("title"),
      excerpt: data.get("excerpt"),
      starts_at: data.get("starts_at")
        ? new Date(data.get("starts_at")).toISOString()
        : null,
      ends_at: data.get("ends_at")
        ? new Date(data.get("ends_at")).toISOString()
        : null,
      location: data.get("location"),
      image_media_id: data.get("image_media_id") || null,
      youtube_url: data.get("youtube_url"),
      body: data.get("body"),
      featured_home: data.get("featured_home") === "on",
      published: submitter?.dataset.saveEvent === "publish",
      sort_order: Number(data.get("sort_order") || 0)
    };

    try {
      await api(
        id
          ? `/api/admin/editorial/events/${id}`
          : "/api/admin/editorial/events",
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );

      eventStatus.textContent = payload.published
        ? "Evento publicado."
        : "Borrador guardado.";

      resetEventForm();
      await loadEvents();
    } catch (error) {
      eventStatus.textContent = error.message;
      eventStatus.classList.add("error");
    }
  });

  $("#si-go-images")?.addEventListener("click", () => {
    $('[data-panel="images"]')?.click();
  });

  async function loadGallery() {
    const [{ items }, images] = await Promise.all([
      api("/api/admin/editorial/gallery"),
      loadImagesLibrary()
    ]);

    galleryState = items.map((item, index) => ({
      media_id: Number(item.media_id),
      caption: item.caption || "",
      alt_text: item.alt_text || item.resolved_alt || "",
      sort_order: index,
      published: item.published !== false,
      image_url: item.image_url || ""
    }));

    const select = $("#si-gallery-image");
    select.innerHTML = `
      <option value="">Selecciona una fotografía</option>
      ${images.map((image) => `
        <option value="${image.id}">
          ${escapeHtml(image.alt_text || `Fotografía ${image.id}`)}
        </option>
      `).join("")}
    `;

    renderGalleryEditor();
  }

  function renderGalleryEditor() {
    const editor = $("#si-gallery-editor");

    if (!galleryState.length) {
      editor.innerHTML = `
        <p class="help-text">
          La galería CMS todavía está vacía. La galería pública actual no se toca.
        </p>
      `;
      return;
    }

    editor.innerHTML = galleryState.map((item, index) => `
      <article class="si-gallery-admin-item">
        ${item.image_url ? `
          <img src="${escapeHtml(item.image_url)}" alt="">
        ` : ""}

        <div>
          <strong>Fotografía ${index + 1}</strong>
          <input
            data-gallery-caption="${index}"
            value="${escapeHtml(item.caption)}"
            placeholder="Pie de foto"
          >

          <div class="si-editorial-actions">
            <button
              type="button"
              class="secondary-button"
              data-gallery-up="${index}"
              ${index === 0 ? "disabled" : ""}
            >
              ↑
            </button>

            <button
              type="button"
              class="secondary-button"
              data-gallery-down="${index}"
              ${index === galleryState.length - 1 ? "disabled" : ""}
            >
              ↓
            </button>

            <button
              type="button"
              class="secondary-button si-danger-button"
              data-gallery-remove="${index}"
            >
              Quitar
            </button>
          </div>
        </div>
      </article>
    `).join("");

    $$("[data-gallery-caption]", editor).forEach((input) => {
      input.addEventListener("input", () => {
        const index = Number(input.dataset.galleryCaption);
        galleryState[index].caption = input.value;
      });
    });

    $$("[data-gallery-up]", editor).forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.galleryUp);
        [galleryState[index - 1], galleryState[index]] =
          [galleryState[index], galleryState[index - 1]];
        renderGalleryEditor();
      });
    });

    $$("[data-gallery-down]", editor).forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.galleryDown);
        [galleryState[index + 1], galleryState[index]] =
          [galleryState[index], galleryState[index + 1]];
        renderGalleryEditor();
      });
    });

    $$("[data-gallery-remove]", editor).forEach((button) => {
      button.addEventListener("click", () => {
        galleryState.splice(Number(button.dataset.galleryRemove), 1);
        renderGalleryEditor();
      });
    });
  }

  $("#si-gallery-add")?.addEventListener("click", () => {
    const select = $("#si-gallery-image");
    const mediaId = Number(select.value || 0);

    if (!mediaId) {
      alert("Selecciona una fotografía.");
      return;
    }

    if (galleryState.some((item) => Number(item.media_id) === mediaId)) {
      alert("Esa fotografía ya está en la galería.");
      return;
    }

    const image = imagesCache.find((item) => Number(item.id) === mediaId);

    galleryState.push({
      media_id: mediaId,
      caption: $("#si-gallery-caption").value.trim(),
      alt_text: image?.alt_text || "",
      sort_order: galleryState.length,
      published: true,
      image_url: image?.secure_url || image?.url || ""
    });

    $("#si-gallery-caption").value = "";
    select.value = "";

    renderGalleryEditor();
  });

  $("#si-gallery-save")?.addEventListener("click", async () => {
    const status = $("#si-gallery-status");

    status.classList.remove("error");
    status.textContent = "Guardando…";

    try {
      await api("/api/admin/editorial/gallery", {
        method: "PUT",
        body: JSON.stringify({
          items: galleryState.map((item, index) => ({
            media_id: item.media_id,
            caption: item.caption,
            alt_text: item.alt_text,
            sort_order: index,
            published: true
          }))
        })
      });

      status.textContent = "Galería guardada.";
      await loadGallery();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  });

  async function loadSiteImages() {
    const [{ slots }, images] = await Promise.all([
      api("/api/admin/editorial/images"),
      loadImagesLibrary()
    ]);

    siteSlotState = new Map(
      slots.map((item) => [item.slot, item])
    );

    const editor = $("#si-site-image-editor");

    editor.innerHTML = siteSlots.map(([slot, label]) => {
      const current = siteSlotState.get(slot) || {};

      return `
        <label class="si-site-image-row">
          <span>${escapeHtml(label)}</span>

          <select data-site-slot="${escapeHtml(slot)}">
            ${imageOptions(current.media_id || "")}
          </select>

          <input
            data-site-alt="${escapeHtml(slot)}"
            value="${escapeHtml(current.alt_text || "")}"
            placeholder="Descripción accesible opcional"
          >
        </label>
      `;
    }).join("");
  }

  $("#si-site-images-save")?.addEventListener("click", async () => {
    const status = $("#si-site-images-status");

    status.classList.remove("error");
    status.textContent = "Guardando…";

    const slots = siteSlots.map(([slot]) => ({
      slot,
      media_id: $(`[data-site-slot="${slot}"]`)?.value || null,
      alt_text: $(`[data-site-alt="${slot}"]`)?.value || ""
    }));

    try {
      await api("/api/admin/editorial/images", {
        method: "PUT",
        body: JSON.stringify({ slots })
      });

      status.textContent = "Fotografías guardadas.";
      await loadSiteImages();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  });

  $("#si-site-images-go-library")?.addEventListener("click", () => {
    $('[data-panel="images"]')?.click();
  });
})();
/* END SAN IGNACIO EDITORIAL ADMIN V8 */
