import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { openStore, getDocument, saveDocument, addLocalUser, closeStore } from '../src/review/store.js';
import { local, root, dataPath } from '../src/review/config.js';
if(!local) throw new Error('La inicialización de referencia sólo se permite en modo local.');
await openStore();
let count=0;
async function add(id,type,data,published=true,source='Archivos de referencia del proyecto existente') {
  if(await getDocument(id)) return;
  const now=new Date().toISOString();const draft={order:10,...data,source};
  await saveDocument({id,type,draft,published:published?draft:null,version:1,history:[],createdAt:now,updatedAt:now,updatedBy:'Importación de referencia local'});count++;
}
const schema=fs.readFileSync(root+'/src/db/editorial-schema.js','utf8');
for(const m of schema.matchAll(/\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(?:\$\$([\s\S]*?)\$\$|(NULL)),\s*(\d+),\s*TRUE\s*\)/g)) {
  await add(m[1],'content',{title:m[3],body:m[4]||'',category:m[2],order:Number(m[6])},!!m[4],'src/db/editorial-schema.js; vigencia pendiente de cotejo con Railway');
}
for(const [i,day,time,detail] of [[1,'Lunes a viernes','7:30 · 13:30 · 18:30 h',''],[2,'Sábado','7:30 · 18:30 h',''],[3,'Domingo','9:00 · 10:30 · 12:00 · 13:30 · 18:30 h','10:30 h: misa de niños']]) await add('horario-'+i,'schedule',{title:day,day,time,detail,order:i});
await add('hora-santa','content',{title:'Hora Santa',body:'Todos los jueves, de 17:30 a 18:30 h.',category:'liturgy',order:20});
await add('confesiones','content',{title:'Confesiones',body:'Al final de las misas de lunes a sábado, solicite al sacerdote celebrante la confesión.',category:'liturgy',order:30});
const programSource=fs.readFileSync(root+'/public/js/page-pastoral.js','utf8');
const programMatch=programSource.match(/const programs=(\[\[[\s\S]*?\]\]);/);
for(const [i,p] of JSON.parse(programMatch[1]).entries()) await add(p[0],'program',{title:p[1],label:p[2],time:p[3],body:p[4],order:i+1},true,'public/js/page-pastoral.js');
const staffSource=fs.readFileSync(root+'/public/js/page-nosotros.js','utf8');let order=0;
for(const m of staffSource.matchAll(/data-title="([^"]+)" data-name="([^"]+)"/g)) await add('persona-'+(++order),'staff',{title:m[2],role:m[1],body:'',order},true,'public/js/page-nosotros.js; fotografías y semblanzas pendientes');
await add('contacto','settings',{title:'Contacto',address:'Avenida Horacio esquina Avenida Molière, Polanco, Ciudad de México.',email:'amdg1@prodigy.net.mx',phone:'55 5280 6586',facebook:'https://www.facebook.com/IglesiaSanIgnacioPolanco/'},true,'public/js/page-contacto.js; datos existentes por validar antes de despliegue');
await add('portada','settings',{title:'San Ignacio de Loyola',summary:'Encontrar a Dios en todas las cosas.',body:'Polanco · Ciudad de México',image:'/assets/images/hero-interior-03-1280.jpg',alt:'Crucifijo y vitrales en el interior de San Ignacio de Loyola'});
await add('donativos','settings',{title:'Donativos',body:'',holder:'',bank:'',account:'',clabe:''},false,'Preparado para información bancaria confirmada; no se publica');
await add('privacidad','settings',{title:'Aviso de privacidad',body:''},false,'Contenido institucional pendiente de entrega y aprobación');
for(let i=1;i<=23;i++) await add('galeria-'+String(i).padStart(2,'0'),'gallery',{title:'San Ignacio de Loyola · '+String(i).padStart(2,'0'),image:'/assets/images/galeria-'+String(i).padStart(2,'0')+'-1280.jpg',alt:'Fotografía '+i+' del archivo de San Ignacio de Loyola',order:i},true,'public/img/site-photos; archivo fotográfico original conservado');
const credentials=dataPath+'/ACCESO-LOCAL.txt';
if(!fs.existsSync(credentials)) {
  const email='revision@sanignacio.local', password=crypto.randomBytes(15).toString('base64url');
  await addLocalUser({email,name:'Revisión local',password_hash:await bcrypt.hash(password,12)});
  fs.writeFileSync(credentials,`ACCESO SÓLO PARA ESTA COPIA LOCAL\nhttp://127.0.0.1:3310/admin\nCorreo: ${email}\nContraseña: ${password}\n\nNo es un usuario de Railway ni modifica su administrador.\n`);
}
fs.writeFileSync(dataPath+'/import-inventory.json',JSON.stringify({createdAt:new Date().toISOString(),kind:'reference-files-only',railwayImported:false,added:count,notes:'Conservar y cotejar los contenidos más recientes de PostgreSQL antes del despliegue.'},null,2));
console.log('Contenido de referencia incorporado:',count);await closeStore();

await import('./upgrade-r2.mjs');
