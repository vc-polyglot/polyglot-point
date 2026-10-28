
(() => {
  "use strict";

  const make = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  const addLiturgy = () => {
    const section = document.querySelector("#liturgia");
    if (!section || section.querySelector(".si-v3-liturgy")) return;

    const photo = section.querySelector(".site-section-photo--liturgia");
    const block = make(`
      <div class="si-v3-block si-v3-liturgy">
        <div class="si-v3-grid">
          <article class="si-v3-card">
            <p class="si-v3-eyebrow">Intenciones de misa</p>
            <h3>Misas comunitarias</h3>
            <p>De lunes a sábado todas las misas son comunitarias y se aceptan intenciones de vivos y difuntos. No hay misas individuales.</p>
            <p>El domingo únicamente se aceptan intenciones en las misas de 12:00 y 13:30 h.</p>
            <p class="si-v3-note">Las misas dominicales de 12:00 y 13:30 h se transmiten por Zoom. La invitación se publica en Facebook: Iglesia San Ignacio Polanco.</p>
          </article>
          <article class="si-v3-card">
            <p class="si-v3-eyebrow">Jueves Eucarístico</p>
            <h3>Hora Santa</h3>
            <p>Todos los jueves, de 17:30 a 18:30 h.</p>
          </article>
        </div>
      </div>
    `);
    if (photo) section.insertBefore(block, photo);
    else section.appendChild(block);
  };

  const addPastoral = () => {
    const section = document.querySelector("#pastoral");
    if (!section || section.querySelector(".si-v3-pastoral")) return;

    const block = make(`
      <div class="si-v3-block si-v3-pastoral">
        <div class="si-v3-grid">
          <article class="si-v3-card">
            <p class="si-v3-eyebrow">Formación</p>
            <h3>Catecismo</h3>
            <p>Para niños con 7 años cumplidos que quieran recibir la Primera Comunión.</p>
            <p><strong>Jueves:</strong> 16:30 a 18:00 h.</p>
            <p>Inicia cada año en septiembre; las inscripciones son en agosto. Para información, comunicarse a la oficina de la iglesia.</p>
          </article>

          <article class="si-v3-card">
            <p class="si-v3-eyebrow">Formación</p>
            <h3>Estudio de la Biblia</h3>
            <p><strong>Miércoles:</strong> 12:00 a 13:30 h.</p>
            <p>Para unirse, acudir en el día y horario indicado, con Biblia y lo necesario para tomar notas.</p>
          </article>

          <article class="si-v3-card si-v3-card--poster">
            <figure class="si-v3-media">
              <img src="/img/site-photos/comunidad-juvenil-ignaciana.jpeg" alt="Comunidad Juvenil Ignaciana" loading="lazy">
            </figure>
            <p class="si-v3-eyebrow">Jóvenes</p>
            <h3>Comunidad Juvenil Ignaciana</h3>
            <p>Grupo de jóvenes ignacianos que buscan amar y servir.</p>
          </article>

          <article class="si-v3-card">
            <figure class="si-v3-media">
              <img src="/img/site-photos/inea-san-ignacio.jpeg" alt="Información del INEA en San Ignacio de Loyola" loading="lazy">
            </figure>
            <p class="si-v3-eyebrow">Servicio comunitario</p>
            <h3>INEA</h3>
            <p>San Ignacio es sede de un grupo del Instituto Nacional para la Educación de los Adultos, con alfabetización y apoyo para terminar primaria o secundaria.</p>
          </article>
        </div>
      </div>
    `);

    const photo = section.querySelector(".site-section-photo--pastoral");
    if (photo) section.insertBefore(block, photo);
    else section.appendChild(block);
  };

  const addCollaborators = () => {
    const section = document.querySelector("#nosotros");
    if (!section || section.querySelector(".si-v3-collaborators")) return;

    const block = make(`
      <div class="si-v3-block si-v3-collaborators">
        <p class="section-kicker">Colaboradores</p>
        <div class="si-v3-grid">
          <article class="si-v3-card si-v3-person">
            <div>
              <strong>P. Luis González-Cosío Elcoro, S.J.</strong>
              <div class="si-v3-role">Rector</div>
            </div>
          </article>
          <article class="si-v3-card si-v3-person">
            <div>
              <strong>P. José de Jesús Rojas García, S.J.</strong>
              <div class="si-v3-role">Vicario</div>
            </div>
          </article>
          <article class="si-v3-card si-v3-person">
            <div>
              <strong>Arturo Vallín López</strong>
              <div class="si-v3-role">Oficina y administración</div>
            </div>
          </article>
          <article class="si-v3-card si-v3-person">
            <div>
              <strong>Adriana Arriaga Morales</strong>
              <div class="si-v3-role">Oficina y administración</div>
            </div>
          </article>
          <article class="si-v3-card si-v3-person">
            <div>
              <strong>Ignacio Ortíz Perea</strong>
              <div class="si-v3-role">Sacristán</div>
            </div>
          </article>
          <article class="si-v3-card si-v3-person">
            <div>
              <strong>Rogelio Solís Colín</strong>
              <div class="si-v3-role">Sacristán</div>
            </div>
          </article>
        </div>
      </div>
    `);

    const directory = section.querySelector(".community-directory");
    if (directory) directory.insertAdjacentElement("afterend", block);
    else section.appendChild(block);
  };

  const cleanAgenda = () => {
    const empty = document.querySelector("#musica .si-agenda-empty");
    if (empty && /consultando|cargando/i.test(empty.textContent || "")) {
      empty.textContent = "No hay eventos publicados por el momento.";
    }
  };

  const run = () => {
    addLiturgy();
    addPastoral();
    addCollaborators();
    cleanAgenda();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  // Una segunda pasada cubre contenido que cargue después.
  window.addEventListener("load", run, { once: true });
  setTimeout(run, 700);
})();
