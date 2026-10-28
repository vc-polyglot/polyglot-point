(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/sacramentos") return;

  function build(){
    const source=document.querySelector("#sacramentos");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".sac-page")) return;

    document.body.classList.add("si-sac-page");

    const intro=source.querySelector(".si-section-heading > p:last-child")?.textContent.trim() ||
      "Información para preparar y celebrar los sacramentos en San Ignacio de Loyola.";

    const page=document.createElement("section");
    page.className="sac-page";
    page.innerHTML=`
      <header class="sac-head">
        <p class="sac-kicker">Celebraciones y preparación</p>
        <h1 class="sac-title">Sacramentos</h1>
        <p class="sac-intro"></p>
      </header>
      <div class="sac-list"></div>`;

    page.querySelector(".sac-intro").textContent=intro;
    const list=page.querySelector(".sac-list");

    source.querySelectorAll(".si-sacrament-card").forEach(card=>{
      card.classList.add("sac-card");
      list.appendChild(card);
    });

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build,{once:true});
  else build();
})();
