(() => {

const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const pathNow=()=>(location.pathname||"/").replace(/\/+$/,"")||"/";
const mount=(html,cls)=>{const main=document.querySelector("main");if(!main)return null;document.body.classList.add(cls);main.innerHTML=html;requestAnimationFrame(()=>{if(location.hash)document.querySelector(location.hash)?.scrollIntoView({block:"start"});else window.scrollTo(0,0);});return main;};

  if(pathNow()!=="/vida-liturgica")return;
  mount(`
  <section class="litx-page">
    <header class="litx-hero">
      <div><p class="litx-eyebrow">Celebrar · Orar · Encontrarse</p><h1>Vida litúrgica</h1><p class="litx-lead">La celebración de la Eucaristía estructura la vida cotidiana de San Ignacio de Loyola.</p></div>
      <img src="/img/site-photos/liturgia.jpg" alt="Presbiterio de San Ignacio de Loyola">
    </header>
    <section class="litx-schedule" id="horarios-misa">
      <div class="litx-section-title"><span>01</span><div><p>Horarios de misa</p><h2>Celebración de la Eucaristía</h2></div></div>
      <div class="litx-times">
        <article><strong>Lunes a viernes</strong><span>7:30 · 13:30 · 18:30 h</span></article>
        <article><strong>Sábado</strong><span>7:30 · 18:30 h</span></article>
        <article><strong>Domingo</strong><span>9:00 · 10:30 <em>(misa de niños)</em> · 12:00 · 13:30 · 18:30 h</span></article>
      </div>
      <p class="litx-note">Las misas de lunes a sábado son comunitarias y pueden recibir intenciones por vivos o difuntos. Los domingos, las intenciones se reciben en las misas de 12:00 y 13:30 h.</p>
      <p class="litx-note">Las misas dominicales de 12:00 y 13:30 h se transmiten por Zoom; la invitación se publica en Facebook de Iglesia San Ignacio Polanco.</p>
    </section>
    <div class="litx-grid">
      <article id="intenciones"><p class="litx-label">Intenciones</p><h2>Intenciones de misa</h2><p>Para solicitar una intención de misa, consulte disponibilidad y registro en la oficina de la iglesia.</p></article>
      <article id="jueves-eucaristico"><p class="litx-label">Jueves Eucarístico</p><h2>Hora Santa</h2><p>Todos los jueves, de 17:30 a 18:30 h.</p></article>
      <article id="confesiones"><p class="litx-label">Reconciliación</p><h2>Confesiones</h2><p>Al final de las misas de lunes a sábado, solicite al sacerdote celebrante la confesión.</p></article>
    </div>
  </section>`, "page-liturgia");
})();
