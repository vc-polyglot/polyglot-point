const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const panelTitles = {
  overview: "Resumen",
  pastoral: "Mensaje pastoral",
  schedules: "Horarios",
  notices: "Avisos",
  images: "Imágenes",
  music: "Música",
  contact: "Mensajes",
  institutional: "Institucional"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Sin publicar";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
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

async function initSession() {
  const { user } = await api("/api/admin/session");
  if (!user) {
    location.href = "/admin";
    return;
  }

  $("#current-user").textContent = `${user.name} · ${user.role}`;
}

$$(".sidebar-link").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.dataset.panel;

    $$(".sidebar-link").forEach((item) => item.classList.toggle("active", item === button));
    $$(".admin-panel").forEach((item) => item.classList.toggle("active", item.id === `panel-${panel}`));
    $("#panel-title").textContent = panelTitles[panel] || "Administración";

    if (panel === "overview") loadOverview();
    if (panel === "pastoral") loadPastoral();
    if (panel === "schedules") loadSchedules();
    if (panel === "notices") loadNotices();
    if (panel === "images") loadImages();
    if (panel === "music") loadMusicAdmin();
    if (panel === "contact") loadContactMessages();
    if (panel === "institutional") loadInstitutionalAdmin();
  });
});

$("#logout-button").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" });
  location.href = "/admin";
});

async function loadOverview() {
  const data = await api("/api/admin/overview");
  $("#overview-cards").innerHTML = `
    <article>
      <span>${Number(data.pastoral.total || 0)}</span>
      <small>Mensajes pastorales · ${Number(data.pastoral.published || 0)} publicados</small>
    </article>
    <article>
      <span>${Number(data.schedules || 0)}</span>
      <small>Horarios activos</small>
    </article>
    <article>
      <span>${Number(data.notices || 0)}</span>
      <small>Avisos activos</small>
    </article>
  `;
}

async function loadPastoral() {
  const [{ posts }, { images }] = await Promise.all([
    api("/api/admin/pastoral"),
    api("/api/admin/media/images")
  ]);

  const imageSelect = $("#pastoral-image-select");

  if (imageSelect) {
    imageSelect.innerHTML = `
      <option value="">Sin fotografía</option>
      ${images.map((image) => `
        <option value="${image.id}">
          ${escapeHtml(image.alt_text || `Fotografía ${image.id}`)}
        </option>
      `).join("")}
    `;
  }
  const list = $("#pastoral-list");

  if (!posts.length) {
    list.innerHTML = `<div class="list-item">Todavía no hay publicaciones.</div>`;
    return;
  }

  list.innerHTML = posts.map((post) => `
    <article class="list-item">
      <strong>${escapeHtml(post.title)}</strong>
      <small>${escapeHtml(post.author_name || "Sin autor")} · ${formatDate(post.published_at || post.created_at)}</small>
      <span class="status-badge">${escapeHtml(post.status)}</span>
      ${post.status === "draft" ? `<button data-publish-id="${post.id}">Publicar</button>` : ""}
    </article>
  `).join("");

  list.querySelectorAll("[data-publish-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/admin/pastoral/${button.dataset.publishId}/publish`, {
        method: "PATCH"
      });
      await Promise.all([loadPastoral(), loadOverview()]);
    });
  });
}

