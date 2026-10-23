(() => {

const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const pathNow=()=>(location.pathname||"/").replace(/\/+$/,"")||"/";
const mount=(html,cls)=>{const main=document.querySelector("main");if(!main)return null;document.body.classList.add(cls);main.innerHTML=html;requestAnimationFrame(()=>{if(location.hash)document.querySelector(location.hash)?.scrollIntoView({block:"start"});else window.scrollTo(0,0);});return main;};

  if(pathNow()!=="/galeria")return;
  const fallback=Array.from({length:23},(_,i)=>`/img/site-photos/galeria-${String(i+1).padStart(2,"0")}.jpg`);
  mount(`<section class="galx-page"><header class="galx-head"><p>Archivo visual</p><h1>Galería</h1><span id="galx-count">23 fotografías</span></header><div class="galx-grid" id="galx-grid"></div></section><div class="galx-lightbox" hidden><button class="galx-close">×</button><button class="galx-prev">‹</button><img alt=""><button class="galx-next">›</button><span class="galx-counter"></span></div>`,"page-galeria");
  let items=fallback.map(src=>({src,caption:""})),index=0;const grid=document.querySelector("#galx-grid"),box=document.querySelector(".galx-lightbox"),image=box.querySelector("img");
  const render=()=>{document.querySelector("#galx-count").textContent=`${items.length} fotografías`;grid.innerHTML=items.map((x,i)=>`<button data-i="${i}"><img src="${esc(x.src)}" alt="${esc(x.caption||`Fotografía ${i+1} de San Ignacio`)}" loading="lazy"><span>${String(i+1).padStart(2,"0")}</span></button>`).join("");grid.querySelectorAll("button").forEach(b=>b.onclick=()=>open(Number(b.dataset.i)));};
  const show=()=>{const x=items[index];image.src=x.src;image.alt=x.caption||`Fotografía ${index+1}`;box.querySelector(".galx-counter").textContent=`${index+1} / ${items.length}`;};const open=i=>{index=i;show();box.hidden=false;document.body.classList.add("galx-open")};const close=()=>{box.hidden=true;document.body.classList.remove("galx-open")};const step=d=>{index=(index+d+items.length)%items.length;show()};
  box.querySelector(".galx-close").onclick=close;box.querySelector(".galx-prev").onclick=()=>step(-1);box.querySelector(".galx-next").onclick=()=>step(1);image.onclick=()=>step(1);box.onclick=e=>{if(e.target===box)close()};document.addEventListener("keydown",e=>{if(box.hidden)return;if(e.key==="Escape")close();if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1)});
  fetch("/api/editorial/gallery",{headers:{Accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(Array.isArray(data.items)&&data.items.length)items=data.items.map(x=>({src:x.image_url,caption:x.caption||x.alt_text||""})).filter(x=>x.src);render();}).catch(()=>render());render();
})();
