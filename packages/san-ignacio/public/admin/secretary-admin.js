(() => {
  "use strict";

  let noticesCache = [];
  let editingNoticeId = null;
  let formDirty = false;

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(options.body &&
        !(options.body instanceof FormData)
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

    const payload =
      response.status === 204
        ? null
        : await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        "No se pudo completar la operación."
      );
    }

    return payload;
  }

  function toDatetimeLocal(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const pad = (number) =>
      String(number).padStart(2, "0");

    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  }

  function noticeForm() {
    return $("#notice-form");
  }

  function noticeImageInput() {
    return $("#notice-image-media-id");
  }

  function noticeHeading() {
    return $("#notice-form h2");
  }

  function ensureCancelButton() {
    const form = noticeForm();

    if (!form) return;

    if ($("#notice-edit-cancel")) return;

    const save =
      form.querySelector(
        'button[type="submit"]'
      );

    if (!save) return;

    const row =
      document.createElement("div");

    row.className = "button-row";

    save.parentNode.insertBefore(
      row,
      save
    );

    row.append(save);

    const cancel =
      document.createElement("button");

    cancel.type = "button";
    cancel.id = "notice-edit-cancel";
    cancel.className = "secondary-button";
    cancel.textContent = "Cancelar edición";
    cancel.hidden = true;

    row.append(cancel);

    cancel.addEventListener(
      "click",
      resetNoticeEditor
    );
  }

  function resetNoticeEditor() {
    const form = noticeForm();

    if (!form) return;

    editingNoticeId = null;
    formDirty = false;

    form.reset();

    const imageInput =
      noticeImageInput();

    if (imageInput) {
      imageInput.value = "";

      imageInput.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );
    }

    const heading =
      noticeHeading();

    if (heading) {
      heading.textContent =
        "Nuevo aviso";
    }

    const submit =
      form.querySelector(
        'button[type="submit"]'
      );

    if (submit) {
      submit.textContent =
        "Guardar aviso";
    }

    const cancel =
      $("#notice-edit-cancel");

    if (cancel) {
      cancel.hidden = true;
    }

    const status =
      $("#notice-status");

    if (status) {
      status.textContent = "";
      status.classList.remove("error");
    }
  }

  async function refreshNoticesCache() {
    const result =
      await api("/api/admin/notices");

    noticesCache =
      result?.notices || [];

    return noticesCache;
  }

  async function editNotice(id) {
    await refreshNoticesCache();

    const notice =
      noticesCache.find(
        (item) =>
          Number(item.id) === Number(id)
      );

    if (!notice) {
      alert("No encontré ese aviso.");
      return;
    }

    const form =
      noticeForm();

    if (!form) return;

    editingNoticeId =
      Number(notice.id);

    form.elements.title.value =
      notice.title || "";

    form.elements.body.value =
      notice.body || "";

    form.elements.starts_at.value =
      toDatetimeLocal(
        notice.starts_at
      );

    form.elements.ends_at.value =
      toDatetimeLocal(
        notice.ends_at
      );

    form.elements.priority.value =
      Number(notice.priority || 0);

    const imageInput =
      noticeImageInput();

    if (imageInput) {
      imageInput.value =
        notice.image_media_id || "";

      imageInput.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );
    }

    const heading =
      noticeHeading();

    if (heading) {
      heading.textContent =
        "Editar aviso";
    }

    const submit =
      form.querySelector(
        'button[type="submit"]'
      );

    if (submit) {
      submit.textContent =
        "Guardar cambios";
    }

    const cancel =
      $("#notice-edit-cancel");

    if (cancel) {
      cancel.hidden = false;
    }

    formDirty = false;

    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    form.elements.title.focus();
  }

  function enhanceNoticeList() {
    const list =
      $("#notice-list");

    if (!list) return;

    $$(".notice-admin-item", list)
      .forEach((article) => {
        if (
          article.dataset.secretaryEnhanced === "1"
        ) {
          return;
        }

        const deleteButton =
          $(
            "[data-delete-notice]",
            article
          );

        if (!deleteButton) return;

        const id =
          Number(
            deleteButton
              .dataset
              .deleteNotice
          );

        if (!id) return;

        const actions =
          deleteButton.parentElement;

        const edit =
          document.createElement("button");

        edit.type = "button";
        edit.className =
          "secondary-button";
        edit.textContent =
          "Editar";
        edit.dataset.editNotice =
          String(id);

        actions.insertBefore(
          edit,
          deleteButton
        );

        article.dataset.secretaryEnhanced =
          "1";
      });
  }

  document.addEventListener(
    "click",
    async (event) => {
      const edit =
        event.target.closest(
          "[data-edit-notice]"
        );

      if (!edit) return;

      event.preventDefault();

      try {
        await editNotice(
          Number(
            edit.dataset.editNotice
          )
        );
      } catch (error) {
        alert(error.message);
      }
    }
  );

  /*
   * Captura el submit ANTES que dashboard.js.
   * Evita que al editar se cree accidentalmente
   * un aviso nuevo.
   */
  document.addEventListener(
    "submit",
    async (event) => {
      if (
        event.target?.id !==
        "notice-form"
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const form =
        event.target;

      const data =
        new FormData(form);

      const status =
        $("#notice-status");

      status.classList.remove(
        "error"
      );

      status.textContent =
        editingNoticeId
          ? "Guardando cambios…"
          : "Guardando aviso…";

      const starts =
        data.get("starts_at");

      const ends =
        data.get("ends_at");

      try {
        if (
          starts &&
          ends &&
          new Date(ends) <=
            new Date(starts)
        ) {
          throw new Error(
            "La fecha de retiro debe ser posterior a la fecha de publicación."
          );
        }

        const payload = {
          title:
            data.get("title"),
          body:
            data.get("body"),
          starts_at:
            starts
              ? new Date(
                  starts
                ).toISOString()
              : null,
          ends_at:
            ends
              ? new Date(
                  ends
                ).toISOString()
              : null,
          priority:
            Number(
              data.get(
                "priority"
              ) || 0
            ),
          image_media_id:
            Number(
              data.get(
                "image_media_id"
              ) || 0
            ) || null
        };

        const url =
          editingNoticeId
            ? `/api/admin/notices/${editingNoticeId}`
            : "/api/admin/notices";

        await api(url, {
          method:
            editingNoticeId
              ? "PATCH"
              : "POST",

          body:
            JSON.stringify(payload)
        });

        status.textContent =
          editingNoticeId
            ? "Cambios guardados."
            : "Aviso guardado.";

        editingNoticeId = null;
        formDirty = false;

        form.reset();

        const imageInput =
          noticeImageInput();

        if (imageInput) {
          imageInput.value = "";

          imageInput.dispatchEvent(
            new Event("change", {
              bubbles: true
            })
          );
        }

        const heading =
          noticeHeading();

        if (heading) {
          heading.textContent =
            "Nuevo aviso";
        }

        const submit =
          form.querySelector(
            'button[type="submit"]'
          );

        if (submit) {
          submit.textContent =
            "Guardar aviso";
        }

        const cancel =
          $("#notice-edit-cancel");

        if (cancel) {
          cancel.hidden = true;
        }

        /*
         * Reutilizamos la propia navegación existente
         * para obligar a dashboard.js a recargar la lista.
         */
        document
          .querySelector(
            '[data-panel="notices"]'
          )
          ?.click();

        /*
         * Y refrescamos Resumen sin necesidad de
         * conocer funciones privadas de dashboard.js.
         */
        await refreshNoticesCache();

      } catch (error) {
        status.textContent =
          error.message;

        status.classList.add(
          "error"
        );
      }
    },
    true
  );

  function installDirtyTracking() {
    const form =
      noticeForm();

    if (!form) return;

    form.addEventListener(
      "input",
      () => {
        formDirty = true;
      }
    );

    form.addEventListener(
      "change",
      () => {
        formDirty = true;
      }
    );
  }

  window.addEventListener(
    "beforeunload",
    (event) => {
      if (!formDirty) return;

      event.preventDefault();
      event.returnValue = "";
    }
  );

  function cleanSecretaryUi() {
    /*
     * Si algún JS viejo volviera a insertar
     * accesos técnicos, se esconden para Secretaría.
     */
    [
      '[data-panel="music"]',
      '[data-panel="institutional"]'
    ].forEach((selector) => {
      const element =
        document.querySelector(selector);

      if (element) {
        element.remove();
      }
    });

    const callout =
      document.querySelector(
        "#panel-overview .admin-callout"
      );

    if (callout) {
      callout.remove();
    }
  }

  const observer =
    new MutationObserver(() => {
      enhanceNoticeList();
      cleanSecretaryUi();
    });

  function start() {
    ensureCancelButton();
    installDirtyTracking();
    cleanSecretaryUi();
    enhanceNoticeList();

    observer.observe(
      document.body,
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
      { once: true }
    );
  } else {
    start();
  }
})();