$("#pastoral-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const status = $("#pastoral-status");
  const submitter = event.submitter;

  status.classList.remove("error");
  status.textContent = "Guardando…";

  try {
    await api("/api/admin/pastoral", {
      method: "POST",
      body: JSON.stringify({
        title: data.get("title"),
        excerpt: data.get("excerpt"),
        author_name: data.get("author_name"),
        image_media_id: data.get("image_media_id") || null,
        youtube_url: data.get("youtube_url") || null,
        body: data.get("body"),
        publish: submitter?.value === "publish"
      })
    });

    form.reset();
    status.textContent = submitter?.value === "publish"
      ? "Mensaje publicado."
      : "Borrador guardado.";

    await Promise.all([loadPastoral(), loadOverview()]);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

function scheduleRow(item = {}, index = 0) {
  const wrapper = document.createElement("div");
  wrapper.className = "schedule-row";

  wrapper.innerHTML = `
    <label>
      Categoría
      <input data-field="category" value="${escapeHtml(item.category || "Misa")}" required>
    </label>
    <label>
      Día
      <input data-field="day_label" value="${escapeHtml(item.day_label || "")}" placeholder="Domingo" required>
    </label>
    <label>
      Hora
      <input data-field="time_label" value="${escapeHtml(item.time_label || "")}" placeholder="12:00" required>
    </label>
    <label>
      Detalle
      <input data-field="detail" value="${escapeHtml(item.detail || "")}" placeholder="Opcional">
    </label>
    <label>
      Orden
      <input data-field="sort_order" type="number" value="${Number(item.sort_order ?? index)}">
    </label>
    <button type="button" class="remove-schedule" aria-label="Eliminar horario">×</button>
  `;

  wrapper.querySelector(".remove-schedule").addEventListener("click", () => wrapper.remove());
  return wrapper;
}

async function loadSchedules() {
  const { schedules } = await api("/api/admin/schedules");
  const editor = $("#schedules-editor");
  editor.innerHTML = "";

  schedules.forEach((item, index) => editor.append(scheduleRow(item, index)));

  if (!schedules.length) {
    editor.append(scheduleRow({}, 0));
  }
}

$("#add-schedule").addEventListener("click", () => {
  const editor = $("#schedules-editor");
  editor.append(scheduleRow({}, editor.children.length));
});

$("#schedules-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#schedules-status");
  status.classList.remove("error");
  status.textContent = "Guardando…";

  const schedules = [...$("#schedules-editor").children].map((row) => ({
    category: row.querySelector('[data-field="category"]').value,
    day_label: row.querySelector('[data-field="day_label"]').value,
    time_label: row.querySelector('[data-field="time_label"]').value,
    detail: row.querySelector('[data-field="detail"]').value,
    sort_order: Number(row.querySelector('[data-field="sort_order"]').value || 0)
  }));

  try {
    await api("/api/admin/schedules", {
      method: "PUT",
      body: JSON.stringify({ schedules })
    });

    status.textContent = "Horarios guardados.";
    await Promise.all([loadSchedules(), loadOverview()]);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

async function loadNotices() {
  const { notices } = await api("/api/admin/notices");
  const list = $("#notice-list");

  if (!notices.length) {
    list.innerHTML = `<div class="list-item">Todavía no hay avisos.</div>`;
    return;
  }

  list.innerHTML = notices.map((notice) => `
    <article class="list-item">
      <strong>${escapeHtml(notice.title)}</strong>
      <small>Prioridad ${Number(notice.priority || 0)} · ${formatDate(notice.created_at)}</small>
      <p>${escapeHtml(notice.body)}</p>
    </article>
  `).join("");
}

$("#notice-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const status = $("#notice-status");
  status.classList.remove("error");
  status.textContent = "Publicando…";

  const localDateToIso = (value) => value ? new Date(value).toISOString() : null;

  try {
    await api("/api/admin/notices", {
      method: "POST",
      body: JSON.stringify({
        title: data.get("title"),
        body: data.get("body"),
        starts_at: localDateToIso(data.get("starts_at")),
        ends_at: localDateToIso(data.get("ends_at")),
        priority: Number(data.get("priority") || 0)
      })
    });

    form.reset();
    status.textContent = "Aviso publicado.";
    await Promise.all([loadNotices(), loadOverview()]);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});


function formatBytes(value) {
  const bytes = Number(value || 0);

  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = -1;

  do {
    size /= 1024;
    unitIndex += 1;
  } while (size >= 1024 && unitIndex < units.length - 1);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function storageMessage(percent) {
  if (percent >= 95) {
    return "Espacio casi agotado. Conviene descargar y borrar fotografías antiguas.";
  }

  if (percent >= 85) {
    return "El almacenamiento comienza a agotarse. Conviene liberar espacio.";
  }

  if (percent >= 70) {
    return "Se ha utilizado más del 70% del archivo de imágenes. Conviene revisar fotografías antiguas.";
  }

  return "Uso normal del archivo de imágenes.";
}

async function loadImages() {
  const { images, storage } = await api("/api/admin/media/images");

  const percent = Number(storage.percent || 0);
  const progress = $("#image-storage-progress");

  progress.value = Math.min(percent, 100);
  progress.classList.toggle("warning", percent >= 70 && percent < 85);
  progress.classList.toggle("high", percent >= 85 && percent < 95);
  progress.classList.toggle("critical", percent >= 95);

  $("#image-storage").textContent =
    `${formatBytes(storage.used_bytes)} de ${formatBytes(storage.quota_bytes)} · ${percent.toFixed(1)}%`;

  $("#image-storage-message").textContent = storageMessage(percent);
  $("#image-count").textContent = `${Number(storage.total || 0)} fotografías`;

  const gallery = $("#image-gallery");

  if (!images.length) {
    gallery.innerHTML = `<div class="empty-library">Todavía no hay fotografías guardadas.</div>`;
    return;
  }

  gallery.innerHTML = images.map((image) => `
    <article class="image-card">
      <div class="image-thumb">
        <img
          src="${escapeHtml(image.secure_url || image.url)}"
          alt="${escapeHtml(image.alt_text || "")}"
          loading="lazy"
        >
      </div>

      <div class="image-card-body">
        <strong>${escapeHtml(image.alt_text || "Sin descripción")}</strong>
        <small>
          ${Number(image.width || 0)} × ${Number(image.height || 0)}
          · ${formatBytes(image.bytes)}
        </small>
        <small>${formatDate(image.created_at)}</small>

        <div class="image-actions">
          <a
            class="secondary-button"
            href="/api/admin/media/images/${image.id}/download"
          >Descargar</a>

          <button
            type="button"
            class="danger-button"
            data-delete-image="${image.id}"
          >Eliminar</button>
        </div>
      </div>
    </article>
  `).join("");

  gallery.querySelectorAll("[data-delete-image]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm(
        "¿Eliminar esta fotografía? Esta acción también la borrará del archivo de imágenes."
      );

      if (!confirmed) return;

      button.disabled = true;

      try {
        await api(`/api/admin/media/images/${button.dataset.deleteImage}`, {
          method: "DELETE"
        });

        await loadImages();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
  });
}

$("#image-upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = $("#image-upload-status");
  const data = new FormData(form);

  status.classList.remove("error");
  status.textContent = "Subiendo y optimizando fotografía…";

  try {
    await api("/api/admin/media/images", {
      method: "POST",
      body: data
    });

    form.reset();
    status.textContent = "Fotografía guardada.";
    await loadImages();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

function musicTypeLabel(value) {
  return {
    recording: "Grabación",
    repertoire: "Repertorio",
    article: "Artículo"
  }[value] || value;
}

function concertStatusLabel(value) {
  return {
    scheduled: "Programado",
    cancelled: "Cancelado",
    completed: "Realizado"
  }[value] || value;
}

async function loadMusicAdmin() {
  const { items, concerts } = await api("/api/admin/music");

  const itemList = $("#music-item-list");
  const concertList = $("#concert-list");

  if (!items.length) {
    itemList.innerHTML =
      `<div class="list-item">Todavía no hay contenido musical.</div>`;
  } else {
    itemList.innerHTML = items.map((item) => `
      <article class="list-item">
        <strong>${escapeHtml(item.title)}</strong>
        <small>
          ${escapeHtml(musicTypeLabel(item.item_type))}
          · orden ${Number(item.sort_order || 0)}
        </small>

        ${item.description
          ? `<p>${escapeHtml(item.description)}</p>`
          : ""
        }

        ${item.youtube_url
          ? `<small>Video de YouTube asociado</small>`
          : ""
        }

        <span class="status-badge">
          ${item.published ? "Publicado" : "Borrador"}
        </span>

        <div class="admin-item-actions">
          <button
            type="button"
            class="secondary-button"
            data-toggle-music="${item.id}"
            data-published="${item.published ? "1" : "0"}"
          >
            ${item.published ? "Ocultar" : "Publicar"}
          </button>

          <button
            type="button"
            class="danger-button"
            data-delete-music="${item.id}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");
  }

  if (!concerts.length) {
    concertList.innerHTML =
      `<div class="list-item">Todavía no hay conciertos registrados.</div>`;
  } else {
    concertList.innerHTML = concerts.map((concert) => `
      <article class="list-item">
        <strong>${escapeHtml(concert.title)}</strong>
        <small>${formatDate(concert.starts_at)}</small>

        ${concert.location
          ? `<small>${escapeHtml(concert.location)}</small>`
          : ""
        }

        ${concert.description
          ? `<p>${escapeHtml(concert.description)}</p>`
          : ""
        }

        <span class="status-badge">
          ${escapeHtml(concertStatusLabel(concert.status))}
        </span>

        <div class="admin-item-actions">
          <button
            type="button"
            class="danger-button"
            data-delete-concert="${concert.id}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");
  }

  itemList.querySelectorAll("[data-toggle-music]").forEach((button) => {
    button.addEventListener("click", async () => {
      const currentlyPublished = button.dataset.published === "1";

      await api(
        `/api/admin/music/items/${button.dataset.toggleMusic}/publish`,
        {
          method: "PATCH",
          body: JSON.stringify({
            published: !currentlyPublished
          })
        }
      );

      await loadMusicAdmin();
    });
  });

  itemList.querySelectorAll("[data-delete-music]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar definitivamente este contenido musical?")) {
        return;
      }

      await api(`/api/admin/music/items/${button.dataset.deleteMusic}`, {
        method: "DELETE"
      });

      await loadMusicAdmin();
    });
  });

  concertList.querySelectorAll("[data-delete-concert]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar definitivamente este concierto?")) {
        return;
      }

      await api(`/api/admin/concerts/${button.dataset.deleteConcert}`, {
        method: "DELETE"
      });

      await loadMusicAdmin();
    });
  });
}

