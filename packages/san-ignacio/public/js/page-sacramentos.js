(() => {
  "use strict";

  if ((location.pathname.replace(/\/+$/, "") || "/") !== "/sacramentos") return;

  const main = document.querySelector("main");
  if (!main) return;

  document.body.classList.add("page-sacramentos");

  const esc = (v = "") => String(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  const ids = {
    "sacrament-bautismo": "bautismo",
    "sacrament-primera-comunion": "primera-comunion",
    "sacrament-confirmacion": "confirmacion",
    "sacrament-matrimonio": "matrimonio",
    "sacrament-confesiones": "confesion"
  };

  function bodyHtml(text = "") {
    return String(text).replace(/\r/g,"").split("\n").map(s => s.trim()).filter(Boolean).map(line => {
      if (/^[^.!?]{2,80}:$/.test(line)) return `<h3>${esc(line.slice(0,-1))}</h3>`;
      return `<p>${esc(line)}</p>`;
    }).join("");
  }

  main.innerHTML = `
    <section class="sacx-page">
      <header class="sacx-head">
        <p>Celebraciones y preparación</p>
        <h1>Sacramentos</h1>
        <div>
          <span>Información para preparar cada celebración.</span>
          <span>Disponibilidad, estipendios y donativos se consultan en la oficina.</span>
        </div>
      </header>
      <div class="sacx-list" id="sacx-list">
        <p>Cargando información…</p>
      </div>
    </section>`;

  fetch("/api/reconversion", {headers:{Accept:"application/json"}})
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const items = (data.content || [])
        .filter(x => x.group_key === "sacrament")
        .sort((a,b) => Number(a.sort_order) - Number(b.sort_order));

      document.querySelector("#sacx-list").innerHTML = items.map((item,i) => `
        <details class="sacx-card" id="${ids[item.slug] || esc(item.slug)}" ${i===0 ? "open" : ""}>
          <summary>
            <span>${String(i+1).padStart(2,"0")}</span>
            <strong>${esc(item.title)}</strong>
            <b>+</b>
          </summary>
          <div class="sacx-copy">${bodyHtml(item.body)}</div>
        </details>
      `).join("");

      if (location.hash) {
        requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({block:"start"}));
      } else {
        window.scrollTo(0,0);
      }
    })
    .catch(err => {
      console.error("Sacramentos:",err);
      document.querySelector("#sacx-list").innerHTML="<p>No fue posible cargar la información sacramental.</p>";
    });
})();
