/* SAN IGNACIO MULTIVIEW ROUTER V7 */
(() => {
  "use strict";

  const routes = [
    { id: "home", path: "/", selector: ".first-screen", label: "Inicio",
      title: "San Ignacio de Loyola · Polanco",
      description: "Iglesia de San Ignacio de Loyola, Polanco, Ciudad de México." },
    { id: "liturgia", path: "/vida-liturgica", selector: "#liturgia", label: "Vida litúrgica",
      title: "Vida litúrgica · San Ignacio de Loyola",
      description: "Horarios de misa y vida litúrgica de San Ignacio de Loyola, Polanco." },
    { id: "pastoral", path: "/pastoral", selector: "#pastoral", label: "Pastoral",
      title: "Pastoral · San Ignacio de Loyola",
      description: "Vida pastoral de la comunidad de San Ignacio de Loyola, Polanco." },
    { id: "espiritualidad", path: "/espiritualidad", selector: "#espiritualidad", label: "Espiritualidad",
      title: "Espiritualidad · San Ignacio de Loyola",
      description: "Espiritualidad ignaciana y jesuita en San Ignacio de Loyola, Polanco." },
    { id: "nosotros", path: "/nosotros", selector: "#nosotros", label: "Nosotros",
      title: "Nosotros · San Ignacio de Loyola",
      description: "Comunidad y equipo de San Ignacio de Loyola, Polanco." },
    { id: "musica", path: "/agenda", selector: "#musica", label: "Agenda y eventos",
      title: "Agenda y eventos · San Ignacio de Loyola",
      description: "Agenda, celebraciones, conciertos y actividades de San Ignacio de Loyola, Polanco." },
    { id: "donativos", path: "/donativos", selector: "#donativos", label: "Donativos",
      title: "Donativos · San Ignacio de Loyola",
      description: "Información para apoyar a la comunidad de San Ignacio de Loyola, Polanco." },
    { id: "historia", path: "/historia", selector: "#historia", label: "Historia",
      title: "Historia · San Ignacio de Loyola",
      description: "Historia, capilla y arquitectura de San Ignacio de Loyola, Polanco." },
    { id: "galeria", path: "/galeria", selector: "#galeria", label: "Galería",
      title: "Galería · San Ignacio de Loyola",
      description: "Galería fotográfica de San Ignacio de Loyola, Polanco." },
    { id: "contacto", path: "/contacto", selector: "#contacto", label: "Contacto",
      title: "Contacto · San Ignacio de Loyola",
      description: "Contacto de la Iglesia de San Ignacio de Loyola, Polanco." }
  ];

  const routeById = new Map(routes.map(route => [route.id, route]));
  const normalizePath = value => {
    const path = String(value || "/").split("?")[0].split("#")[0] || "/";
    return path === "/" ? "/" : path.replace(/\/+$/, "");
  };
  const routeByPath = new Map(routes.map(route => [normalizePath(route.path), route]));
  routeByPath.set("/musica", routeById.get("musica"));
  const hashToRoute = new Map([
    ["#liturgia", "liturgia"],
    ["#pastoral", "pastoral"],
    ["#espiritualidad", "espiritualidad"],
    ["#nosotros", "nosotros"],
    ["#musica", "musica"],
    ["#donativos", "donativos"],
    ["#historia", "historia"],
    ["#galeria", "galeria"],
    ["#contacto", "contacto"]
  ]);

  const body = document.body;
  const main = document.querySelector("main");
  const nav = document.querySelector("#primary-nav");
  const navToggle = document.querySelector(".nav-toggle");
  const brand = document.querySelector(".brand");
  const metaDescription = document.querySelector('meta[name="description"]');

  if (!body || !main) return;

  const routeElements = new Map();
  for (const route of routes) {
    const element = document.querySelector(route.selector);
    if (element) {
      routeElements.set(route.id, element);
      element.dataset.siView = route.id;
    }
  }

  if (!routeElements.has("home")) return;

  body.classList.add("si-multiview");

  const existingCanonical = document.querySelector('link[rel="canonical"]');
  const canonical = existingCanonical || document.createElement("link");
  canonical.rel = "canonical";
  if (!existingCanonical) document.head.appendChild(canonical);

  if (brand) {
    brand.setAttribute("href", "/");
    brand.dataset.siRoute = "home";
  }

  if (nav) {
    nav.innerHTML = routes
      .filter(route => route.id !== "home" && routeElements.has(route.id))
      .map(route => `<a href="${route.path}" data-si-route="${route.id}">${route.label}</a>`)
      .join("");
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const routeId = hashToRoute.get(anchor.getAttribute("href"));
    if (!routeId || !routeElements.has(routeId)) return;
    const route = routeById.get(routeId);
    anchor.setAttribute("href", route.path);
    anchor.dataset.siRoute = route.id;
  });

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  }

  function setActiveNav(route) {
    nav?.querySelectorAll("[data-si-route]").forEach(anchor => {
      const active = anchor.dataset.siRoute === route.id;
      anchor.classList.toggle("is-current-view", active);
      if (active) anchor.setAttribute("aria-current", "page");
      else anchor.removeAttribute("aria-current");
    });
  }

  function updateHead(route) {
    document.title = route.title;
    metaDescription?.setAttribute("content", route.description);
    canonical.href = `${location.origin}${route.path}`;
  }

  function resolveRoute() {
    let route = routeByPath.get(normalizePath(location.pathname));

    // Compatibilidad: las viejas anclas se convierten una sola vez a URL real.
    if (!route && normalizePath(location.pathname) === "/" && hashToRoute.has(location.hash)) {
      route = routeById.get(hashToRoute.get(location.hash));
      if (route && routeElements.has(route.id)) {
        history.replaceState({ siView: route.id }, "", route.path);
      }
    }

    if (!route || !routeElements.has(route.id)) return routeById.get("home");
    return route;
  }

  function applyRoute(route, { scroll = true } = {}) {
    if (!route || !routeElements.has(route.id)) route = routeById.get("home");

    for (const [id, element] of routeElements) {
      const active = id === route.id;
      element.hidden = !active;
      element.classList.toggle("si-view-active", active);
      element.setAttribute("aria-hidden", active ? "false" : "true");
    }

    body.dataset.siCurrentView = route.id;
    setActiveNav(route);
    updateHead(route);
    closeMenu();

    if (scroll) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollTo({ top: 0, left: 0, behavior: reduced ? "auto" : "smooth" });
    }

    body.classList.add("si-router-ready");
  }

  function navigate(route, replace = false) {
    if (!route || !routeElements.has(route.id)) return;
    history[replace ? "replaceState" : "pushState"]({ siView: route.id }, "", route.path);
    applyRoute(route);
  }

  // Captura primero para neutralizar cualquier viejo comportamiento de anclas.
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = event.target.closest("a");
    if (!anchor) return;

    let route = anchor.dataset.siRoute ? routeById.get(anchor.dataset.siRoute) : null;

    if (!route) {
      const href = anchor.getAttribute("href") || "";
      if (hashToRoute.has(href)) {
        route = routeById.get(hashToRoute.get(href));
      } else {
        try {
          const url = new URL(anchor.href, location.href);
          if (url.origin === location.origin) {
            route = routeByPath.get(normalizePath(url.pathname)) || null;
          }
        } catch {
          route = null;
        }
      }
    }

    if (!route || !routeElements.has(route.id)) return;
    event.preventDefault();
    navigate(route);
  }, true);

  addEventListener("popstate", () => applyRoute(resolveRoute(), { scroll: false }));

  // Menú: conserva el botón actual y agrega cierre al tocar/clicar fuera.
  document.addEventListener("pointerdown", event => {
    if (!nav?.classList.contains("open")) return;
    if (nav.contains(event.target) || navToggle?.contains(event.target)) return;
    closeMenu();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav?.classList.contains("open")) {
      closeMenu();
      navToggle?.focus();
    }
  });


  // ============================================================
  // GALLERY FULLSCREEN V7
  //
  // El visor existente se mueve al <body> para que ningún transform,
  // overflow o sección activa lo limite. Sus handlers existentes,
  // contador, cierre y flechas se conservan intactos.
  // ============================================================

  function promoteGalleryLightbox() {
    const galleryImage = document.querySelector("#gallery-image");
    if (!galleryImage) return false;

    let lightbox = document.querySelector(
      "#gallery-lightbox, .gallery-lightbox, [data-gallery-lightbox]"
    );

    if (!lightbox) {
      let node = galleryImage.parentElement;

      while (node && node !== document.body) {
        const hasClose = Boolean(
          node.querySelector?.(
            "#gallery-close, .gallery-close, [data-gallery-close], [aria-label*='Cerrar'], [aria-label*='cerrar']"
          )
        );

        const hasNavigation = Boolean(
          node.querySelector?.(
            "#gallery-prev, #gallery-next, .gallery-prev, .gallery-next, [data-gallery-prev], [data-gallery-next]"
          )
        );

        if (hasClose || hasNavigation) {
          lightbox = node;
        }

        node = node.parentElement;
      }
    }

    if (!lightbox) return false;

    lightbox.classList.add("si-gallery-fullscreen");
    galleryImage.classList.add("si-gallery-fullscreen-image");

    if (lightbox.parentElement !== document.body) {
      document.body.appendChild(lightbox);
    }

    return true;
  }

  if (!promoteGalleryLightbox()) {
    const galleryObserver = new MutationObserver(() => {
      if (promoteGalleryLightbox()) {
        galleryObserver.disconnect();
      }
    });

    galleryObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  window.SanIgnacioViews = Object.freeze({
    routes: routes
      .filter(route => routeElements.has(route.id))
      .map(({ id, path, label }) => ({ id, path, label })),
    show(id) {
      const route = routeById.get(id);
      if (route) navigate(route);
    }
  });

  applyRoute(resolveRoute(), { scroll: false });
})();
/* END SAN IGNACIO MULTIVIEW ROUTER V7 */
