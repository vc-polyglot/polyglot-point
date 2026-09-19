/* SAN IGNACIO EDITORIAL PUBLIC V8 */
(() => {
  "use strict";

  const api = async (path) => {
    const response = await fetch(path, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`No se pudo cargar ${path}.`);
    }

    return response.json();
  };

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const formatEventDate = (value) => {
    if (!value) return "";

    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return "";
    }
  };

  const youtubeEmbedUrl = (value) => {
    if (!value) return "";

    try {
      const parsed = new URL(value);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      let id = "";

      if (host === "youtu.be") {
        id = parsed.pathname.split("/").filter(Boolean)[0] || "";
      } else if (host === "youtube.com" || host === "m.youtube.com") {
        if (parsed.pathname === "/watch") {
          id = parsed.searchParams.get("v") || "";
        } else {
          const parts = parsed.pathname.split("/").filter(Boolean);
          if (["embed", "shorts", "live"].includes(parts[0])) {
            id = parts[1] || "";
          }
        }
      }

      if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return "";

      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    } catch {
      return "";
    }
  };

  function renderSchedules(schedules = []) {
    const section = document.querySelector("#liturgia");

    if (!section || !Array.isArray(schedules) || !schedules.length) return;

    const cleaned = schedules
      .filter((item) => item && item.day_label && item.time_label)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    if (!cleaned.length) return;

    const grouped = [];

    for (const item of cleaned) {
      const day = String(item.day_label || "").trim();
      const time = String(item.time_label || "").trim();
      const detail = String(item.detail || "").trim();
      const existing = grouped.find((entry) => entry.day === day);

      if (existing) {
        if (time && !existing.times.includes(time)) existing.times.push(time);
        if (detail && !existing.details.includes(detail)) existing.details.push(detail);
      } else {
        grouped.push({
          day,
          times: time ? [time] : [],
          details: detail ? [detail] : []
        });
      }
    }

    if (!grouped.length) return;

    const normalize = (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    const qualifies = (element) => {
      if (!element || element === section || element.classList.contains("si-editorial-schedule")) {
        return false;
      }

      const value = normalize(element.textContent);

      return value.includes("lunes a viernes") &&
        value.includes("sabado") &&
        value.includes("domingo") &&
        /\b\d{1,2}:\d{2}\b/.test(value);
    };

    const candidates = [...section.querySelectorAll("div, article, aside, section")]
      .filter(qualifies);

    const leafCandidates = candidates.filter((candidate) =>
      !candidates.some((other) => other !== candidate && candidate.contains(other))
    );

    const anchor = leafCandidates[0] || section.querySelector("#schedule-grid");

    section.querySelectorAll(".si-editorial-schedule").forEach((node) => node.remove());

    const container = document.createElement("div");
    container.className = "si-editorial-schedule";

    container.innerHTML = `
      <div class="si-editorial-schedule-heading">
        <p class="section-kicker">Horarios de misa</p>
        <h2>Celebración de la Eucaristía</h2>
      </div>

      <div class="si-editorial-schedule-rows">
        ${grouped.map((item) => `
          <div class="si-editorial-schedule-row">
            <strong>${escapeHtml(item.day)}</strong>
            <span>${escapeHtml(item.times.join(" · "))}</span>
            ${item.details.length ? `
              <small>${escapeHtml(item.details.join(" · "))}</small>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;

    if (anchor?.parentElement) {
      anchor.parentElement.insertBefore(container, anchor);
    } else {
      const heading = section.querySelector("h1, h2");
      if (heading?.parentElement && heading.parentElement !== section) {
        heading.parentElement.insertAdjacentElement("afterend", container);
      } else {
        section.prepend(container);
      }
    }

    leafCandidates.forEach((candidate) => {
      candidate.hidden = true;
      candidate.setAttribute("aria-hidden", "true");
    });

    const legacyGrid = section.querySelector("#schedule-grid");
    if (legacyGrid && !container.contains(legacyGrid)) {
      legacyGrid.hidden = true;
      legacyGrid.setAttribute("aria-hidden", "true");
    }
  }

  function buildFeaturedSlides(events = [], notices = []) {
    const eventSlides = events.map((event) => ({
      kind: "event",
      kicker: [
        event.event_type,
        formatEventDate(event.starts_at)
      ].filter(Boolean).join(" · "),
      title: event.title,
      body: event.excerpt || event.location || "",
      image: event.image_url || "",
      alt: event.image_alt || event.title || "",
      href: "/agenda"
    }));

    const noticeSlides = notices.map((notice) => ({
      kind: "notice",
      kicker: "Aviso",
      title: notice.title,
      body: notice.body || "",
      image: "",
      alt: "",
      href: "/vida-liturgica"
    }));

    return [...eventSlides, ...noticeSlides].slice(0, 8);
  }

  function renderFeaturedCarousel(slides) {
    const hero = document.querySelector(".first-screen");

    if (!hero || !slides.length) return;

    let carousel = hero.querySelector(".si-home-carousel");

    if (!carousel) {
      carousel = document.createElement("aside");
      carousel.className = "si-home-carousel";
      carousel.setAttribute("aria-label", "Destacados");
      hero.appendChild(carousel);
    }

    hero.classList.add("has-editorial-carousel");

    carousel.innerHTML = `
      <div class="si-home-carousel-stage">
        ${slides.map((slide, index) => `
          <article
            class="si-home-slide${index === 0 ? " is-active" : ""}"
            data-slide="${index}"
            aria-hidden="${index === 0 ? "false" : "true"}"
          >
            <a class="si-home-slide-link" href="${escapeHtml(slide.href)}">
              <div class="si-home-slide-copy">
                <p>${escapeHtml(slide.kicker)}</p>
                <h2>${escapeHtml(slide.title)}</h2>
                ${slide.body ? `<span>${escapeHtml(slide.body)}</span>` : ""}
              </div>
              ${slide.image ? `
                <img
                  src="${escapeHtml(slide.image)}"
                  alt="${escapeHtml(slide.alt)}"
                  loading="eager"
                >
              ` : ""}
            </a>
          </article>
        `).join("")}
      </div>

      ${slides.length > 1 ? `
        <div class="si-home-carousel-dots" aria-label="Cambiar destacado">
          ${slides.map((_, index) => `
            <button
              type="button"
              class="${index === 0 ? "is-active" : ""}"
              data-slide-dot="${index}"
              aria-label="Mostrar destacado ${index + 1}"
              aria-current="${index === 0 ? "true" : "false"}"
            ></button>
          `).join("")}
        </div>
      ` : ""}
    `;

    if (slides.length < 2) return;

    const slideNodes = [...carousel.querySelectorAll(".si-home-slide")];
    const dots = [...carousel.querySelectorAll("[data-slide-dot]")];
    let active = 0;
    let timer = null;

    const show = (index) => {
      active = (index + slides.length) % slides.length;

      slideNodes.forEach((node, idx) => {
        const selected = idx === active;
        node.classList.toggle("is-active", selected);
        node.setAttribute("aria-hidden", selected ? "false" : "true");
      });

      dots.forEach((dot, idx) => {
        const selected = idx === active;
        dot.classList.toggle("is-active", selected);
        dot.setAttribute("aria-current", selected ? "true" : "false");
      });
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      timer = window.setInterval(() => show(active + 1), 7000);
    };

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        show(Number(dot.dataset.slideDot || 0));
        start();
      });
    });

    carousel.addEventListener("pointerenter", stop);
    carousel.addEventListener("pointerleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);

    start();
  }

  function renderAgenda(events) {
    const section = document.querySelector("#musica");
    if (!section) return;

    section.classList.add("si-agenda-section");

    if (!events.length) {
      section.innerHTML = `
        <div class="si-agenda-heading">
          <p class="section-kicker">Vida de la comunidad</p>
          <h2>Agenda y eventos</h2>
        </div>
        <p class="si-agenda-empty">
          No hay eventos publicados por el momento.
        </p>
      `;
      return;
    }

    const now = Date.now();
    const upcoming = events.filter((event) => {
      const starts = new Date(event.starts_at).getTime();
      return Number.isFinite(starts) && starts >= now - 12 * 60 * 60 * 1000;
    });

    const past = events.filter((event) => !upcoming.includes(event));

    const cards = (items) => items.map((event) => {
      const embed = youtubeEmbedUrl(event.youtube_url);

      return `
        <article class="si-event-card">
          ${event.image_url ? `
            <figure>
              <img
                src="${escapeHtml(event.image_url)}"
                alt="${escapeHtml(event.image_alt || event.title)}"
                loading="lazy"
              >
            </figure>
          ` : ""}

          <div class="si-event-card-copy">
            <p class="si-event-meta">
              ${escapeHtml(event.event_type || "Evento")}
              · ${escapeHtml(formatEventDate(event.starts_at))}
            </p>

            <h3>${escapeHtml(event.title)}</h3>

            ${event.location ? `
              <p class="si-event-location">${escapeHtml(event.location)}</p>
            ` : ""}

            ${event.excerpt ? `
              <p class="si-event-excerpt">${escapeHtml(event.excerpt)}</p>
            ` : ""}

            ${embed ? `
              <div class="si-event-video">
                <iframe
                  src="${escapeHtml(embed)}"
                  title="${escapeHtml(event.title)}"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                ></iframe>
              </div>
            ` : ""}

            ${event.body ? `
              <div class="si-event-body">${escapeHtml(event.body)}</div>
            ` : ""}
          </div>
        </article>
      `;
    }).join("");

    section.innerHTML = `
      <div class="si-agenda-heading">
        <p class="section-kicker">Vida de la comunidad</p>
        <h2>Agenda y eventos</h2>
      </div>

      ${upcoming.length ? `
        <div class="si-agenda-group">
          <h3>Próximos</h3>
          <div class="si-event-grid">${cards(upcoming)}</div>
        </div>
      ` : ""}

      ${past.length ? `
        <div class="si-agenda-group si-agenda-past">
          <h3>Anteriores</h3>
          <div class="si-event-grid">${cards(past.slice(0, 12))}</div>
        </div>
      ` : ""}
    `;
  }

  function applyImageSlots(slots) {
    const mapping = {
      liturgia: [
        "#liturgia .site-section-photo--liturgia img"
      ],
      pastoral: [
        "#pastoral .site-section-photo--pastoral img",
        "#pastoral .pastoral-image img"
      ],
      espiritualidad: [
        "#espiritualidad .site-section-photo--espiritualidad img"
      ],
      nosotros: [
        "#nosotros .community-directory-photo img",
        "#nosotros .site-section-photo--nosotros img"
      ],
      historia_arquitectura: [
        "#historia #about-image img"
      ],
      historia_capilla: [
        "#historia .site-section-photo--capilla img"
      ]
    };

    for (const slot of slots) {
      if (!slot.image_url || !mapping[slot.slot]) continue;

      let target = null;

      for (const selector of mapping[slot.slot]) {
        target = document.querySelector(selector);
        if (target) break;
      }

      if (target) {
        target.src = slot.image_url;
        target.alt = slot.resolved_alt || slot.alt_text || "";
      } else if (slot.slot === "historia_arquitectura") {
        const container = document.querySelector("#historia #about-image");
        if (container) {
          container.innerHTML = `
            <img
              src="${escapeHtml(slot.image_url)}"
              alt="${escapeHtml(slot.resolved_alt || "")}"
              loading="lazy"
            >
          `;
          container.classList.add("has-image");
        }
      }
    }
  }

  function renderGallery(items) {
    const section = document.querySelector("#galeria");
    if (!section || !items.length) return;

    const first = items[0];

    section.innerHTML = `
      <div class="si-editorial-gallery-shell">
        <p class="section-kicker">Archivo visual</p>
        <h2>Galería</h2>

        <button
          type="button"
          class="si-editorial-gallery-cover"
          aria-label="Abrir galería"
        >
          <img
            src="${escapeHtml(first.image_url)}"
            alt="${escapeHtml(first.alt_text || first.caption || "")}"
          >
          <span>${items.length} fotografías · Abrir galería</span>
        </button>
      </div>
    `;

    const lightbox = document.createElement("div");
    lightbox.className = "si-editorial-lightbox";
    lightbox.hidden = true;

    lightbox.innerHTML = `
      <div class="si-editorial-lightbox-counter"></div>
      <button type="button" class="si-editorial-lightbox-close" aria-label="Cerrar">×</button>
      <button type="button" class="si-editorial-lightbox-prev" aria-label="Anterior">‹</button>
      <img class="si-editorial-lightbox-image" alt="">
      <button type="button" class="si-editorial-lightbox-next" aria-label="Siguiente">›</button>
      <div class="si-editorial-lightbox-caption"></div>
    `;

    document.body.appendChild(lightbox);

    const image = lightbox.querySelector(".si-editorial-lightbox-image");
    const counter = lightbox.querySelector(".si-editorial-lightbox-counter");
    const caption = lightbox.querySelector(".si-editorial-lightbox-caption");
    let index = 0;
    let touchX = null;

    const show = (nextIndex) => {
      index = (nextIndex + items.length) % items.length;
      const item = items[index];

      image.src = item.image_url;
      image.alt = item.alt_text || item.caption || "";
      counter.textContent = `${index + 1} / ${items.length}`;
      caption.textContent = item.caption || "";
    };

    const open = () => {
      show(index);
      lightbox.hidden = false;
      document.documentElement.classList.add("si-lightbox-open");
    };

    const close = () => {
      lightbox.hidden = true;
      document.documentElement.classList.remove("si-lightbox-open");
    };

    section.querySelector(".si-editorial-gallery-cover")
      ?.addEventListener("click", open);

    lightbox.querySelector(".si-editorial-lightbox-close")
      ?.addEventListener("click", close);

    lightbox.querySelector(".si-editorial-lightbox-prev")
      ?.addEventListener("click", () => show(index - 1));

    lightbox.querySelector(".si-editorial-lightbox-next")
      ?.addEventListener("click", () => show(index + 1));

    image.addEventListener("click", () => show(index + 1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });

    lightbox.addEventListener("touchstart", (event) => {
      touchX = event.touches[0]?.clientX ?? null;
    }, { passive: true });

    lightbox.addEventListener("touchend", (event) => {
      if (touchX === null) return;
      const endX = event.changedTouches[0]?.clientX ?? touchX;
      const delta = endX - touchX;
      touchX = null;

      if (Math.abs(delta) < 50) return;
      show(delta > 0 ? index - 1 : index + 1);
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;

      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);
    });
  }

  async function init() {
    try {
      const [
        { events, notices },
        { events: agenda },
        { slots },
        { items },
        { schedules = [] }
      ] = await Promise.all([
        api("/api/editorial/home"),
        api("/api/editorial/events"),
        api("/api/editorial/images"),
        api("/api/editorial/gallery"),
        api("/api/home")
      ]);

      renderFeaturedCarousel(buildFeaturedSlides(events, notices));
      renderSchedules(schedules);
      renderAgenda(agenda);
      applyImageSlots(slots);
      renderGallery(items);

      // site.js también carga contenido al inicio. Esta segunda pasada deja
      // Agenda y Horarios como estado final sin tocar el código histórico.
      window.setTimeout(() => {
        renderSchedules(schedules);
        renderAgenda(agenda);
      }, 1200);
    } catch (error) {
      console.error("Editorial CMS:", error);
    }
  }

  init();
})();
/* END SAN IGNACIO EDITORIAL PUBLIC V8 */
