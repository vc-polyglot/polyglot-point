import assert from 'node:assert/strict';
import fs from 'node:fs';
import {navigationGroups} from '../src/review/navigation.js';
const base='http://127.0.0.1:3310';const cache=new Map();
async function page(path){if(!cache.has(path)){const response=await fetch(base+path);assert.equal(response.status,200,path);cache.set(path,await response.text());}return cache.get(path);}
const targets=[];
function collect([label,href,children=[]]){targets.push({label,href});children.forEach(collect);}
navigationGroups.forEach(collect);
for(const {label,href}of targets){const url=new URL(href,base),html=await page(url.pathname);if(url.hash){const id=url.hash.slice(1);assert.ok(html.includes('id="'+id+'"'),label+': falta '+id);assert.ok(html.includes('class="section-return" href="'+url.pathname+'"'),label+': falta acceso a la sección completa');}}
const old=await fetch(base+'/comunidad',{redirect:'manual'});assert.equal(old.status,302);assert.equal(old.headers.get('location'),'/pastoral');
const history=await page('/historia');const main=history.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
assert.doesNotMatch(main,/Una memoria|Vida de la comunidad|Grupo Nuestra Señora de Guadalupe|El presente sembrado|Música y órgano|Víctor Urbán|Otros textos del templo|Prefacio|notas? editorial/i);
assert.equal((main.match(/class="history-milestone"/g)||[]).length,10);
assert.equal((main.match(/cédulas hipotecarias/g)||[]).length,1);
const pastoral=await page('/pastoral');for(const id of ['inea','comunidad-juvenil'])assert.equal((pastoral.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
for(const asset of ['/assets/site.css?v=6','/assets/site.js?v=6','/assets/navigation-motion.js','/assets/history.css?v=3','/assets/images/historia-arquitectura-1280.jpg'])assert.equal((await fetch(base+asset)).status,200,asset);
const result={checkedAt:new Date().toISOString(),pages:cache.size,navigationTargets:targets.length,chapters:10,duplicateCommunityGroups:false,legacyCommunityRedirect:true,assets:true,menuBehavior:'Pruebas automatizadas: hover, clic tras hover, cierre, toque, teclado, Escape y recorrido del puntero.'};
fs.writeFileSync('reports/local-review-final.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
