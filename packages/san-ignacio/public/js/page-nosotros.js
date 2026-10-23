(() => {

const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const pathNow=()=>(location.pathname||"/").replace(/\/+$/,"")||"/";
const mount=(html,cls)=>{const main=document.querySelector("main");if(!main)return null;document.body.classList.add(cls);main.innerHTML=html;requestAnimationFrame(()=>{if(location.hash)document.querySelector(location.hash)?.scrollIntoView({block:"start"});else window.scrollTo(0,0);});return main;};

  if(pathNow()!=="/nosotros")return;
  mount(`<section class="nosx-page"><header class="nosx-head"><div><p>Nuestra comunidad</p><h1>Nosotros</h1><span>Personas al servicio de la vida litúrgica, pastoral y cotidiana de San Ignacio de Loyola.</span></div><img src="/img/site-photos/nosotros.jpeg" alt="Interior de San Ignacio de Loyola"></header><section class="nosx-directory"><button class="nosx-person" id="rector" data-title="Rector" data-name="P. Luis González-Cosío Elcoro, S.J." data-photo="/img/staff/luis-gonzalez-cosio.jpg"><span>Rector</span><strong>P. Luis González-Cosío Elcoro, S.J.</strong><b>Ver perfil →</b></button>
<button class="nosx-person" id="vicario" data-title="Vicario" data-name="P. José de Jesús Rojas García, S.J." data-photo="/img/staff/jose-de-jesus-rojas.jpg"><span>Vicario</span><strong>P. José de Jesús Rojas García, S.J.</strong><b>Ver perfil →</b></button>
<button class="nosx-person" id="administracion" data-title="Administración" data-name="Arturo Vallín López" data-photo="/img/staff/arturo-vallin.jpg"><span>Administración</span><strong>Arturo Vallín López</strong><b>Ver perfil →</b></button>
<button class="nosx-person" data-title="Administración" data-name="Adriana Arriaga Morales" data-photo="/img/staff/adriana-arriaga.jpg"><span>Administración</span><strong>Adriana Arriaga Morales</strong><b>Ver perfil →</b></button>
<button class="nosx-person" id="sacristanes" data-title="Sacristán" data-name="Ignacio Ortíz Perea" data-photo="/img/staff/ignacio-ortiz.jpg"><span>Sacristán</span><strong>Ignacio Ortíz Perea</strong><b>Ver perfil →</b></button>
<button class="nosx-person" data-title="Sacristán" data-name="Rogelio Solís Colín" data-photo="/img/staff/rogelio-solis.jpg"><span>Sacristán</span><strong>Rogelio Solís Colín</strong><b>Ver perfil →</b></button></section></section><div class="nosx-modal" hidden><article><button class="nosx-close" aria-label="Cerrar">×</button><div class="nosx-photo"><img alt=""><div>Fotografía pendiente</div></div><div class="nosx-cv"><p></p><h2></h2><h3>Currículum</h3><span>Semblanza curricular pendiente de integrar.</span></div></article></div>`,"page-nosotros");
  const modal=document.querySelector(".nosx-modal"),img=modal.querySelector("img"),photo=modal.querySelector(".nosx-photo");
  const open=btn=>{modal.querySelector(".nosx-cv p").textContent=btn.dataset.title;modal.querySelector(".nosx-cv h2").textContent=btn.dataset.name;photo.classList.remove("missing");img.onerror=()=>photo.classList.add("missing");img.src=btn.dataset.photo;img.alt=btn.dataset.name;modal.hidden=false;document.body.classList.add("nosx-open");};
  document.querySelectorAll(".nosx-person").forEach(b=>b.addEventListener("click",()=>open(b)));
  const close=()=>{modal.hidden=true;document.body.classList.remove("nosx-open")};modal.querySelector(".nosx-close").onclick=close;modal.onclick=e=>{if(e.target===modal)close()};document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close()});
})();
