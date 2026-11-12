import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderPage,routes,notFound} from '../src/review/pages.js';
import {withEditorialDefaults,withAlbumDefaults} from '../src/review/editorial-defaults.js';
import {translateText,normalizeLanguage} from '../assets/i18n.js';
import {localizeHTML} from '../src/review/localize.js';
import {withLanguage} from '../src/review/locale-context.js';
import {formatDate} from '../src/review/html.js';
import {adminPage} from '../src/review/admin-page.js';
import {introBootstrap} from '../src/review/intro.js';
const records=JSON.parse(fs.readFileSync('src/db/reference-content.json','utf8')).records;
const docs=withEditorialDefaults(records).map(withAlbumDefaults).filter(doc=>doc.published&&!doc.archived).map(doc=>({id:doc.id,type:doc.type,...doc.published}));

test('Las tres versiones tienen un único selector global y la carga predeterminada siempre es española',()=>{
 for(const route of Object.keys(routes))for(const language of ['es','en','fr']){
  const html=renderPage(route,docs,{language});assert.match(html,new RegExp('<html lang="'+language+'">'));assert.equal((html.match(/class="language-switch"/g)||[]).length,1);assert.equal((html.match(/data-site-language=/g)||[]).length,3);assert.ok(html.includes('data-site-language="'+language+'"'));assert.match(html,/<main id="contenido">/);
 }
 assert.match(renderPage('/',docs),/<html lang="es">/);assert.equal(normalizeLanguage('de'),'es');assert.match(renderPage('/',docs,{language:'en-US'}),/<html lang="es">/);
});

test('Historia, sacramentos y Agua de San Ignacio traducen párrafos completos y las fechas conservan la zona de México',()=>{
 assert.match(renderPage('/historia',docs,{language:'en'}),/In 1951, the spiritual directors/);assert.match(renderPage('/historia',docs,{language:'fr'}),/En 1951, les directeurs spirituels/);
 assert.match(renderPage('/sacramentos',docs,{language:'fr'}),/acte de naissance apostillé/);assert.match(renderPage('/sacramentos',docs,{language:'en'}),/apostilled birth certificate/);
 assert.match(renderPage('/agua-de-san-ignacio',docs,{language:'en'}),/St Ignatius Water is not sold/);assert.match(renderPage('/agua-de-san-ignacio',docs,{language:'fr'}),/L’Eau de saint Ignace n’est pas vendue/);
 assert.doesNotMatch(renderPage('/historia',docs,{language:'fr'}),/En 1951, los directores espirituales/);
});

test('Los avisos y las imágenes mantienen sus originales españoles mientras se traducen los controles',()=>{
 const notice={id:'aviso',type:'notice',title:'Primera Comunión',body:'Información para preparar cada celebración.',url:'https://example.invalid/aviso',image:'/uploads/cartel-espanol.jpg',alt:'Cartel original'};
 for(const language of ['en','fr']){const html=renderPage('/',[notice],{language});assert.match(html,/<h2 lang="es" data-original-spanish>Primera Comunión<\/h2>/);assert.match(html,/<div lang="es" data-original-spanish><p>Información para preparar cada celebración\.<\/p><\/div>/);assert.match(html,/src="\/uploads\/cartel-espanol.jpg"/);assert.ok(html.includes(language==='en'?'More information':'En savoir plus'));}
});

test('La traducción no altera scripts, URLs, identificadores ni contenido escapado',()=>{
 const html=renderPage('/',[{id:'portada',title:'San Ignacio de Loyola',image:'/assets/images/templo-1280.jpg'}],{language:'fr',nonce:'fixture'});assert.ok(html.includes(introBootstrap));assert.match(html,/href="\/pastoral#catecismo-primera-comunion"/);assert.match(html,/aria-label="Reproductor de música"|aria-label="Lecteur de musique"/);
 const hostile='<p title="Música">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>';const localized=localizeHTML(hostile,'fr');assert.match(localized,/title="Musique"/);assert.doesNotMatch(localized,/<script>/);assert.match(localized,/&lt;script&gt;/);
 assert.equal(localizeHTML('<div data-original-spanish lang="es"><p>Música</p></div><p>Música</p>','fr'),'<div data-original-spanish lang="es"><p>Música</p></div><p>Musique</p>');
});

test('Los mensajes dinámicos y las etiquetas accesibles tienen traducciones en los tres idiomas',()=>{
 assert.equal(translateText('Reproducir música','en'),'Play music');assert.equal(translateText('Reproducir música','fr'),'Lire la musique');assert.equal(translateText('Pista 2 de 4: Meditación III','fr'),'Piste 2 sur 4 : Meditación III');assert.equal(translateText('Ampliar fotografía 1 de Grupo de Adultos Mayores','en'),'Enlarge photograph 1 of Older Adults Group');
 assert.equal(translateText('4 de 20 · Portada','fr'),'4 sur 20 · Couverture');assert.equal(translateText('Música','es'),'Música');
});

test('Las solicitudes simultáneas no comparten idioma y el admin y su vista previa permanecen en español',async()=>{
 const results=await Promise.all(['en','fr','es'].map(language=>withLanguage(language,async()=>{await Promise.resolve();return formatDate('2026-11-22T18:00:00-06:00');})));assert.match(results[0],/November/);assert.match(results[1],/novembre/);assert.match(results[2],/noviembre/);
 assert.match(adminPage({loggedIn:true}),/<html lang="es">/);assert.doesNotMatch(adminPage({loggedIn:true}),/data-site-language/);assert.match(renderPage('/pastoral',docs,{preview:true,language:'fr'}),/<html lang="es">/);assert.doesNotMatch(renderPage('/pastoral',docs,{preview:true,language:'fr'}),/data-site-language/);assert.match(notFound([],{language:'fr'}),/Page introuvable/);
});
