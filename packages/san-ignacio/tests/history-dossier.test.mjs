import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPage} from '../src/review/pages.js';
import {historyArchive,institutionalHistory} from '../src/review/history.js';

const html=renderPage('/historia',[]);
const main=html.match(/<main id="contenido">([\s\S]*?)<\/main>/)[1];

test('El texto del fundador se conserva completo y con la fotografía histórica identificada',()=>{
 const poem=historyArchive.documents.find(doc=>doc.id==='HIST-030').segments[0].text;
 const verse=main.match(/<div class="history-verse">([\s\S]*?)<\/div>/)[1];
 const decoded=verse.replaceAll('</p><p>','\n\n').replace(/^<p>|<\/p>$/g,'').replaceAll('<br>','\n').replaceAll('&#39;',"'").replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
 assert.equal(decoded,poem);
 assert.match(main,/src="\/assets\/images\/historia-arquitectura-1280.jpg"/);
 assert.match(main,/alt="Obreros sobre las estructuras de acero/);
 const opening=main.match(/<section class="history-opening"[\s\S]*?<\/section>/)[0];
 assert.equal((opening.match(/<img /g)||[]).length,1);
});

test('La narración tiene capítulos únicos y todos sus enlaces llevan al mismo contenido',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),'Sin destino: '+match[1]);
 const chapters=institutionalHistory.chapters;
 assert.equal(chapters.length,9);
 for(const chapter of chapters){
  assert.equal((main.match(new RegExp('id="'+chapter.id+'"','g'))||[]).length,1);
  assert.ok(chapter.sources.every(id=>historyArchive.documents.some(doc=>doc.id===id)));
  for(const paragraph of chapter.paragraphs)assert.equal(chapters.flatMap(c=>c.paragraphs).filter(p=>p===paragraph).length,1);
 }
 assert.equal((main.match(/class="history-milestone"/g)||[]).length,9);
 assert.doesNotMatch(main,/data-history-documents|history-inline-document|archivo-documental/);
});

test('La historia integra los datos centrales sin repetir patronato, financiamiento o construcción',()=>{
 assert.equal((main.match(/El patronato y el financiamiento/g)||[]).length,1);
 assert.equal((main.match(/La construcción y la apertura al culto/g)||[]).length,1);
 for(const text of ['1,526.74','843.85','18 de junio de 1952','18 de marzo de 1956','25 de noviembre','24 de septiembre de 1957','28 de julio de 1961','1965','Miguel Cabrera','treinta pinturas','Tepotzotlán','1991','1,922','31 de julio de 2000'])assert.ok(main.includes(text),text);
 assert.equal((main.match(/cédulas hipotecarias/g)||[]).length,1);
 assert.equal((main.match(/colección de treinta pinturas/g)||[]).length,1);
});

test('Los bloques circunstanciales, las presentaciones y los apuntes internos no se publican',()=>{
 const visible=main.replace(/<dialog\b[\s\S]*?<\/dialog>/g,'').replace(/<[^>]*>/g,'');
 assert.doesNotMatch(visible,/Testimonios de nuestra historia|Una memoria|revistas conmemorativas|Vida de la comunidad|Grupo Nuestra Señora de Guadalupe|El presente sembrado|Música y órgano|Víctor Urbán|Memorias, personas y legado|Prefacio|Otros Padres colaboradores|Otros textos del templo|HIST-\d|nota editorial|título editorial|por verificar|lectura dudosa/i);
 assert.doesNotMatch(main,/vida-del-templo|memoria-compartida|hist-017|hist-023|hist-026|hist-027/);
 assert.ok(historyArchive.documents.some(doc=>doc.id==='HIST-023'));
 assert.ok(historyArchive.documents.some(doc=>doc.notes.length));
});

test('Historia conserva su acceso completo al entrar en un capítulo',()=>{
 assert.match(main,/<a class="section-return" href="\/historia">Historia/);
 assert.match(html,/\/assets\/history\.css\?v=4/);
 assert.match(renderPage('/galeria',[]),/id="lightbox"/);
 assert.doesNotMatch(renderPage('/galeria',[]),/\/assets\/history\.css/);
});
