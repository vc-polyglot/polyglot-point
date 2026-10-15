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
      throw new Error(payload?.error || "No se pudo completar la operación.");
    }

    return payload;
  }

  let state = {
    content: [],
    pastoral_categories: [],
    rectors: []
  };

  const contentBySlug = () =>
    new Map((state.content || []).map((item) => [item.slug, item]));

  async function refresh() {
    state = await api("/api/admin/reconversion");
    renderAll();
    return state;
  }

  function contentFormHtml(item) {
    return `
      <form class="si-managed-admin-card form-stack" data-managed-content="${escapeHtml(item.slug)}">
        <h3>${escapeHtml(item.title)}</h3>

        <label>
          Título
          <input name="title" maxlength="220" value="${escapeHtml(item.title || "")}" required>
        </label>

        <label>
          Texto
          <textarea name="body" rows="10">${escapeHtml(item.body || "")}</textarea>
        </label>

        <label class="checkbox-label">
          <input name="published" type="checkbox" value="1" ${item.published ? "checked" : ""}>
          Publicado
        </label>

        <button type="submit">Guardar</button>
        <p class="form-status" role="status"></p>
      </form>
    `;
  }

  function renderIntention() {
    const form = $("#mass-intentions-form");
    if (!form) return;

    const item = contentBySlug().get("mass-intentions");
    if (!item) return;

    form.elements.title.value = item.title || "";
    form.elements.body.value = item.body || "";
    form.elements.published.checked = Boolean(item.published);
  }

  function renderWater() {
    const form = $("#water-content-form");
    if (!form) return;

    const item = contentBySlug().get("agua-san-ignacio");
    if (!item) return;

    form.elements.title.value = item.title || "";
    form.elements.body.value = item.body || "";
    form.elements.published.checked = Boolean(item.published);
  }

  function renderSacraments() {
    const container = $("#sacrament-admin-list");
    if (!container) return;

    const items = (state.content || [])
      .filter((item) => item.group_key === "sacrament")
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    container.innerHTML = items.length
      ? items.map(contentFormHtml).join("")
      : `<p class="help-text">No hay sacramentos configurados.</p>`;
  }

  function renderHistoryContent() {
    const container = $("#history-content-admin");
    if (!container) return;

    const order = [
      "history-patria",
      "history-capilla",
      "history-arquitectura"
    ];

    const map = contentBySlug();
    const items = order.map((slug) => map.get(slug)).filter(Boolean);

    container.innerHTML = items.map(contentFormHtml).join("");
  }

  function renderPastoralCategories() {
    const list = $("#pastoral-category-list");
    if (!list) return;

    if (!state.pastoral_categories?.length) {
      list.innerHTML = `
        <div class="empty-library">
          Todavía no hay subcategorías pastorales.
        </div>
      `;
      return;
    }

    list.innerHTML = state.pastoral_categories.map((item) => `
      <article class="list-item">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
        ${item.contact ? `<small>${escapeHtml(item.contact)}</small>` : ""}
        <small>
          Orden ${Number(item.sort_order || 0)}
          · ${item.published ? "Publicado" : "Oculto"}
        </small>

        <div class="si-reconversion-item-actions">
          <button
            type="button"
            class="secondary-button"
            data-pastoral-edit="${item.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="secondary-button"
            data-pastoral-delete="${item.id}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");
  }

  function renderRectors() {
    const list = $("#rector-list");
    if (!list) return;

    if (!state.rectors?.length) {
      list.innerHTML = `
        <div class="empty-library">
          Todavía no hay rectores cargados.
        </div>
      `;
      return;
    }

    list.innerHTML = state.rectors.map((item) => `
      <article class="list-item">
        <strong>${escapeHtml(item.name)}</strong>
        ${item.period ? `<small>${escapeHtml(item.period)}</small>` : ""}
        ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
        <small>
          Orden ${Number(item.sort_order || 0)}
          · ${item.published ? "Publicado" : "Oculto"}
        </small>

        <div class="si-reconversion-item-actions">
          <button
            type="button"
            class="secondary-button"
            data-rector-edit="${item.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="secondary-button"
            data-rector-delete="${item.id}"
          >
            Eliminar
          </button>
        </div>
      </article>
    `).join("");
  }

  function renderAll() {
    renderIntention();
    renderWater();
    renderSacraments();
    renderHistoryContent();
    renderPastoralCategories();
    renderRectors();
  }

  async function saveContent(slug, form, status) {
    const data = new FormData(form);

    status.classList.remove("error");
    status.textContent = "Guardando…";

    try {
      await api(`/api/admin/reconversion/content/${encodeURIComponent(slug)}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.get("title"),
          body: data.get("body"),
          published: Boolean(data.get("published"))
        })
      });

      status.textContent = "Guardado.";
      await refresh();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  }

  $("#mass-intentions-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveContent(
      "mass-intentions",
      event.currentTarget,
      $("#mass-intentions-status")
    );
  });

  $("#water-content-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveContent(
      "agua-san-ignacio",
      event.currentTarget,
      $("#water-content-status")
    );
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-managed-content]");
    if (!form) return;

    event.preventDefault();

    const status = $(".form-status", form);
    await saveContent(form.dataset.managedContent, form, status);
  });

  function resetPastoralForm() {
    const form = $("#pastoral-category-form");
    if (!form) return;

    form.reset();
    form.elements.id.value = "";
    form.elements.sort_order.value = "0";
    form.elements.published.checked = true;
    $("#pastoral-category-cancel").hidden = true;
    $("#pastoral-category-status").textContent = "";
  }

  $("#pastoral-category-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const id = Number(data.get("id") || 0);
    const status = $("#pastoral-category-status");

    status.classList.remove("error");
    status.textContent = "Guardando…";

    try {
      await api(
        id
          ? `/api/admin/reconversion/pastoral-categories/${id}`
          : "/api/admin/reconversion/pastoral-categories",
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify({
            title: data.get("title"),
            summary: data.get("summary"),
            body: data.get("body"),
            contact: data.get("contact"),
            sort_order: Number(data.get("sort_order") || 0),
            published: Boolean(data.get("published"))
          })
        }
      );

      resetPastoralForm();
      status.textContent = "Área pastoral guardada.";
      await refresh();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  });

  $("#pastoral-category-cancel")?.addEventListener("click", resetPastoralForm);

  function resetRectorForm() {
    const form = $("#rector-form");
    if (!form) return;

    form.reset();
    form.elements.id.value = "";
    form.elements.sort_order.value = "0";
    form.elements.published.checked = true;
    $("#rector-cancel").hidden = true;
    $("#rector-status").textContent = "";
  }

  $("#rector-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const id = Number(data.get("id") || 0);
    const status = $("#rector-status");

    status.classList.remove("error");
    status.textContent = "Guardando…";

    try {
      await api(
        id
          ? `/api/admin/reconversion/rectors/${id}`
          : "/api/admin/reconversion/rectors",
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify({
            name: data.get("name"),
            period: data.get("period"),
            body: data.get("body"),
            sort_order: Number(data.get("sort_order") || 0),
            published: Boolean(data.get("published"))
          })
        }
      );

      resetRectorForm();
      status.textContent = "Rector guardado.";
      await refresh();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  });

  $("#rector-cancel")?.addEventListener("click", resetRectorForm);

  document.addEventListener("click", async (event) => {
    const pastoralEdit = event.target.closest("[data-pastoral-edit]");
    const pastoralDelete = event.target.closest("[data-pastoral-delete]");
    const rectorEdit = event.target.closest("[data-rector-edit]");
    const rectorDelete = event.target.closest("[data-rector-delete]");

    if (pastoralEdit) {
      const item = state.pastoral_categories.find(
        (entry) => Number(entry.id) === Number(pastoralEdit.dataset.pastoralEdit)
      );

      if (!item) return;

      const form = $("#pastoral-category-form");
      form.elements.id.value = item.id;
      form.elements.title.value = item.title || "";
      form.elements.summary.value = item.summary || "";
      form.elements.body.value = item.body || "";
      form.elements.contact.value = item.contact || "";
      form.elements.sort_order.value = item.sort_order || 0;
      form.elements.published.checked = Boolean(item.published);
      $("#pastoral-category-cancel").hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (pastoralDelete) {
      if (!confirm("¿Eliminar definitivamente esta área pastoral?")) return;

      await api(
        `/api/admin/reconversion/pastoral-categories/${pastoralDelete.dataset.pastoralDelete}`,
        { method: "DELETE" }
      );

      await refresh();
      return;
    }

    if (rectorEdit) {
      const item = state.rectors.find(
        (entry) => Number(entry.id) === Number(rectorEdit.dataset.rectorEdit)
      );

      if (!item) return;

      const form = $("#rector-form");
      form.elements.id.value = item.id;
      form.elements.name.value = item.name || "";
      form.elements.period.value = item.period || "";
      form.elements.body.value = item.body || "";
      form.elements.sort_order.value = item.sort_order || 0;
      form.elements.published.checked = Boolean(item.published);
      $("#rector-cancel").hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (rectorDelete) {
      if (!confirm("¿Eliminar definitivamente este rector de la cronología?")) return;

      await api(
        `/api/admin/reconversion/rectors/${rectorDelete.dataset.rectorDelete}`,
        { method: "DELETE" }
      );

      await refresh();
    }
  });

  const panelTitles = {
    schedules: "Vida litúrgica",
    sacraments: "Sacramentos",
    pastoral: "Pastoral",
    institutional: "Nosotros",
    water: "Agua de San Ignacio",
    history: "Historia"
  };

  $$("[data-panel]").forEach((button) => {
    button.addEventListener("click", async () => {
      const panel = button.dataset.panel;
      if (panelTitles[panel]) {
        $("#panel-title").textContent = panelTitles[panel];
      }

      if (["schedules", "sacraments", "pastoral", "water", "history"].includes(panel)) {
        try {
          await refresh();
        } catch (error) {
          console.error("Reconversión admin:", error);
        }
      }
    });
  });

  function reorderSidebar() {
    const nav = $(".admin-sidebar nav");
    if (!nav) return;

    const byPanel = (name) => nav.querySelector(`[data-panel="${name}"]`);
    const editorial = (name) => nav.querySelector(`[data-editorial-panel="${name}"]`);

    const order = [
      byPanel("overview"),
      byPanel("schedules"),
      byPanel("sacraments"),
      byPanel("pastoral"),
      editorial("agenda"),
      byPanel("institutional"),
      byPanel("water"),
      byPanel("history"),
      editorial("gallery"),
      byPanel("notices"),
      byPanel("images"),
      editorial("site-images"),
      byPanel("contact")
    ].filter(Boolean);

    order.forEach((node) => nav.appendChild(node));
  }

  window.setTimeout(reorderSidebar, 0);
})();
