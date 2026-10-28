(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/contacto") return;

  function build(){
    const source=document.querySelector("#contacto");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".con-page")) return;

    document.body.classList.add("si-con-page");

    const page=document.createElement("section");
    page.className="con-page";
    page.innerHTML=`
      <header class="con-head">
        <p class="con-kicker">Polanco · Ciudad de México</p>
        <h1 class="con-title">Contacto</h1>
      </header>
      <div class="con-body">
        <section class="con-info"></section>
        <section class="con-formwrap"></section>
        <section class="con-direct"></section>
      </div>`;

    const oldIntro=source.querySelector(".contact-intro");
    if(oldIntro){
      [...oldIntro.children].forEach(n=>{
        if(!n.matches(".section-kicker,h2")) page.querySelector(".con-info").appendChild(n);
      });
    }

    const form=source.querySelector("#contact-form");
    if(form) page.querySelector(".con-formwrap").appendChild(form);

    const direct=source.querySelector(".direct-contact");
    if(direct) page.querySelector(".con-direct").appendChild(direct);

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build,{once:true});
  else build();
})();
