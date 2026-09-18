/* SAN IGNACIO MULTIVIEW ROUTER V6 */
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
    { id: "musica", path: "/musica", selector: "#musica", label: "Música",
      title: "Música · San Ignacio de Loyola",
      description: "Música y vida musical de San Ignacio de Loyola, Polanco." },
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

  function navigate(route, replace = false, direction = 0) {
    if (!route || !routeElements.has(route.id)) return;

    if (direction > 0) body.dataset.siNavDirection = "next";
    else if (direction < 0) body.dataset.siNavDirection = "previous";
    else delete body.dataset.siNavDirection;

    history[replace ? "replaceState" : "pushState"]({ siView: route.id }, "", route.path);
    applyRoute(route, { scroll: false });

    requestAnimationFrame(() => {
      if (direction < 0) {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        window.scrollTo({ top: maxScroll, left: 0, behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    });
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
    navigate(route, false, 0);
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
  // SCROLL-DRIVEN VIEW NAVIGATION V6
  // ============================================================

  const availableRoutes = routes.filter(route => routeElements.has(route.id));
  let wheelSum = 0;
  let wheelDirection = 0;
  let routeLockedUntil = 0;
  let touchStartY = null;
  let touchStartAtTop = false;
  let touchStartAtBottom = false;

  const ROUTE_LOCK_MS = 680;
  const WHEEL_THRESHOLD = 82;
  const TOUCH_THRESHOLD = 72;
  const EDGE_EPSILON = 4;

  function routeIndex() {
    return availableRoutes.findIndex(route => route.id === body.dataset.siCurrentView);
  }

  function maxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function atTop() {
    return window.scrollY <= EDGE_EPSILON;
  }

  function atBottom() {
    return window.scrollY >= maxScrollY() - EDGE_EPSILON;
  }

  function interactionIsBlocked(target) {
    if (!target) return false;

    if (target.closest?.(
      'input, textarea, select, [contenteditable="true"], [role="dialog"], ' +
      '.lightbox, .gallery-lightbox, .modal, [data-lightbox]'
    )) {
      return true;
    }

    const style = getComputedStyle(document.body);
    return style.overflowY === "hidden" || style.overflow === "hidden";
  }

  function moveByScrollDirection(direction) {
    const now = performance.now();
    if (now < routeLockedUntil) return false;

    const index = routeIndex();
    if (index < 0) return false;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= availableRoutes.length) {
      wheelSum = 0;
      wheelDirection = 0;
      return false;
    }

    routeLockedUntil = now + ROUTE_LOCK_MS;
    wheelSum = 0;
    wheelDirection = 0;

    navigate(availableRoutes[nextIndex], false, direction);
    return true;
  }

  window.addEventListener("wheel", event => {
    if (interactionIsBlocked(event.target)) return;
    if (Math.abs(event.deltaY) < 2) return;

    const direction = event.deltaY > 0 ? 1 : -1;

    if (direction > 0 && !atBottom()) {
      wheelSum = 0;
      wheelDirection = 0;
      return;
    }

    if (direction < 0 && !atTop()) {
      wheelSum = 0;
      wheelDirection = 0;
      return;
    }

    if (performance.now() < routeLockedUntil) {
      event.preventDefault();
      return;
    }

    if (wheelDirection !== direction) {
      wheelDirection = direction;
      wheelSum = 0;
    }

    wheelSum += Math.abs(event.deltaY);

    if (wheelSum >= WHEEL_THRESHOLD) {
      if (moveByScrollDirection(direction)) {
        event.preventDefault();
      }
    }
  }, { passive: false });

  window.addEventListener("touchstart", event => {
    if (event.touches.length !== 1 || interactionIsBlocked(event.target)) {
      touchStartY = null;
      return;
    }

    touchStartY = event.touches[0].clientY;
    touchStartAtTop = atTop();
    touchStartAtBottom = atBottom();
  }, { passive: true });

  window.addEventListener("touchend", event => {
    if (touchStartY === null || event.changedTouches.length !== 1) return;

    const delta = touchStartY - event.changedTouches[0].clientY;
    const distance = Math.abs(delta);
    const direction = delta > 0 ? 1 : -1;

    touchStartY = null;

    if (distance < TOUCH_THRESHOLD) return;
    if (direction > 0 && !touchStartAtBottom) return;
    if (direction < 0 && !touchStartAtTop) return;

    moveByScrollDirection(direction);
  }, { passive: true });

  window.addEventListener("keydown", event => {
    if (interactionIsBlocked(event.target)) return;

    if ((event.key === "PageDown" || event.key === "ArrowDown") && atBottom()) {
      if (moveByScrollDirection(1)) event.preventDefault();
    } else if ((event.key === "PageUp" || event.key === "ArrowUp") && atTop()) {
      if (moveByScrollDirection(-1)) event.preventDefault();
    }
  });

  window.SanIgnacioViews = Object.freeze({
    routes: routes
      .filter(route => routeElements.has(route.id))
      .map(({ id, path, label }) => ({ id, path, label })),
    show(id) {
      const route = routeById.get(id);
      if (route) navigate(route, false, 0);
    }
  });

  applyRoute(resolveRoute(), { scroll: false });
})();
/* END SAN IGNACIO MULTIVIEW ROUTER V6 */
