(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/galeria") return;

  function build(){
    const source=document.querySelector("#galeria");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".gal-page")) return;

    document.body.classList.add("si-gal-page");

    const page=document.createElement("section");
    page.className="gal-page";
    page.innerHTML=`
      <header class="gal-head">
        <p class="gal-kicker">San Ignacio de Loyola</p>
        <h1 class="gal-title">Galería</h1>
      </header>
      <div class="gal-body"></div>`;

    const body=page.querySelector(".gal-body");
    [".gallery-entry","#gallery-data","#gallery-lightbox"].forEach(sel=>{
      const n=source.querySelector(sel); if(n) body.appendChild(n);
    });

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build,{once:true});
  else build();
})();