$("#music-item-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const status = $("#music-item-status");

  status.classList.remove("error");
  status.textContent = "Guardando…";

  try {
    await api("/api/admin/music/items", {
      method: "POST",
      body: JSON.stringify({
        item_type: data.get("item_type"),
        title: data.get("title"),
        description: data.get("description"),
        youtube_url: data.get("youtube_url") || null,
        sort_order: Number(data.get("sort_order") || 0),
        published: Boolean(data.get("published"))
      })
    });

    form.reset();
    form.querySelector('[name="sort_order"]').value = "0";

    status.textContent = "Contenido guardado.";
    await loadMusicAdmin();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

$("#concert-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const status = $("#concert-status");

  status.classList.remove("error");
  status.textContent = "Guardando…";

  try {
    const rawDate = data.get("starts_at");

    await api("/api/admin/concerts", {
      method: "POST",
      body: JSON.stringify({
        title: data.get("title"),
        starts_at: rawDate
          ? new Date(rawDate).toISOString()
          : null,
        location: data.get("location"),
        description: data.get("description"),
        status: data.get("status") || "scheduled"
      })
    });

    form.reset();

    status.textContent = "Concierto guardado.";
    await loadMusicAdmin();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

function contactStatusLabel(value) {
  return {
    new: "Nuevo",
    read: "Leído",
    archived: "Archivado"
  }[value] || value;
}

async function loadContactMessages() {
  const container = $("#contact-message-list");

  if (!container) return;

  container.innerHTML = "<p>Cargando mensajes…</p>";

  const { messages } = await api("/api/admin/contact-messages");

  if (!messages.length) {
    container.innerHTML = `
      <div class="empty-library">
        Todavía no hay mensajes recibidos.
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map((message) => `
    <article class="contact-message-card ${message.status === "new" ? "is-new" : ""}">
      <div class="contact-message-top">
        <div>
          <strong>${escapeHtml(message.subject)}</strong>
          <small>
            ${escapeHtml(message.name)}
            · ${escapeHtml(message.email)}
          </small>
          ${message.phone
            ? `<small>${escapeHtml(message.phone)}</small>`
            : ""
          }
        </div>

        <span class="status-badge">
          ${escapeHtml(contactStatusLabel(message.status))}
        </span>
      </div>

      <p class="contact-message-date">
        ${formatDate(message.created_at)}
      </p>

      <p class="contact-message-body">
        ${escapeHtml(message.message)}
      </p>

      <div class="admin-item-actions">
        ${message.status !== "read"
          ? `
            <button
              type="button"
              class="secondary-button"
              data-contact-status="${message.id}"
              data-status="read"
            >
              Marcar leído
            </button>
          `
          : ""
        }

        ${message.status !== "archived"
          ? `
            <button
              type="button"
              class="secondary-button"
              data-contact-status="${message.id}"
              data-status="archived"
            >
              Archivar
            </button>
          `
          : ""
        }

        <a
          class="secondary-button contact-reply-link"
          href="mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}"
        >
          Responder
        </a>

        <button
          type="button"
          class="danger-button"
          data-contact-delete="${message.id}"
        >
          Eliminar
        </button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-contact-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(
        `/api/admin/contact-messages/${button.dataset.contactStatus}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: button.dataset.status
          })
        }
      );

      await loadContactMessages();
    });
  });

  container.querySelectorAll("[data-contact-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar definitivamente este mensaje?")) {
        return;
      }

      await api(
        `/api/admin/contact-messages/${button.dataset.contactDelete}`,
        {
          method: "DELETE"
        }
      );

      await loadContactMessages();
    });
  });
}

$("#refresh-contact-messages")?.addEventListener(
  "click",
  loadContactMessages
);

let institutionalState = {
  sections: [],
  cards: [],
  staff: [],
  images: []
};

function institutionalImageOptions(images, selectedId = null) {
  return `
    <option value="">Sin fotografía</option>
    ${images.map((image) => `
      <option
        value="${image.id}"
        ${Number(selectedId) === Number(image.id) ? "selected" : ""}
      >
        ${escapeHtml(image.alt_text || `Fotografía ${image.id}`)}
      </option>
    `).join("")}
  `;
}

function fillInstitutionalSectionForm(formId, section) {
  const form = $(formId);

  if (!form || !section) return;

  form.elements.eyebrow.value = section.eyebrow || "";
  form.elements.title.value = section.title || "";
  form.elements.body.value = section.body || "";

  if (form.elements.image_media_id) {
    form.elements.image_media_id.innerHTML =
      institutionalImageOptions(
        institutionalState.images,
        section.image_media_id
      );
  }

  form.elements.published.checked = Boolean(section.published);
}

function resetInstitutionalCardForm() {
  const form = $("#institutional-card-form");

  form.reset();
  form.elements.id.value = "";
  form.elements.sort_order.value = "0";
  form.elements.published.checked = true;
  $("#institutional-card-cancel").hidden = true;
}

function resetStaffForm() {
  const form = $("#staff-form");

  form.reset();
  form.elements.id.value = "";
  form.elements.sort_order.value = "0";
  form.elements.published.checked = true;
  form.elements.media_id.innerHTML =
    institutionalImageOptions(institutionalState.images);

  $("#staff-cancel").hidden = true;
}

async function loadInstitutionalAdmin() {
  const [content, media] = await Promise.all([
    api("/api/admin/institutional"),
    api("/api/admin/media/images")
  ]);

  institutionalState = {
    sections: content.sections || [],
    cards: content.cards || [],
    staff: content.staff || [],
    images: media.images || []
  };

  const about = institutionalState.sections.find(
    (section) => section.slug === "about"
  );

  const spirituality = institutionalState.sections.find(
    (section) => section.slug === "spirituality"
  );

  fillInstitutionalSectionForm("#about-form", about);
  fillInstitutionalSectionForm("#spirituality-form", spirituality);

  const staffImageSelect = $("#staff-image-select");

  if (staffImageSelect && !staffImageSelect.value) {
    staffImageSelect.innerHTML =
      institutionalImageOptions(institutionalState.images);
  }

  const cardList = $("#institutional-card-list");

  if (!institutionalState.cards.length) {
    cardList.innerHTML = `
      <div class="empty-library">
        No hay tarjetas de Espiritualidad.
      </div>
    `;
  } else {
    cardList.innerHTML = institutionalState.cards.map((card) => `
      <article class="list-item">
        <strong>
          ${escapeHtml(card.label || "")}
          ${escapeHtml(card.title)}
        </strong>

        ${card.body
          ? `<p>${escapeHtml(card.body)}</p>`
          : ""
        }

        <small>
          Orden ${Number(card.sort_order || 0)}
          · ${card.published ? "Publicado" : "Oculto"}
        </small>

        <div class="admin-item-actions">
          <button
            type="button"
            class="secondary-button"
            data-edit-institutional-card="${card.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="danger-button"
            data-delete-institutional-card="${card.id}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");
  }

  const staffList = $("#staff-list");

  if (!institutionalState.staff.length) {
    staffList.innerHTML = `
      <div class="empty-library">
        No hay integrantes publicados.
      </div>
    `;
  } else {
    staffList.innerHTML = institutionalState.staff.map((member) => `
      <article class="list-item">
        <strong>${escapeHtml(member.name)}</strong>
        <small>${escapeHtml(member.role)}</small>

        ${member.description
          ? `<p>${escapeHtml(member.description)}</p>`
          : ""
        }

        <small>
          Orden ${Number(member.sort_order || 0)}
          · ${member.published ? "Publicado" : "Oculto"}
        </small>

        <div class="admin-item-actions">
          <button
            type="button"
            class="secondary-button"
            data-edit-staff="${member.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="danger-button"
            data-delete-staff="${member.id}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");
  }

  cardList.querySelectorAll("[data-edit-institutional-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = institutionalState.cards.find(
        (item) => Number(item.id) === Number(button.dataset.editInstitutionalCard)
      );

      if (!card) return;

      const form = $("#institutional-card-form");

      form.elements.id.value = card.id;
      form.elements.label.value = card.label || "";
      form.elements.title.value = card.title || "";
      form.elements.body.value = card.body || "";
      form.elements.sort_order.value = card.sort_order || 0;
      form.elements.published.checked = Boolean(card.published);

      $("#institutional-card-cancel").hidden = false;
    });
  });

  cardList.querySelectorAll("[data-delete-institutional-card]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar definitivamente esta tarjeta?")) {
        return;
      }

      await api(
        `/api/admin/institutional/cards/${button.dataset.deleteInstitutionalCard}`,
        {
          method: "DELETE"
        }
      );

      await loadInstitutionalAdmin();
    });
  });

  staffList.querySelectorAll("[data-edit-staff]").forEach((button) => {
    button.addEventListener("click", () => {
      const member = institutionalState.staff.find(
        (item) => Number(item.id) === Number(button.dataset.editStaff)
      );

      if (!member) return;

      const form = $("#staff-form");

      form.elements.id.value = member.id;
      form.elements.name.value = member.name || "";
      form.elements.role.value = member.role || "";
      form.elements.description.value = member.description || "";
      form.elements.sort_order.value = member.sort_order || 0;
      form.elements.published.checked = Boolean(member.published);

      form.elements.media_id.innerHTML =
        institutionalImageOptions(
          institutionalState.images,
          member.media_id
        );

      $("#staff-cancel").hidden = false;
    });
  });

  staffList.querySelectorAll("[data-delete-staff]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("¿Eliminar definitivamente este integrante?")) {
        return;
      }

      await api(
        `/api/admin/institutional/staff/${button.dataset.deleteStaff}`,
        {
          method: "DELETE"
        }
      );

      await loadInstitutionalAdmin();
    });
  });
}

async function saveInstitutionalSection(slug, form, statusElement) {
  const data = new FormData(form);

  statusElement.classList.remove("error");
  statusElement.textContent = "Guardando…";

  try {
    await api(`/api/admin/institutional/sections/${slug}`, {
      method: "PUT",
      body: JSON.stringify({
        eyebrow: data.get("eyebrow"),
        title: data.get("title"),
        body: data.get("body"),
        image_media_id: data.get("image_media_id") || null,
        published: Boolean(data.get("published"))
      })
    });

    statusElement.textContent = "Guardado.";
    await loadInstitutionalAdmin();
  } catch (error) {
    statusElement.textContent = error.message;
    statusElement.classList.add("error");
  }
}

$("#about-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  await saveInstitutionalSection(
    "about",
    event.currentTarget,
    $("#about-status")
  );
});

$("#spirituality-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  await saveInstitutionalSection(
    "spirituality",
    event.currentTarget,
    $("#spirituality-status")
  );
});

$("#institutional-card-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const id = data.get("id");
  const status = $("#institutional-card-status");

  status.classList.remove("error");
  status.textContent = "Guardando…";

  try {
    await api(
      id
        ? `/api/admin/institutional/cards/${id}`
        : "/api/admin/institutional/cards",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({
          section_slug: "spirituality",
          label: data.get("label"),
          title: data.get("title"),
          body: data.get("body"),
          sort_order: Number(data.get("sort_order") || 0),
          published: Boolean(data.get("published"))
        })
      }
    );

    resetInstitutionalCardForm();
    status.textContent = "Tarjeta guardada.";

    await loadInstitutionalAdmin();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

$("#institutional-card-cancel")?.addEventListener(
  "click",
  resetInstitutionalCardForm
);

$("#staff-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const id = data.get("id");
  const status = $("#staff-status");

  status.classList.remove("error");
  status.textContent = "Guardando…";

  try {
    await api(
      id
        ? `/api/admin/institutional/staff/${id}`
        : "/api/admin/institutional/staff",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({
          name: data.get("name"),
          role: data.get("role"),
          description: data.get("description"),
          media_id: data.get("media_id") || null,
          sort_order: Number(data.get("sort_order") || 0),
          published: Boolean(data.get("published"))
        })
      }
    );

    resetStaffForm();
    status.textContent = "Integrante guardado.";

    await loadInstitutionalAdmin();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
});

$("#staff-cancel")?.addEventListener(
  "click",
  resetStaffForm
);
await initSession();
await loadOverview();
