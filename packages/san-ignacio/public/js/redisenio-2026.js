
/* SAN IGNACIO — REDISEÑO LOCAL V1 */
(() => {
  "use strict";

  const body = document.body;
  const normalize = () => {
    const hash = (location.hash || "").replace(/^#/, "").trim();
    body.classList.forEach(c => {
      if (c.startsWith("si-view-") && c !== "si-view-active") body.classList.remove(c);
    });
    body.classList.add(hash ? `si-view-${hash}` : "si-view-home");
  };

  const addQuickLinks = () => {
    const hero = document.querySelector(".first-screen.si-revelation-hero");
    if (!hero || hero.querySelector(".si-hero-quicklinks")) return;

    const links = [
      ["Horarios", "/vida-liturgica"],
      ["Sacramentos", "/sacramentos"],
      ["Agenda", "/agenda"],
      ["Conócenos", "#nosotros"],
      ["Cómo llegar", "#contacto"]
    ];

    const nav = document.createElement("nav");
    nav.className = "si-hero-quicklinks";
    nav.setAttribute("aria-label", "Accesos rápidos");
    links.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      nav.appendChild(a);
    });
    hero.appendChild(nav);
  };

  const renameNav = () => {
    const nosotros = document.querySelector('.primary-nav a[href="#nosotros"]');
    if (nosotros) nosotros.textContent = "Conócenos";
  };

  document.addEventListener("DOMContentLoaded", () => {
    normalize();
    addQuickLinks();
    renameNav();
  });

  window.addEventListener("hashchange", normalize);
})();

