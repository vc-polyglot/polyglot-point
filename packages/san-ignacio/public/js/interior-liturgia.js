(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/vida-liturgica") return;

  function build(){
    const source=document.querySelector("#liturgia");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".lit-page")) return;

    document.body.classList.add("si-liturgia-page");

    const page=document.createElement("section");
    page.className="lit-page";
    page.innerHTML=`
      <header class="lit-head">
        <p class="lit-kicker">Celebración</p>
        <h1 class="lit-title">Vida litúrgica</h1>
        <p class="lit-lead">Horarios de misa, intenciones, adoración y vida sacramental de San Ignacio de Loyola.</p>
      </header>
      <div class="lit-body">
        <div class="lit-main"></div>
        <aside class="lit-side"></aside>
      </div>`;

    const mainCol=page.querySelector(".lit-main");
    const side=page.querySelector(".lit-side");
    const body=page.querySelector(".lit-body");

    [" .mass-hours-primary",".liturgy-hours"].forEach(sel=>{
      const n=source.querySelector(sel.trim()); if(n) mainCol.appendChild(n);
    });
    [".si-intentions-card",".liturgy-fixed-info"].forEach(sel=>{
      const n=source.querySelector(sel); if(n) { n.hidden=false; side.appendChild(n); }
    });
    const photo=source.querySelector(".site-section-photo--liturgia");
    if(photo){photo.classList.add("lit-photo");body.appendChild(photo);}

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build,{once:true});
  else build();
})();
