import test from 'node:test';
import assert from 'node:assert/strict';
import {eventEndTime,eventHasEnded,upcomingEvents} from '../assets/agenda-events.js';
import {agendaPreview} from '../src/review/agenda.js';
import {renderPage} from '../src/review/pages.js';
import {sections,publicationState} from '../assets/admin-sections.js';

const now=Date.parse('2026-11-10T18:00:00-06:00');
const activity=(id,date,extra={})=>({id,type:'event',title:'Actividad '+id,startsAt:date,location:'Templo',...extra});

test('Una actividad sin hora final permanece durante su día en Ciudad de México',()=>{
 const event=activity('hoy','2026-11-10T18:00:00Z');
 assert.equal(eventHasEnded(event,now),false);
 assert.equal(eventEndTime(event),Date.parse('2026-11-11T05:59:59.999Z'));
 assert.equal(eventHasEnded(event,Date.parse('2026-11-11T06:00:00Z')),true);
 const night=activity('noche','2026-11-11T02:00:00Z');
 assert.equal(eventEndTime(night),eventEndTime(event));
 assert.equal(eventHasEnded({...event,endsAt:'2026-11-10T17:59:59-06:00'},now),true);
 assert.equal(eventHasEnded({...event,startsAt:'fecha incorrecta'},now),true);
 assert.match(publicationState({type:'event',published:event,draft:event},now)[0],/Publicado/);
 assert.equal(publicationState({type:'event',published:event,draft:event},Date.parse('2026-11-12T00:00:00Z'))[0],'Finalizado');
});

test('La portada muestra cinco próximos por fecha y usa la imagen principal de cada actividad',()=>{
 const events=Array.from({length:7},(_,i)=>activity('e'+i,`2026-11-${String(12+i).padStart(2,'0')}T18:00:00-06:00`)).reverse();
 events.push(activity('pasado','2026-11-09T18:00:00-06:00'));
 const first=events.find(e=>e.id==='e0');
 first.photos=[{image:'/assets/images/liturgia-1280.jpg',alt:'Cartel completo'},{image:'/assets/images/nosotros-1280.jpg',alt:'Imagen secundaria'}];
 first.image='/assets/images/nosotros-1280.jpg';
 const html=agendaPreview(events,now);
 assert.deepEqual(upcomingEvents(events,now,5).map(e=>e.id),['e0','e1','e2','e3','e4']);
 assert.equal((html.match(/data-agenda-slide /g)||[]).length,5);
 assert.match(html,/src="\/assets\/images\/liturgia-1280.jpg"/);
 assert.match(html,/<h2 id="home-agenda-title">Agenda<\/h2>/);
 assert.match(html,/<button type="button" class="agenda-visual" data-image="\/assets\/images\/liturgia-1280.jpg"/);
 assert.match(html,/data-close-on-image-click="true"/);
 assert.doesNotMatch(html,/nosotros-1280.jpg|data-event-id="pasado"|data-event-id="e5"/);
 assert.match(html,/data-agenda-controls hidden/);
 assert.match(html,/aria-label="1. Actividad e0"/);
});

test('Un solo evento permanece fijo; sin eventos se omite el bloque y los títulos se escapan',()=>{
 assert.equal(agendaPreview([],now),'');
 const html=agendaPreview([activity('unico','2026-11-12T18:00:00-06:00',{title:'Concierto <script> & comunidad'})],now);
 assert.match(html,/Concierto &lt;script&gt; &amp; comunidad/);
 assert.match(html,/agenda-card-text/);
 assert.doesNotMatch(html,/data-agenda-controls|data-agenda-index|<script>/);
});

test('Agenda ocupa el lugar aprobado y tiene una sola vista previa antes de los servicios',()=>{
 const event=activity('futuro','2099-11-12T18:00:00-06:00');
 const html=renderPage('/',[event]);
 const nav=html.match(/<nav id="primary-nav"[\s\S]*?<\/nav>/)[0];
 assert.ok(nav.indexOf('/agua-de-san-ignacio')<nav.indexOf('/agenda'));
 assert.ok(nav.indexOf('/agenda')<nav.indexOf('/historia'));
 assert.match(renderPage('/agenda',[event]),/href="\/agenda"[^>]*aria-current="page"/);
 assert.equal((html.match(/data-agenda-carousel/g)||[]).length,1);
 assert.ok(html.indexOf('class="hours-band"')<html.indexOf('data-agenda-carousel'));
 assert.ok(html.indexOf('data-agenda-carousel')<html.indexOf('class="wrap editorial-section"'));
 assert.doesNotMatch(html,/class="event-row"/);
 assert.equal(sections.filter(s=>s.id==='event').length,1);
 assert.equal(sections.find(s=>s.id==='event').label,'Agenda');
});

test('Las actividades anteriores y las grabaciones conservan un solo destino',()=>{
 const docs=[activity('pasado','2000-01-01T18:00:00-06:00'),{id:'grabacion',type:'music',title:'Grabación única',body:'Archivo musical'}];
 const agenda=renderPage('/agenda',docs).match(/<main id="contenido">([\s\S]*?)<\/main>/)[1];
 assert.match(agenda,/Encuentros anteriores/);
 assert.equal((agenda.match(/href="\/agenda\/pasado"/g)||[]).length,1);
 assert.doesNotMatch(agenda,/Grabaciones y publicaciones|Grabación única|data-agenda-carousel/);
 assert.match(renderPage('/musica',docs),/Grabación única/);
});

test('La fotografía de la actividad se amplía sin un rótulo sobre la imagen',()=>{
 const event=activity('cartel','2099-11-12T18:00:00-06:00',{photos:[{image:'/assets/images/liturgia-1280.jpg',alt:'Cartel de la actividad'}]});
 const html=renderPage('/agenda/cartel',[event]);
 assert.match(html,/<button type="button" class="publication-image publication-image-main"[^>]*data-image="\/assets\/images\/liturgia-1280.jpg"/);
 assert.doesNotMatch(html,/Ver imagen completa/);
 assert.match(html,/id="lightbox"/);
});
