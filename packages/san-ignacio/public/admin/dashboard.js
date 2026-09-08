const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const panelTitles = {
  overview: "Resumen",
  pastoral: "Mensaje pastoral",
  schedules: "Horarios",
  notices: "Avisos",
  images: "Imágenes"
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
  const { posts } = await api("/api/admin/pastoral");
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
await initSession();
await loadOverview();
