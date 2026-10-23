(() => {

const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const pathNow=()=>(location.pathname||"/").replace(/\/+$/,"")||"/";
const mount=(html,cls)=>{const main=document.querySelector("main");if(!main)return null;document.body.classList.add(cls);main.innerHTML=html;requestAnimationFrame(()=>{if(location.hash)document.querySelector(location.hash)?.scrollIntoView({block:"start"});else window.scrollTo(0,0);});return main;};

  if(pathNow()!=="/agenda")return;
  mount(`<section class="agex-page"><header class="agex-head"><p>Calendario de la comunidad</p><h1>Agenda y eventos</h1><div>Celebraciones, encuentros y actividades próximas.</div></header><section class="agex-events" id="agex-events"><p class="agex-loading">Consultando agenda…</p></section></section>`,"page-agenda");
  const fmt=v=>{try{return new Intl.DateTimeFormat("es-MX",{dateStyle:"long",timeStyle:"short"}).format(new Date(v));}catch{return ""}};
  const target=document.querySelector("#agex-events");
  fetch("/api/editorial/events",{headers:{Accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{const events=Array.isArray(data.events)?data.events:[];if(!events.length){target.innerHTML=`<div class="agex-empty"><strong>No hay eventos publicados por el momento.</strong><span>La agenda se actualizará aquí en cuanto haya nuevas actividades.</span></div>`;return;}target.innerHTML=events.map((e,i)=>`<article class="agex-card"><div class="agex-num">${String(i+1).padStart(2,"0")}</div>${e.image_url?`<img src="${esc(e.image_url)}" alt="${esc(e.image_alt||e.title)}">`:""}<div><p>${esc(e.event_type||"Evento")} · ${esc(fmt(e.starts_at))}</p><h2>${esc(e.title)}</h2>${e.location?`<strong>${esc(e.location)}</strong>`:""}${e.excerpt?`<span>${esc(e.excerpt)}</span>`:""}</div></article>`).join("");}).catch(()=>{target.innerHTML=`<div class="agex-empty"><strong>No fue posible cargar la agenda.</strong></div>`;});
})();
