(() => {
  const people = {
    "P. Luis González-Cosío Elcoro, S.J.": {
      photo: "/img/staff/luis-gonzalez-cosio.jpg",
      cv: "Rector de San Ignacio de Loyola. La semblanza curricular completa podrá incorporarse aquí conservando esta misma presentación."
    },
    "P. José de Jesús Rojas García, S.J.": {
      photo: "/img/staff/jose-de-jesus-rojas.jpg",
      cv: "Vicario de San Ignacio de Loyola. La semblanza curricular completa podrá incorporarse aquí conservando esta misma presentación."
    },
    "Arturo Vallín López": {
      photo: "/img/staff/arturo-vallin.jpg",
      cv: "Miembro del equipo de administración de San Ignacio de Loyola. La información curricular completa podrá incorporarse en esta ficha."
    },
    "Adriana Arriaga Morales": {
      photo: "/img/staff/adriana-arriaga.jpg",
      cv: "Miembro del equipo de administración de San Ignacio de Loyola. La información curricular completa podrá incorporarse en esta ficha."
    },
    "Ignacio Ortíz Perea": {
      photo: "/img/staff/ignacio-ortiz.jpg",
      cv: "Sacristán de San Ignacio de Loyola. La información biográfica o curricular podrá incorporarse en esta ficha."
    },
    "Rogelio Solís Colín": {
      photo: "/img/staff/rogelio-solis.jpg",
      cv: "Sacristán de San Ignacio de Loyola. La información biográfica o curricular podrá incorporarse en esta ficha."
    }
  };

  function init(){
    const page=document.querySelector("#si-nosotros-interior");
    if(!page || document.querySelector(".si-person-modal")) return;

    const modal=document.createElement("div");
    modal.className="si-person-modal";
    modal.setAttribute("aria-hidden","true");

    modal.innerHTML=`
      <article class="si-person-dialog"
               role="dialog"
               aria-modal="true"
               aria-labelledby="si-person-modal-name">

        <button class="si-person-close"
                type="button"
                aria-label="Cerrar">×</button>

        <div class="si-person-photo-wrap">
          <img class="si-person-photo" alt="">
          <div class="si-person-photo-placeholder">
            Fotografía individual pendiente de integrar.
          </div>
        </div>

        <div class="si-person-content">
          <p class="si-person-role"></p>
          <h2 class="si-person-name" id="si-person-modal-name"></h2>
          <div class="si-person-rule"></div>
          <h3 class="si-person-cv-title">Currículum</h3>
          <p class="si-person-cv"></p>
        </div>
      </article>
    `;

    document.body.appendChild(modal);

    const close=modal.querySelector(".si-person-close");
    const photo=modal.querySelector(".si-person-photo");
    const photoWrap=modal.querySelector(".si-person-photo-wrap");
    const roleOut=modal.querySelector(".si-person-role");
    const nameOut=modal.querySelector(".si-person-name");
    const cvOut=modal.querySelector(".si-person-cv");

    let previousFocus=null;

    function closeModal(){
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden","true");
      document.body.classList.remove("si-person-modal-open");
      if(previousFocus) previousFocus.focus();
    }

    function openModal(card){
      const name=card.querySelector(".si-ni-name")?.textContent.trim() || "";
      const role=card.querySelector(".si-ni-role-label")?.textContent.trim() || "";
      const data=people[name] || {};

      previousFocus=card;

      roleOut.textContent=role;
      nameOut.textContent=name;
      cvOut.textContent=data.cv || "Información curricular pendiente de integrar.";

      photoWrap.classList.remove("is-missing");
      photo.alt=`${name} — ${role}`;

      photo.onerror=()=>{
        photoWrap.classList.add("is-missing");
      };

      photo.src=data.photo || "";

      if(!data.photo){
        photoWrap.classList.add("is-missing");
      }

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden","false");
      document.body.classList.add("si-person-modal-open");
      close.focus();
    }

    page.querySelectorAll(".si-ni-role").forEach(card=>{
      card.tabIndex=0;
      card.setAttribute("role","button");
      card.setAttribute("aria-haspopup","dialog");

      card.addEventListener("click",()=>openModal(card));

      card.addEventListener("keydown",e=>{
        if(e.key==="Enter" || e.key===" "){
          e.preventDefault();
          openModal(card);
        }
      });
    });

    close.addEventListener("click",closeModal);

    modal.addEventListener("click",e=>{
      if(e.target===modal) closeModal();
    });

    document.addEventListener("keydown",e=>{
      if(e.key==="Escape" && modal.classList.contains("is-open")){
        closeModal();
      }
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }
})();
