(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/agua-de-san-ignacio") return;

  function build(){
    const source=document.querySelector("#agua");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".agu-page")) return;

    document.body.classList.add("si-agu-page");

    const page=document.createElement("section");
    page.className="agu-page";
    page.innerHTML=`
      <header class="agu-head">
        <p class="agu-kicker">Sacramental</p>
        <h1 class="agu-title">Agua de San Ignacio</h1>
      </header>
      <div class="agu-body">
        <article class="agu-text"></article>
        <aside class="agu-aside"></aside>
      </div>`;

    const text=source.querySelector(".si-managed-body");
    if(text) page.querySelector(".agu-text").appendChild(text);

    const extras=[...source.querySelectorAll("figure,.site-section-photo")];
    extras.forEach(n=>page.querySelector(".agu-aside").appendChild(n));

    if(!extras.length){
      page.querySelector(".agu-aside").innerHTML="<p>Un sacramental de la tradición ignaciana, recibido con fe y oración.</p>";
    }

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build,{once:true});
  else build();
})();
