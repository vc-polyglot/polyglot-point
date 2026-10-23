(() => {
  "use strict";

  const nav = document.querySelector("#primary-nav");
  if (!nav || nav.dataset.dropV25 === "1") return;
  nav.dataset.dropV25 = "1";
  nav.classList.add("si-drop-nav");

  const groups = {
    "/vida-liturgica": [
      ["Horarios de misa", "/vida-liturgica#horarios-misa"],
      ["Intenciones", "/vida-liturgica#intenciones"],
      ["Jueves Eucarístico", "/vida-liturgica#jueves-eucaristico"],
      ["Confesiones", "/vida-liturgica#confesiones"]
    ],
    "/sacramentos": [
      ["Bautismo", "/sacramentos#bautismo"],
      ["Primera Comunión", "/sacramentos#primera-comunion"],
      ["Confirmación", "/sacramentos#confirmacion"],
      ["Matrimonio", "/sacramentos#matrimonio"],
      ["Confesión", "/sacramentos#confesion"]
    ],
    "/pastoral": [
      ["Catecismo", "/pastoral#catecismo"],
      ["Estudio de la Biblia", "/pastoral#biblia"],
      ["Comunidad Juvenil Ignaciana", "/pastoral#comunidad-juvenil"],
      ["INEA", "/pastoral#inea"]
    ],
    "/nosotros": [
      ["Rector", "/nosotros#rector"],
      ["Vicario", "/nosotros#vicario"],
      ["Administración", "/nosotros#administracion"],
      ["Sacristanes", "/nosotros#sacristanes"]
    ],
    "/historia": [
      ["Instituto Patria", "/historia#instituto-patria"],
      ["Capilla", "/historia#capilla"],
      ["Arquitectura", "/historia#arquitectura"],
      ["Rectores", "/historia#rectores"]
    ],
    "/contacto": [
      ["Cómo llegar", "/contacto#como-llegar"],
      ["Oficina", "/contacto#oficina"],
      ["Contacto directo", "/contacto#contacto-directo"]
    ]
  };

  const normalize = href => {
    try {
      return new URL(href, location.origin).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return href;
    }
  };

  [...nav.children].forEach(node => {
    if (!(node instanceof HTMLAnchorElement)) return;

    const route = normalize(node.getAttribute("href") || "");
    const items = groups[route];
    if (!items) return;

    const group = document.createElement("div");
    group.className = "si-drop-group";

    node.parentNode.insertBefore(group, node);
    group.appendChild(node);

    node.classList.add("si-drop-trigger");
    node.setAttribute("aria-haspopup", "true");
    node.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "si-drop-panel";

    const title = document.createElement("div");
    title.className = "si-drop-title";
    title.textContent = node.textContent.trim();
    panel.appendChild(title);

    items.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      panel.appendChild(a);
    });

    group.appendChild(panel);

    const open = () => {
      document.querySelectorAll(".si-drop-group.is-open").forEach(other => {
        if (other !== group) {
          other.classList.remove("is-open");
          other.querySelector(".si-drop-trigger")?.setAttribute("aria-expanded","false");
        }
      });
      group.classList.add("is-open");
      node.setAttribute("aria-expanded","true");
    };

    const close = () => {
      group.classList.remove("is-open");
      node.setAttribute("aria-expanded","false");
    };

    node.addEventListener("click", e => {
      if (matchMedia("(max-width:980px)").matches && !group.classList.contains("is-open")) {
        e.preventDefault();
        open();
      }
    });

    group.addEventListener("mouseenter", () => {
      if (!matchMedia("(max-width:980px)").matches) open();
    });

    group.addEventListener("mouseleave", () => {
      if (!matchMedia("(max-width:980px)").matches) close();
    });

    group.addEventListener("focusin", open);
    group.addEventListener("focusout", e => {
      if (!group.contains(e.relatedTarget)) close();
    });
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".si-drop-group")) {
      document.querySelectorAll(".si-drop-group.is-open").forEach(g => {
        g.classList.remove("is-open");
        g.querySelector(".si-drop-trigger")?.setAttribute("aria-expanded","false");
      });
    }
  });
})();
