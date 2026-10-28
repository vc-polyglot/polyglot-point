import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
const base='http://127.0.0.1:3310',routes=['/','/vida-liturgica','/sacramentos','/pastoral','/comunidad','/agenda','/musica','/nosotros','/agua-de-san-ignacio','/historia','/galeria','/contacto'];
const pages=new Map(),links=new Set(),assets=new Set(),errors=[];
for(const route of routes){const response=await fetch(base+route);if(!response.ok)errors.push({route,status:response.status});const html=await response.text();pages.set(route,html);for(const match of html.matchAll(/href="(\/[^\"]*)"/g))links.add(match[1].replaceAll('&amp;','&'));for(const match of html.matchAll(/(?:src|data-image)="(\/[^\"]*)"/g))assets.add(match[1]);for(const match of html.matchAll(/srcset="([^\"]+)"/g))for(const part of match[1].split(','))assets.add(part.trim().split(' ')[0]);
 if(route==='/'){const nonce=html.match(/<script nonce="([^\"]+)"/)[1];assert.ok(response.headers.get('content-security-policy').includes("'nonce-"+nonce+"'"));}
}
for(const href of links){const url=new URL(href,base),route=url.pathname,anchor=decodeURIComponent(url.hash.slice(1));if(route.startsWith('/assets/')){assets.add(route+url.search);continue;}let html=pages.get(route);if(!html){const r=await fetch(base+route,{redirect:'manual'});if(r.status>=400)errors.push({href,status:r.status});html=await r.text();}if(anchor&&!html.includes(`id="${anchor}"`))errors.push({href,error:'Ancla inexistente'});}
for(const url of [...assets]){const r=await fetch(base+url);if(!r.ok)errors.push({asset:url,status:r.status});if(url.includes('site.js')){for(const match of (await r.text()).matchAll(/from '\.\/([^']+)'/g))assets.add('/assets/'+match[1]);}}
for(const url of assets){const r=await fetch(base+url);if(!r.ok)errors.push({asset:url,status:r.status});}
const checksum=buffer=>crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
const photos=JSON.parse(fs.readFileSync('reports/photo-inventory.json','utf8'));for(const photo of photos)if(checksum(fs.readFileSync(photo.original))!==photo.originalSha256)errors.push({original:photo.original,error:'Original modificado'});
const readDocuments=file=>{const db=new DatabaseSync(file,{readOnly:true});try{return db.prepare('SELECT id,record,version FROM documents ORDER BY id').all();}finally{db.close();}};
const backup='.local/backups/2026-10-28T06-25-53-483Z',before=readDocuments(path.join(backup,'site.sqlite')),after=readDocuments('.local/site.sqlite');assert.deepEqual(after,before,'No se deben alterar los contenidos institucionales');
const manifest=JSON.parse(fs.readFileSync(path.join(backup,'manifest.json'),'utf8'));for(const item of manifest.files)assert.equal(checksum(fs.readFileSync(path.join(backup,item.file))),item.sha256.toUpperCase());
const nav=pages.get('/').match(/<nav id="primary-nav"[\s\S]*?<\/nav>/)[0],labels=[...nav.matchAll(/<a [^>]*data-primary-link[^>]*>([^<]+)<\/a>/g)].map(m=>m[1]);assert.deepEqual(labels,['Vida litúrgica','Sacramentos','Pastoral','Comunidad','Nosotros','Agua de San Ignacio','Galería','Visítanos']);assert.doesNotMatch(pages.get('/'),/01 \/ El templo|hero-reveal-logo/);
const correctedPhotos=photos.filter(p=>p.corrected).map(p=>({file:p.filename,original:p.original,locations:p.uses,exif:p.exifOrientation,correction:p.correction}));
const result={createdAt:new Date().toISOString(),localOnly:true,base,pages:pages.size,links:links.size,assets:assets.size,errors,menu:labels,originalPhotosIntact:photos.length,institutionalDocumentsUnchanged:after.length,backupVerified:true,animationMs:3000,visualBrowserVerified:false,visualReview:'Pendiente por el usuario, quien indicó que la revisaría. La herramienta de navegador no pudo verificar la URL local y detuvo la automatización.',correctedPhotos};
fs.writeFileSync('reports/verification-r4.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,correctedPhotos:correctedPhotos.map(p=>p.file)},null,2));if(errors.length)process.exitCode=1;
