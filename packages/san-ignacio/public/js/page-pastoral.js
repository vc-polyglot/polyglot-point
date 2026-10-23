(() => {

const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const pathNow=()=>(location.pathname||"/").replace(/\/+$/,"")||"/";
const mount=(html,cls)=>{const main=document.querySelector("main");if(!main)return null;document.body.classList.add(cls);main.innerHTML=html;requestAnimationFrame(()=>{if(location.hash)document.querySelector(location.hash)?.scrollIntoView({block:"start"});else window.scrollTo(0,0);});return main;};

  if(pathNow()!=="/pastoral")return;
  const programs=[["catecismo","Catecismo","Preparación para la Primera Comunión","Desde los 7 años · Jueves 16:30–18:00","El curso inicia en septiembre. Las inscripciones se realizan en agosto; para informes, contacte a la oficina."],["estudio-biblia","Estudio de la Biblia","Lectura y formación","Miércoles 12:00–13:30","Traiga su Biblia y material para tomar notas."],["comunidad-juvenil","Comunidad Juvenil Ignaciana","Jóvenes","Amar y servir","Espacio de encuentro, formación y servicio para jóvenes de la comunidad."],["inea","INEA","Educación para adultos","Alfabetización · Primaria · Secundaria","La Iglesia de San Ignacio es sede de un grupo del Instituto Nacional para la Educación de los Adultos, con alfabetización y apoyo para terminar primaria o secundaria."]];
  mount(`<section class="pasx-page"><header class="pasx-hero"><div class="pasx-copy"><p>Vida de la comunidad</p><h1>Pastoral</h1><span>Formación, acompañamiento y servicio.</span></div><figure><img src="/img/site-photos/pastoral.jpeg" alt="Comunidad de San Ignacio de Loyola"></figure></header><section class="pasx-message" id="mensaje-pastoral"><p class="pasx-label">Mensaje pastoral</p><div id="pasx-message-body"><h2>La comunidad se construye en el encuentro.</h2><p>El mensaje pastoral más reciente aparecerá aquí.</p></div></section><section class="pasx-programs">${programs.map((p,i)=>`<article id="${p[0]}"><span>0${i+1}</span><p class="pasx-label">${p[2]}</p><h2>${p[1]}</h2><strong>${p[3]}</strong><p>${p[4]}</p></article>`).join("")}</section></section>`,"page-pastoral");
  fetch("/api/home",{headers:{Accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(!data.pastoral)return;const p=data.pastoral;const box=document.querySelector("#pasx-message-body");box.innerHTML=`<h2>${esc(p.title||"Mensaje pastoral")}</h2>${p.excerpt?`<p><strong>${esc(p.excerpt)}</strong></p>`:""}${p.body?`<p>${esc(p.body)}</p>`:""}`;}).catch(()=>{});

  const pastoralCards = document.querySelectorAll(".pasx-programs article");
  pastoralCards.forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role","button");
    card.setAttribute("aria-expanded","false");

    const toggle = () => {
      const opening = !card.classList.contains("is-expanded");

      pastoralCards.forEach((other) => {
        other.classList.remove("is-expanded");
        other.setAttribute("aria-expanded","false");
      });

      if (opening) {
        card.classList.add("is-expanded");
        card.setAttribute("aria-expanded","true");
        setTimeout(() => card.scrollIntoView({behavior:"smooth",block:"center"}),120);
      }
    };

    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });
})();


