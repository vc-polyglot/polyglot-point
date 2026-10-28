(() => {
  const interiorPaths = new Set([
    "/vida-liturgica",
    "/sacramentos",
    "/pastoral",
    "/agenda",
    "/nosotros",
    "/agua-de-san-ignacio",
    "/historia",
    "/galeria",
    "/contacto"
  ]);

  const clean = p => (p || "/").replace(/\/+$/, "") || "/";
  if (!interiorPaths.has(clean(location.pathname))) return;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const a = event.target.closest("a[href]");
    if (!a) return;

    let url;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;

    const target = clean(url.pathname);
    if (target === "/" || interiorPaths.has(target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = url.pathname + url.search + url.hash;
    }
  }, true);
})();
