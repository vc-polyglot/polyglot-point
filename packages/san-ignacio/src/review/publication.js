import fs from 'node:fs';
import {esc} from './html.js';

export const historicalPublication=JSON.parse(fs.readFileSync(new URL('./data/historical-publication.json',import.meta.url),'utf8'));

export function publicationConsultation(){
 const publication=historicalPublication;
 return `<section class="wrap history-publication" id="publicacion-historica" aria-labelledby="publication-title">
  <figure class="publication-cover"><img src="${esc(publication.cover)}" width="420" height="552" loading="lazy" decoding="async" alt="Portada de las Memorias: fachada del templo de San Ignacio de Loyola"></figure>
  <div class="publication-introduction"><p class="eyebrow">La publicación original</p><h2 id="publication-title">${esc(publication.title)}</h2><p class="publication-subtitle">${esc(publication.subtitle)}</p><p>El P. Rodolfo Mendoza, S.J., relata la construcción del templo y el esfuerzo compartido que la hizo posible.</p><p class="publication-date">Texto fechado el 30 de octubre de 1966 · ${publication.pages.length} páginas</p><button class="button" type="button" data-publication-open aria-haspopup="dialog" aria-controls="publication-reader">Consultar publicación <span aria-hidden="true">↗</span></button></div>
 </section>
 <dialog class="publication-reader" id="publication-reader" aria-labelledby="reader-title">
  <div class="publication-reader-layout">
   <header class="publication-reader-heading"><div><h2 id="reader-title">${esc(publication.title)}</h2><p>${esc(publication.subtitle)}</p></div><button type="button" data-publication-close aria-label="Cerrar publicación">Cerrar ×</button></header>
   <div class="publication-toolbar" role="group" aria-label="Controles de lectura">
    <div class="publication-pagination"><button type="button" data-publication-prev aria-label="Página anterior">←</button><label for="publication-page">Página <select id="publication-page">${publication.pages.map((page,index)=>`<option value="${index}" data-src="${esc(page.image)}" data-width="${page.width}" data-height="${page.height}" data-label="${esc(page.label)}">${index+1} de ${publication.pages.length} · ${esc(page.label)}</option>`).join('')}</select></label><button type="button" data-publication-next aria-label="Página siguiente">→</button></div>
    <div class="publication-zoom"><button type="button" data-publication-minus aria-label="Reducir página">−</button><output data-publication-scale aria-label="Nivel de ampliación">100 %</output><button type="button" data-publication-plus aria-label="Ampliar página">+</button><button type="button" data-publication-fit>Ajustar</button><button type="button" data-publication-fullscreen aria-pressed="false">Pantalla completa</button></div>
   </div>
   <div class="publication-stage" tabindex="0" role="region" aria-label="Página de la publicación. Usa las flechas izquierda y derecha para cambiar de página y los controles para ampliar."><img data-publication-image alt="" draggable="false" decoding="async" hidden></div>
   <p class="publication-reader-status" role="status" aria-live="polite" data-publication-status></p>
  </div>
 </dialog>`;
}
