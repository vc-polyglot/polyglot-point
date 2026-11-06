import fs from 'node:fs';
import {esc,paragraphs,photo} from './html.js';
import {publicationConsultation} from './publication.js';

// The source transcriptions remain intact for internal documentary work.
export const historyArchive=JSON.parse(fs.readFileSync(new URL('./data/history-dossier.json',import.meta.url),'utf8'));
export const institutionalHistory=JSON.parse(fs.readFileSync(new URL('./data/history-institutional.json',import.meta.url),'utf8'));

export function historyPage(){
 const poem=historyArchive.documents.find(doc=>doc.id==='HIST-030').segments[0].text;
 return `<div class="history-page">
  <header class="wrap history-heading"><p class="eyebrow">La memoria del templo</p><h1>Historia y<br>arquitectura</h1><nav aria-label="Recorrer la historia"><a href="#hist-030">Está hecha de amor</a><a href="#origenes">Orígenes</a><a href="#arquitectura">Arquitectura</a><a href="#pinturas-miguel-cabrera">Patrimonio artístico</a><a href="#publicacion-historica">La publicación original</a></nav></header>
  <section class="history-opening" aria-labelledby="amor-title" id="hist-030"><div class="wrap history-opening-layout">
   <header class="history-opening-caption"><p class="eyebrow">La voz de quien la hizo posible</p><h2 id="amor-title">Está hecha<br>de amor</h2><p class="history-author">P. Rodolfo Mendoza, S.J.</p><p>Encargado de la obra<br>y primer capellán de la Iglesia</p><time datetime="1961-07-31">31 de julio de 1961</time><figure class="history-construction-photo">${photo('/assets/images/historia-arquitectura-1280.jpg','Obreros sobre las estructuras de acero durante la construcción del templo de San Ignacio',{sizes:'(max-width: 720px) calc(100vw - 40px), 420px'})}<figcaption>La estructura del templo durante su construcción.</figcaption></figure></header>
   <div class="history-opening-reading"><blockquote><div class="history-verse">${paragraphs(poem)}</div></blockquote></div>
  </div></section>
  <section class="wrap history-section" id="cronologia" aria-labelledby="cronologia-title"><div class="history-section-heading"><p class="eyebrow">Historia del templo</p><h2 id="cronologia-title">De un proyecto<br>a una comunidad.</h2><p>Una historia de arquitectura, trabajo y generosidad. Abre cada capítulo para conocerla.</p></div><ol class="history-timeline" data-history-chapters>${institutionalHistory.chapters.map(chapter=>`<li><details class="history-milestone" name="history-timeline" id="${esc(chapter.id)}"><summary><span class="history-timeline-date">${esc(chapter.period)}</span><span class="history-event-title">${esc(chapter.title)}</span><span class="history-expand" aria-hidden="true">+</span></summary><div class="history-chapter-reading"><a class="section-return" href="/historia">Historia <span aria-hidden="true">↗</span></a><div class="history-original">${chapter.paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}</div></div></details></li>`).join('')}</ol></section>
  ${publicationConsultation()}
  <div class="wrap history-back-top"><a href="#contenido">Volver al comienzo <span aria-hidden="true">↑</span></a></div>
 </div>`;
}
