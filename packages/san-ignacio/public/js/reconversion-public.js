(() => {
  "use strict";

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const contentMap = (items = []) =>
    new Map(items.map((item) => [item.slug, item]));

  /* SAN-IGNACIO-STRUCTURED-CONTENT-V8 */
  function renderStructuredManagedBody(body, value, host) {
    const raw = String(value || "").replace(/\r\n?/g, "\n").trim();

    if (!host.closest("#sacramentos, #agua")) {
      body.textContent = raw;
      return;
    }

    body.replaceChildren();
    if (!raw) return;

    const makeList = (items) => {
      const ul = document.createElement("ul");
      ul.className = "si-managed-list";

      for (const value of items) {
        const cleaned = String(value || "")
          .replace(/^[-•▪]\s*/, "")
          .trim();

        if (!cleaned) continue;

        const li = document.createElement("li");
        li.textContent = cleaned;
        ul.appendChild(li);
      }

      if (ul.children.length) body.appendChild(ul);
    };

    const sentenceItems = (value) => {
      const matches = String(value || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g);
      return (matches || [value]).map(item => item.trim()).filter(Boolean);
    };

    const blocks = raw
      .split(/\n\s*\n/)
      .map(block => block.trim())
      .filter(Boolean);

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      if (!lines.length) continue;

      const explicitList = lines.every(line => /^[-•▪]\s*/.test(line));

      if (explicitList) {
        makeList(lines);
        continue;
      }

      if (lines[0].endsWith(":") && lines.length > 1) {
        const heading = document.createElement("p");
        heading.className = "si-managed-list-heading";
        heading.textContent = lines[0];
        body.appendChild(heading);

        const items = [];

        for (const line of lines.slice(1)) {
          if (/^[-•▪]\s*/.test(line)) {
            items.push(line.replace(/^[-•▪]\s*/, ""));
          } else {
            items.push(...sentenceItems(line));
          }
        }

        makeList(items);
        continue;
      }

      for (const line of lines) {
        if (/^[-•▪]\s*/.test(line)) {
          makeList([line]);
          continue;
        }

        const p = document.createElement("p");
        p.textContent = line;
        body.appendChild(p);
      }
    }
  }
  function renderManagedContent(map) {
    document.querySelectorAll("[data-content-slug]").forEach((element) => {
      const slug = element.dataset.contentSlug;
      const item = map.get(slug);

      if (!item) return;

      const heading = element.querySelector("h2, h3, summary");
      const body = element.querySelector(".si-managed-body");

      if (heading && item.title) {
        heading.textContent = item.title;
      }

      if (body) {
        renderStructuredManagedBody(body, item.body || "", element);
      }
    });

    document.querySelectorAll("[data-history-content]").forEach((element) => {
      const item = map.get(element.dataset.historyContent);
      if (!item) return;

      const panel = element.closest(".history-panel");
      const heading = panel?.querySelector("h3");

      if (heading && item.title) heading.textContent = item.title;
      element.textContent = item.body || "";
    });

    const architecture = map.get("history-arquitectura");
    if (architecture) {
      const title = document.querySelector("#about-title");
      const body = document.querySelector("#about-body");
      const eyebrow = document.querySelector("#about-eyebrow");

      if (eyebrow) eyebrow.textContent = "";
      if (title) title.textContent = architecture.title || "Arquitectura";
      if (body) body.textContent = architecture.body || "";
    }
  }

  function renderPastoralCategories(items = []) {
    const container = document.querySelector("#pastoral-categories");
    if (!container) return;

    if (!items.length) {
      container.replaceChildren();
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="si-pastoral-category">
        <h3>${escapeHtml(item.title)}</h3>
        ${item.summary ? `<p class="si-pastoral-category-summary">${escapeHtml(item.summary)}</p>` : ""}
        ${item.body ? `<div class="si-managed-body">${escapeHtml(item.body)}</div>` : ""}
        ${item.contact ? `<p class="si-pastoral-category-contact">${escapeHtml(item.contact)}</p>` : ""}
      </article>
    `).join("");
  }

  function renderRectors(items = []) {
    const container = document.querySelector("#history-rectors-list");
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `
        <p class="si-history-rectors-empty">
          La relación histórica de rectores se encuentra en actualización.
        </p>
      `;
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="si-history-rector">
        <div>
          <h4>${escapeHtml(item.name)}</h4>
          ${item.period ? `<p>${escapeHtml(item.period)}</p>` : ""}
        </div>
        ${item.body ? `<div class="si-managed-body">${escapeHtml(item.body)}</div>` : ""}
      </article>
    `).join("");
  }

  async function init() {
    try {
      const response = await fetch("/api/reconversion", {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) return;

      const data = await response.json();
      renderManagedContent(contentMap(data.content || []));

/* SAN-IGNACIO-AGUA-SIN-NUMEROS-V12 */
{
  const agua = document.querySelector('[data-content-slug="agua-san-ignacio"]');
  if (agua) {
    agua.querySelectorAll("li").forEach((li) => {
      const text = li.textContent.trim();
      if (text === "1." || text === "2.") {
        li.remove();
      }
    });
  }
}
      renderPastoralCategories(data.pastoral_categories || []);
      renderRectors(data.rectors || []);
    } catch {
      // El contenido HTML de respaldo permanece visible si la API no está disponible.
    }
  }

  init();
  window.setTimeout(init, 1400);
})();

/* SAN IGNACIO / INTENCIONES LEGIBILIDAD */
(function mejorarLegibilidadIntenciones() {
  function aplicar() {
    const headings = Array.from(
      document.querySelectorAll('h1,h2,h3,h4')
    );

    const titulo = headings.find(el =>
      el.textContent.trim().toLowerCase() === 'intenciones de misa'
    );

    if (!titulo) return;

    const card =
      titulo.closest('section, article, div');

    if (!card) return;

    titulo.style.fontSize = 'clamp(34px, 3vw, 46px)';
    titulo.style.lineHeight = '1.08';
    titulo.style.color = '#171717';
    titulo.style.fontWeight = '700';

    const textos = Array.from(
      card.querySelectorAll('p')
    );

    textos.forEach(p => {
      p.style.fontSize = '24px';
      p.style.lineHeight = '1.55';
      p.style.color = '#222222';
      p.style.fontWeight = '400';
    });

    const pequenos = Array.from(
      card.querySelectorAll(
        'small, .eyebrow, .kicker, [class*="eyebrow"], [class*="kicker"]'
      )
    );

    pequenos.forEach(el => {
      el.style.fontSize = '14px';
      el.style.lineHeight = '1.4';
      el.style.color = '#8a4d32';
      el.style.fontWeight = '600';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicar);
  } else {
    aplicar();
  }

  setTimeout(aplicar, 300);
})();
