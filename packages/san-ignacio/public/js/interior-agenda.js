(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/agenda") return;

  function build(){
    const source=document.querySelector("#musica");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".age-page")) return;

    document.body.classList.add("si-age-page");

    const page=document.createElement("section");
    page.className="age-page";
    page.innerHTML=`
      <header class="age-head">
        <p class="age-kicker">Vida de la comunidad</p>
        <h1 class="age-title">Agenda y eventos</h1>
        <p class="age-lead">Próximas celebraciones, encuentros y actividades de San Ignacio de Loyola.</p>
      </header>
      <div class="age-body"></div>`;

    const target=page.querySelector(".age-body");
    Array.from(source.children).forEach(node=>{
      if(!node.classList.contains("si-agenda-heading")) target.appendChild(node);
    });

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  const run=()=>setTimeout(build,450);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",run,{once:true});
  else run();
})();
