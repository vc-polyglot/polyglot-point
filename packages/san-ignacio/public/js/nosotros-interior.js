(() => {
  function buildNosotros(){
    if(location.pathname.replace(/\/+$/,"") !== "/nosotros") return;

    document.body.classList.add("si-nosotros-interior");

    const main=document.querySelector("main");
    if(!main || document.querySelector("#si-nosotros-interior")) return;

    const page=document.createElement("section");
    page.id="si-nosotros-interior";
    page.setAttribute("aria-labelledby","si-ni-title");

    page.innerHTML=`
      <header class="si-ni-hero">
        <p class="si-ni-kicker">Nuestra comunidad</p>
        <h1 class="si-ni-title" id="si-ni-title">Nosotros</h1>
        <p class="si-ni-intro">
          La comunidad de San Ignacio de Loyola está al servicio de la vida
          litúrgica, pastoral y cotidiana de la iglesia.
        </p>
      </header>

      <div class="si-ni-grid">
        <figure class="si-ni-photo">
          <img src="/img/site-photos/nosotros.jpeg"
               alt="Comunidad de San Ignacio de Loyola">
        </figure>

        <div class="si-ni-directory" aria-label="Directorio de San Ignacio de Loyola">

          <article class="si-ni-role">
            <p class="si-ni-role-label">Rector</p>
            <h2 class="si-ni-name">P. Luis González-Cosío Elcoro, S.J.</h2>
          </article>

          <article class="si-ni-role">
            <p class="si-ni-role-label">Vicario</p>
            <h2 class="si-ni-name">P. José de Jesús Rojas García, S.J.</h2>
          </article>

          <article class="si-ni-role">
            <p class="si-ni-role-label">Administración</p>
            <h2 class="si-ni-name">Arturo Vallín López</h2>
          </article>

          <article class="si-ni-role">
            <p class="si-ni-role-label">Administración</p>
            <h2 class="si-ni-name">Adriana Arriaga Morales</h2>
          </article>

          <article class="si-ni-role">
            <p class="si-ni-role-label">Sacristán</p>
            <h2 class="si-ni-name">Ignacio Ortíz Perea</h2>
          </article>

          <article class="si-ni-role">
            <p class="si-ni-role-label">Sacristán</p>
            <h2 class="si-ni-name">Rogelio Solís Colín</h2>
          </article>

        </div>
      </div>
    `;

    main.appendChild(page);
    window.scrollTo(0,0);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",buildNosotros,{once:true});
  }else{
    buildNosotros();
  }
})();
