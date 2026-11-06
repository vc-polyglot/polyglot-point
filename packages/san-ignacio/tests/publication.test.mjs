import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {historicalPublication} from '../src/review/publication.js';
import {institutionalHistory} from '../src/review/history.js';
import {renderPage} from '../src/review/pages.js';

test('Las veinte páginas conservan el orden del escaneo y sus derivados verificados',()=>{
 const sources=JSON.parse(fs.readFileSync('docs/history/memorias-construccion-procedencia.json','utf8'));
 assert.equal(historicalPublication.pages.length,20);assert.equal(sources.sources.length,20);
 const all=[historicalPublication.cover,...historicalPublication.pages.map(p=>p.image)];
 for(const [index,page]of historicalPublication.pages.entries()){
  assert.ok(page.image.endsWith(`pagina-${String(index+1).padStart(2,'0')}.jpg`));
  assert.ok(page.width>1500&&page.height>2000);assert.ok(page.label);
 }
 for(const url of all){
  assert.match(url,/^\/assets\/publications\/memorias-construccion\/[a-z0-9-]+\.jpg$/);
  const bytes=fs.readFileSync('.'+url),source=sources.publicDerivatives.find(s=>url.endsWith('/'+s.file));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),source.sha256);
  assert.equal(bytes[0],255);assert.equal(bytes[1],216);
 }
});

test('La consulta sólo aparece en Historia y no expone PDF, descarga ni impresión',()=>{
 const html=renderPage('/historia',[]);
 assert.equal((html.match(/id="publication-reader"/g)||[]).length,1);
 assert.equal((html.match(/<option /g)||[]).length,20);
 assert.match(html,/data-publication-plus/);assert.match(html,/data-publication-fullscreen/);
 assert.match(html,/Texto fechado el 30 de octubre de 1966/);
 assert.doesNotMatch(html,/\.pdf\b|\bdownload(?:=|\s|>)|<iframe|<embed|<object|onclick=/i);
 assert.doesNotMatch(renderPage('/nosotros',[]),/publication-reader|publication-page/);
});

test('Los aportes de las Memorias se integran una sola vez y tienen procedencia interna',()=>{
 const text=institutionalHistory.chapters.flatMap(c=>c.paragraphs).join('\n');
 for(const fact of ['29 de marzo de 1957','28 de noviembre de 1955','27 de noviembre de 1958','29 de septiembre de 1961','Francisco Guerrero','José Ignacio Abiega','25 de junio de 1965','mascarilla de yeso'])assert.equal(text.split(fact).length-1,1,fact);
 assert.doesNotMatch(text,/José Mata|Antonio Bluth|Antonio Buch/);
 for(const chapter of institutionalHistory.chapters){
  const pages=chapter.sourcePages?.['memorias-construccion'];
  if(pages)assert.ok(pages.every(p=>Number.isInteger(p)&&p>=3&&p<=18));
 }
 assert.equal(new Set(institutionalHistory.chapters.flatMap(c=>c.paragraphs)).size,institutionalHistory.chapters.flatMap(c=>c.paragraphs).length);
});
