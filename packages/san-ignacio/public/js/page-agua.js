(() => {
  "use strict";

  if ((location.pathname.replace(/\/+$/, "") || "/") !== "/agua-de-san-ignacio") return;

  const main = document.querySelector("main");
  if (!main) return;

  document.body.classList.add("page-agua");

  const esc = (v = "") => String(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  main.innerHTML = `
    <section class="agux-page">
      <header class="agux-head">
        <p>Sacramental</p>
        <h1>Agua de<br>San Ignacio</h1>
        <aside>
          <strong>No se vende.</strong>
          <span>Información y formas de obtenerla.</span>
        </aside>
      </header>
      <section class="agux-body" id="agux-content">
        <article><p>Cargando información…</p></article>
      </section>
    </section>`;

  fetch("/api/reconversion", {headers:{Accept:"application/json"}})
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const item = (data.content || []).find(x => x.slug === "agua-san-ignacio");
      if (!item) throw new Error("Contenido agua-san-ignacio inexistente");

      const lines = String(item.body || "").replace(/\r/g,"").split("\n").map(x=>x.trim()).filter(Boolean);
      const intro = [];
      const steps = [];

      for (const line of lines) {
        const m = line.match(/^([12])\.\s*(.+)$/);
        if (m) steps.push(m[2]);
        else if (!/^Hay dos modos para obtenerla:?$/i.test(line)) intro.push(line);
      }

      document.querySelector("#agux-content").innerHTML = `
        <article>
          ${intro.map(p=>`<p>${esc(p)}</p>`).join("")}
        </article>
        <div class="agux-steps">
          <h2>Cómo obtenerla</h2>
          ${steps.map((s,i)=>`<div><span>${String(i+1).padStart(2,"0")}</span><p>${esc(s)}</p></div>`).join("")}
        </div>`;
      window.scrollTo(0,0);
    })
    .catch(err => {
      console.error("Agua de San Ignacio:",err);
      document.querySelector("#agux-content").innerHTML="<article><p>No fue posible cargar la información.</p></article>";
    });
})();
