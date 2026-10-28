(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/pastoral") return;

  function build(){
    const source=document.querySelector("#pastoral");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".pas-page")) return;

    document.body.classList.add("si-pas-page");

    const page=document.createElement("section");
    page.className="pas-page";
    page.innerHTML=`
      <header class="pas-head">
        <p class="pas-kicker">Vida de la comunidad</p>
        <h1 class="pas-title">Pastoral</h1>
        <p class="pas-intro">Formación, acompañamiento y grupos que hacen comunidad en San Ignacio de Loyola.</p>
      </header>
      <div class="pas-body">
        <article class="pas-message"></article>
        <section class="pas-areas"></section>
      </div>`;

    const msg=source.querySelector("#pastoral-card");
    if(msg) page.querySelector(".pas-message").appendChild(msg);

    const areas=source.querySelector(".si-pastoral-categories-wrap");
    if(areas) page.querySelector(".pas-areas").appendChild(areas);

    const photo=source.querySelector(".site-section-photo--pastoral");
    if(photo){photo.classList.add("pas-photo");page.querySelector(".pas-body").appendChild(photo);}

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  const run=()=>setTimeout(build,350);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",run,{once:true});
  else run();
})();
