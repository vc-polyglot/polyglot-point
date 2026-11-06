import test from 'node:test';
import assert from 'node:assert/strict';
import {peopleList} from '../src/review/people.js';

test('Todas las personas tienen un desplegable nativo, también sin fotografía',()=>{
 const html=peopleList([{id:'rector',title:'Luis González',role:'Rector',order:1},{id:'administracion',title:'Adriana Arriaga Morales',role:'Administración',order:2}]);
 assert.equal((html.match(/<details class="person-profile"/g)||[]).length,2);
 assert.equal((html.match(/<summary><h2>/g)||[]).length,2);
 assert.equal((html.match(/class="person-expand" aria-hidden="true">\+/g)||[]).length,2);
 assert.equal((html.match(/Fotografía pendiente\./g)||[]).length,2);
 assert.doesNotMatch(html,/<img\b|aria-disabled|tabindex="-1"|<details[^>]*\bopen\b/);
});

test('Cada foto se incluye exclusivamente dentro del desplegable de su persona',()=>{
 const html=peopleList([
  {id:'victor',title:'Víctor Contreras',role:'Organista',image:'/assets/images/victor-contreras.png',alt:'Víctor junto al órgano'},
  {id:'vicario',title:'José de Jesús',role:'Vicario',image:'/assets/images/jose-de-jesus-rojas-garcia.png',alt:'José de Jesús'},
  {id:'luis',title:'Luis González',role:'Rector'}
 ]);
 const victor=html.match(/id="victor">([\s\S]*?)<\/details>/)[1];
 const vicar=html.match(/id="vicario">([\s\S]*?)<\/details>/)[1];
 const rector=html.match(/id="luis">([\s\S]*?)<\/details>/)[1];
 assert.match(victor,/victor-contreras\.png/);assert.doesNotMatch(victor,/jose-de-jesus-rojas-garcia\.png/);
 assert.match(vicar,/jose-de-jesus-rojas-garcia\.png/);assert.doesNotMatch(vicar,/victor-contreras\.png/);
 assert.doesNotMatch(rector,/<img\b/);assert.match(rector,/Fotografía pendiente/);
 assert.match(victor,/loading="lazy"/);assert.match(vicar,/alt="José de Jesús"/);
 assert.match(victor,/<button class="photo-button person-photo" type="button"/);
 assert.match(victor,/data-close-on-image-click="true"/);
 assert.match(victor,/aria-label="Ampliar fotografía de Víctor Contreras"/);
 assert.match(victor,/aria-haspopup="dialog" aria-controls="lightbox"/);
 assert.doesNotMatch(rector,/<button/);
});

test('El orden respeta las fichas del CMS sin modificar la colección recibida',()=>{
 const people=[{id:'arturo',title:'Arturo',role:'Administración',order:40},{id:'adriana',title:'Adriana Arriaga Morales',role:'Administración',order:30}];
 const html=peopleList(people);
 assert.ok(html.indexOf('id="adriana"')<html.indexOf('id="arturo"'));
 assert.equal(people[0].id,'arturo');
});

test('Las semblanzas se conservan y los textos del directorio se escapan',()=>{
 const html=peopleList([{id:'persona',title:'Nombre <script>',role:'Cargo',body:'Semblanza <img onerror="alert(1)">'}]);
 assert.match(html,/Nombre &lt;script&gt;/);assert.match(html,/Semblanza &lt;img/);
 assert.doesNotMatch(html,/<script>|<img onerror=/);
 assert.match(html,/class="prose person-biography"/);
});
