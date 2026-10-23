(() => {
  "use strict";

  const CONFIG = {
    "/vida-liturgica": {
      selector: "#intenciones,#jueves-eucaristico,#confesiones",
      mode: "expand"
    },
    "/sacramentos": {
      selector: ".sacx-card",
      mode: "details"
    },
    "/pastoral": {
      selector: ".pasx-programs > article",
      mode: "expand"
    },
    "/nosotros": {
      selector: ".nosx-person",
      mode: "native"
    },
    "/agua-de-san-ignacio": {
      selector: ".agux-steps > div",
      mode: "expand"
    },
    "/historia": {
      selector: ".hisx-block,.hisx-rectors",
      mode: "expand"
    },
    "/contacto": {
      selector: ".conx-info > article",
      mode: "expand"
    }
  };

  const route = () => location.pathname.replace(/\/+$/,"") || "/";
  const config = () => CONFIG[route()] || null;

  function sectors() {
    const c = config();
    return c ? [...document.querySelectorAll(c.selector)] : [];
  }

  function closeAll(except = null) {
    sectors().forEach(el => {
      if (el === except) return;

      el.classList.remove("si-open","si-muted");
      el.setAttribute("aria-expanded","false");

      if (el.tagName === "DETAILS") {
        el.open = false;
      }
    });

    if (!except) {
      document.body.classList.remove("si-sector-active");
    }
  }

  function toggle(target) {
    const c = config();
    if (!c || c.mode === "native") return;

    const wasOpen =
      target.classList.contains("si-open") ||
      (target.tagName === "DETAILS" && target.open);

    if (wasOpen) {
      closeAll();
      return;
    }

    closeAll(target);

    sectors().forEach(el => {
      if (el !== target) el.classList.add("si-muted");
    });

    target.classList.add("si-open");
    target.classList.remove("si-muted");
    target.setAttribute("aria-expanded","true");

    if (target.tagName === "DETAILS") {
      target.open = true;
    }

    document.body.classList.add("si-sector-active");
  }

  function prepare() {
    const c = config();
    if (!c) return;

    sectors().forEach(el => {
      if (el.dataset.siPrepared === "1") return;

      el.dataset.siPrepared = "1";
      el.classList.add("si-interactive");

      if (c.mode !== "native") {
        el.setAttribute("aria-expanded","false");

        if (
          el.tagName !== "BUTTON" &&
          el.tagName !== "A" &&
          el.tagName !== "DETAILS"
        ) {
          el.tabIndex = 0;
          el.setAttribute("role","button");
        }
      }
    });
  }

  document.addEventListener("click", event => {
    const c = config();
    if (!c) return;

    const target = event.target.closest(c.selector);
    if (!target) return;

    /* Nosotros ya tiene su clic propio */
    if (c.mode === "native") return;

    /* No secuestrar controles reales dentro del sector */
    if (
      event.target.closest(
        "a,input,textarea,select,label,button:not(summary)"
      )
    ) {
      return;
    }

    /*
      DETAILS: anulamos el toggle nativo para que
      nuestro motor controle apertura única + atenuación.
    */
    if (
      c.mode === "details" &&
      event.target.closest("summary")
    ) {
      event.preventDefault();
    }

    toggle(target);
  });

  document.addEventListener("keydown", event => {
    const c = config();
    if (!c) return;

    if (event.key === "Escape") {
      closeAll();
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;

    const target = event.target.closest(c.selector);
    if (!target || c.mode === "native") return;

    if (
      event.target.matches(
        "a,input,textarea,select,label,button"
      )
    ) {
      return;
    }

    event.preventDefault();
    toggle(target);
  });

  prepare();

  new MutationObserver(prepare).observe(
    document.documentElement,
    {
      childList:true,
      subtree:true
    }
  );
})();
