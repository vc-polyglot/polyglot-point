(() => {
  "use strict";

  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/") return;

  document.body.classList.add("si-home-interior-sync");

  const q = (s, root=document) => root.querySelector(s);
  const qa = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");

  /* ==========================================================
     1. VIDA LITÚRGICA
     Conserva:
       #schedule-grid
       #notices
       .mass-hours-primary
       .si-intentions-card
     Sólo retira visualmente el segundo horario heredado.
     ========================================================== */

  const liturgia = q("#liturgia");

  if (liturgia) {
    q(".liturgy-hours", liturgia)?.classList.add("si-home-source-hidden");

    const intentions = q(".si-intentions-card", liturgia);
    const photo = q(".site-section-photo--liturgia", liturgia);

    if (intentions && !q(".si-home-liturgia-three", liturgia)) {
      const group = document.createElement("div");
      group.className = "si-home-liturgia-three";

      if (photo) photo.before(group);
      else liturgia.append(group);

      group.append(intentions);

      group.insertAdjacentHTML("beforeend", `
        <article class="si-home-liturgia-item">
          <p class="section-kicker">Jueves Eucarístico</p>
          <h3>Hora Santa</h3>
          <p>Todos los jueves, de 17:30 a 18:30 h.</p>
          <a href="/vida-liturgica#jueves-eucaristico">
            Ver información →
          </a>
        </article>

        <article class="si-home-liturgia-item">
          <p class="section-kicker">Reconciliación</p>
          <h3>Confesiones</h3>
          <p>Al final de las misas de lunes a sábado, solicite al sacerdote celebrante la confesión.</p>
          <a href="/vida-liturgica#confesiones">
            Ver información →
          </a>
        </article>
      `);
    }
  }


  /* ==========================================================
     2. SACRAMENTOS
     Se conserva TODO el contenido CMS:
       data-content-slug
       summary
       .si-managed-body
     La transformación aquí es de presentación.
     ========================================================== */

  qa("#sacramentos .si-sacrament-card").forEach(card => {
    card.removeAttribute("open");
  });


  /* ==========================================================
     3. PASTORAL
     #pastoral-card sigue siendo dinámico.
     #pastoral-categories sigue en DOM para Secretaría/CMS.
     La home adopta las cuatro áreas reales de la interior.
     ========================================================== */

  const pastoral = q("#pastoral");

  if (pastoral && !q(".si-home-pastoral-programs", pastoral)) {
    const categoriesWrap = q(".si-pastoral-categories-wrap", pastoral);

    if (categoriesWrap) categoriesWrap.classList.add("si-home-source-hidden");

    const programs = document.createElement("div");
    programs.className = "si-home-pastoral-programs";

    programs.innerHTML = `
      <a href="/pastoral#catecismo">
        <span>01</span>
        <p>Catequesis</p>
        <h3>Catecismo</h3>
        <strong>Primera Comunión</strong>
        <em>Jueves · 16:30–18:00 h</em>
      </a>

      <a href="/pastoral#biblia">
        <span>02</span>
        <p>Formación</p>
        <h3>Estudio de la Biblia</h3>
        <strong>Lectura y reflexión comunitaria</strong>
        <em>Miércoles · 12:00–13:30 h</em>
      </a>

      <a href="/pastoral#comunidad-juvenil">
        <span>03</span>
        <p>Jóvenes</p>
        <h3>Comunidad Juvenil Ignaciana</h3>
        <strong>Amar y servir</strong>
        <em>Comunidad de jóvenes ignacianos</em>
      </a>

      <a href="/pastoral#inea">
        <span>04</span>
        <p>Servicio</p>
        <h3>INEA</h3>
        <strong>Educación para adultos</strong>
        <em>Alfabetización · Primaria · Secundaria</em>
      </a>
    `;

    const photo = q(".site-section-photo--pastoral", pastoral);

    if (photo) photo.before(programs);
    else pastoral.append(programs);
  }


  /* ==========================================================
     4. NOSOTROS
     community-directory y #staff-grid quedan vivos en DOM.
     La home muestra las seis personas de la interior.
     ========================================================== */

  const nosotros = q("#nosotros");

  if (nosotros && !q(".si-home-nosotros", nosotros)) {
    q(".community-directory", nosotros)?.classList.add("si-home-source-hidden");
    q("#staff-grid", nosotros)?.classList.add("si-home-source-hidden");
    q(".site-section-photo--nosotros", nosotros)?.classList.add("si-home-source-hidden");

    const heading = q(".staff-heading", nosotros);

    const block = document.createElement("div");
    block.className = "si-home-nosotros";

    block.innerHTML = `
      <figure>
        <img
          src="/img/site-photos/nosotros.jpeg"
          alt="Comunidad de San Ignacio de Loyola"
          loading="lazy"
          decoding="async">
      </figure>

      <div class="si-home-nosotros-list">
        <p class="section-kicker">Nuestra comunidad</p>

        <a href="/nosotros#rector">
          <span>Rector</span>
          <strong>P. Luis González-Cosío Elcoro, S.J.</strong>
          <b>→</b>
        </a>

        <a href="/nosotros#vicario">
          <span>Vicario</span>
          <strong>P. José de Jesús Rojas García, S.J.</strong>
          <b>→</b>
        </a>

        <a href="/nosotros#administracion">
          <span>Administración</span>
          <strong>Arturo Vallín López</strong>
          <b>→</b>
        </a>

        <a href="/nosotros">
          <span>Administración</span>
          <strong>Adriana Arriaga Morales</strong>
          <b>→</b>
        </a>

        <a href="/nosotros#sacristanes">
          <span>Sacristán</span>
          <strong>Ignacio Ortíz Perea</strong>
          <b>→</b>
        </a>

        <a href="/nosotros">
          <span>Sacristán</span>
          <strong>Rogelio Solís Colín</strong>
          <b>→</b>
        </a>
      </div>
    `;

    if (heading) heading.after(block);
    else nosotros.prepend(block);
  }


  /* ==========================================================
     5. AGUA DE SAN IGNACIO
     El contenido administrado original permanece en DOM,
     pero la representación visible copia la interior.
     NO se muestra dos veces.
     ========================================================== */

  const agua = q("#agua");

  if (agua && !q(".si-home-agua", agua)) {
    const managed = q(".si-managed-body", agua);

    if (managed) managed.classList.add("si-home-source-hidden");

    const layout = q(".si-water-layout", agua) || agua;

    const block = document.createElement("div");
    block.className = "si-home-agua";

    block.innerHTML = `
      <div class="si-home-agua-copy">
        <p>
          El Agua de San Ignacio es agua natural bendecida por el rito y oraciones en honor a San Ignacio de Loyola, aprobadas por la Iglesia, para obtener por intercesión del fundador de la Compañía de Jesús algún favor particular.
        </p>

        <p>
          Con la aprobación papal, el Agua de San Ignacio es un sacramental que adquiere fuerza contra el mal espíritu y fomenta los sentimientos de fe, esperanza y caridad.
        </p>

        <p>
          No hay que esperar que el Agua de San Ignacio haga milagros o realice magia. Es uno de los medios de los que Dios se sirve para otorgar favores o gracias especiales.
        </p>
      </div>

      <aside class="si-home-agua-important">
        <span>Importante</span>
        <strong>No se vende.</strong>
        <p>
          Se solicita en la oficina o se lleva agua propia para bendecirla al final de una misa.
        </p>
      </aside>

      <div class="si-home-agua-steps">
        <h3>Cómo obtenerla</h3>

        <a href="/agua-de-san-ignacio">
          <span>01</span>
          <p>
            Acudir de lunes a viernes de 10:00 a 14:00 y de 16:00 a 18:00 h con un recipiente vacío, máximo 2 litros, y solicitarla en la oficina.
          </p>
        </a>

        <a href="/agua-de-san-ignacio">
          <span>02</span>
          <p>
            Acudir en horario de misa —lunes a viernes 7:30, 13:30 y 18:30 h— trayendo su propia agua, sin restricción, y pedir al sacerdote al final de la misa que la bendiga.
          </p>
        </a>
      </div>
    `;

    layout.append(block);
  }


  /* ==========================================================
     6. AGENDA
     NO se inventa ningún estado.
     editorial.js sigue siendo autoridad total sobre eventos.
     Sólo se añade acceso a la página interior.
     ========================================================== */

  const agenda = q("#musica");

  if (agenda && !q(".si-home-agenda-link", agenda)) {
    const link = document.createElement("a");
    link.href = "/agenda";
    link.className = "si-home-agenda-link";
    link.textContent = "Ver agenda completa →";
    agenda.append(link);
  }


  /* ==========================================================
     7. HISTORIA
     Los tabs/panels originales siguen siendo la FUENTE.
     Creamos una representación editorial visible.
     MutationObserver escucha SOLAMENTE los nodos fuente:
     no existe bucle de observación.
     ========================================================== */

  const historia = q("#historia");

  if (historia && !q(".si-home-historia", historia)) {
    const historyCopy = q(".history-copy", historia);

    const sequence = document.createElement("div");
    sequence.className = "si-home-historia";

    if (historyCopy) historyCopy.after(sequence);
    else historia.prepend(sequence);

    const sourcePatria = q('[data-history-content="history-patria"]', historia);
    const sourceCapilla = q('[data-history-content="history-capilla"]', historia);
    const sourceArchitectureTitle = q("#about-title", historia);
    const sourceArchitectureBody = q("#about-body", historia);
    const sourceRectors = q("#history-rectors-list", historia);

    const clean = (node, max=420) => {
      const text = String(node?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      if (!text) return "";
      if (text.length <= max) return text;

      return text
        .slice(0,max)
        .replace(/\s+\S*$/, "")
        .trim() + "…";
    };

    const renderHistory = () => {
      const patria = clean(sourcePatria);
      const capilla = clean(sourceCapilla);
      const architectureTitle =
        clean(sourceArchitectureTitle,120) ||
        "Arquitectura de San Ignacio";
      const architecture = clean(sourceArchitectureBody);

      sequence.innerHTML = `
        <article class="si-home-history-chapter">
          <div>
            <span>01</span>
            <p>Instituto Patria</p>
            <h3>El origen de una comunidad</h3>
            ${patria ? `<div>${esc(patria)}</div>` : ""}
            <a href="/historia#instituto-patria">Continuar leyendo →</a>
          </div>

          <figure>
            <img
              src="/img/site-photos/historia-arquitectura.jpeg"
              alt="Historia vinculada al Instituto Patria"
              loading="lazy"
              decoding="async">
          </figure>
        </article>

        <article class="si-home-history-chapter reverse">
          <div>
            <span>02</span>
            <p>Capilla</p>
            <h3>La capilla de San Ignacio</h3>
            ${capilla ? `<div>${esc(capilla)}</div>` : ""}
            <a href="/historia#capilla">Continuar leyendo →</a>
          </div>

          <figure>
            <img
              src="/img/site-photos/historia-capilla.jpg"
              alt="Capilla de San Ignacio de Loyola"
              loading="lazy"
              decoding="async">
          </figure>
        </article>

        <article class="si-home-history-chapter">
          <div>
            <span>03</span>
            <p>Arquitectura</p>
            <h3>${esc(architectureTitle)}</h3>
            ${architecture ? `<div>${esc(architecture)}</div>` : ""}
            <a href="/historia#arquitectura">Continuar leyendo →</a>
          </div>

          <figure>
            <img
              src="/img/site-photos/historia-arquitectura.jpeg"
              alt="Arquitectura de San Ignacio de Loyola"
              loading="lazy"
              decoding="async">
          </figure>
        </article>

        <article class="si-home-history-chapter si-home-history-rectors">
          <div>
            <span>04</span>
            <p>Rectores</p>
            <h3>Rectores de San Ignacio</h3>
            <a href="/historia#rectores">Ver rectores →</a>
          </div>
        </article>
      `;
    };

    renderHistory();

    [
      sourcePatria,
      sourceCapilla,
      sourceArchitectureTitle,
      sourceArchitectureBody,
      sourceRectors
    ].filter(Boolean).forEach(node => {
      new MutationObserver(renderHistory).observe(node,{
        childList:true,
        subtree:true,
        characterData:true
      });
    });

    q(".history-tabs", historia)?.classList.add("si-home-source-hidden");
    q(".history-panels", historia)?.classList.add("si-home-source-hidden");
    q(".si-history-rectors", historia)?.classList.add("si-home-source-hidden");
    q(".architecture-placeholder", historia)?.classList.add("si-home-source-hidden");
    q(".history-photo-grid", historia)?.classList.add("si-home-source-hidden");
  }


  /* ==========================================================
     8. GALERÍA
     NO SE TOCA.
     ========================================================== */


  /* ==========================================================
     9. CONTACTO
     Se conserva #contact-form y #contact-status.
     La home adopta las tres rutas de la interior.
     ========================================================== */

  const contacto = q("#contacto");

  if (contacto) {
    const address = q(".contact-address", contacto);

    if (address) {
      address.textContent =
        "Avenida Horacio esquina Avenida Molière, Polanco, Ciudad de México.";
    }

    q(".direct-contact", contacto)?.classList.add("si-home-source-hidden");

    if (!q(".si-home-contacto-routes", contacto)) {
      const routes = document.createElement("div");
      routes.className = "si-home-contacto-routes";

      routes.innerHTML = `
        <a href="/contacto#como-llegar">
          <span>01 · Cómo llegar</span>
          <h3>San Ignacio de Loyola</h3>
          <strong>Avenida Horacio esquina Avenida Molière, Polanco, Ciudad de México.</strong>
        </a>

        <a href="/contacto#oficina">
          <span>02 · Oficina</span>
          <h3>Atención parroquial</h3>
          <strong>Tel. 55 5280 6586</strong>
          <em>amdg1@prodigy.net.mx</em>
        </a>

        <a href="/contacto#contacto-directo">
          <span>03 · Contacto directo</span>
          <h3>También en línea</h3>
          <strong>Facebook · Iglesia San Ignacio de Loyola Polanco</strong>
        </a>
      `;

      const form = q("#contact-form", contacto);

      if (form) form.before(routes);
      else contacto.append(routes);
    }
  }

})();
