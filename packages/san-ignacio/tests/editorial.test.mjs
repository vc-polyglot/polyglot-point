import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {spawn,spawnSync} from 'node:child_process';
import {sections,publicationState} from '../assets/admin-sections.js';
import {musicTracks} from '../assets/music-tracks.js';
import {waveFixture} from './audio-fixture.mjs';
const root=process.cwd(),data=path.join(root,'.local','qa-'+Date.now()),port=3318,base=`http://127.0.0.1:${port}`;
const env={...process.env,LOCAL_REVIEW_MODE:'1',NODE_ENV:'test',LOCAL_DATA_PATH:data,PORT:String(port),SESSION_SECRET:crypto.randomBytes(40).toString('hex'),SITE_URL:base};
let server,cookie='',csrf='',serverLog='',preLoginCookie='';
async function request(route,{method='GET',body,authorized=false,token=true,origin,headers={},redirect='manual'}={}){
 const response=await fetch(base+route,{method,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),headers:{...(body!==undefined&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...(authorized&&cookie?{cookie}:{}),...(authorized&&token?{'X-CSRF-Token':csrf}:{}),...(origin?{origin}:{}),...headers},redirect,signal:AbortSignal.timeout(10000)});
 const set=response.headers.get('set-cookie');if(authorized&&set)cookie=set.split(';')[0];const text=await response.text();let json;try{json=JSON.parse(text);}catch{}return {response,status:response.status,text,json};
}
async function start(){server=spawn(process.execPath,['src/server.js'],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout.on('data',chunk=>serverLog+=chunk);server.stderr.on('data',chunk=>serverLog+=chunk);for(let i=0;i<60;i++){try{if((await request('/health')).status===200)return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(serverLog);}
async function stop(){if(server&&!server.killed){server.kill();await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,1000);});}}
async function auth(){csrf=(await request('/api/admin/session',{authorized:true})).json.csrf;const credentials=fs.readFileSync(data+'/ACCESO-LOCAL.txt','utf8');preLoginCookie=cookie;const r=await request('/api/admin/login',{method:'POST',authorized:true,body:{email:credentials.match(/Correo: (.+)/)[1].trim(),password:credentials.match(/Contraseña: (.+)/)[1].trim()}});assert.equal(r.status,200);csrf=r.json.csrf;}
async function save(doc,action='draft'){const r=await request('/api/admin/documents',{authorized:true,method:'POST',body:{...doc,action}});assert.equal(r.status,200,r.text);return r.json.document;}
async function documents(){return (await request('/api/admin/documents',{authorized:true})).json.documents;}
function stored(){const db=new DatabaseSync(path.join(data,'site.sqlite'),{readOnly:true});try{return db.prepare('SELECT record FROM documents').all().map(row=>JSON.parse(row.record));}finally{db.close();}}

test('Un único panel de secretaría, con permisos y publicación aislados',async t=>{
 const init=spawnSync(process.execPath,['scripts/init-local.mjs'],{cwd:root,env,encoding:'utf8',windowsHide:true});assert.equal(init.status,0,init.stderr);
 try{await start();
 await t.test('El sitio conserva sus páginas y sólo existe el menú cotidiano acordado',async()=>{
  assert.deepEqual(sections.map(s=>s.id),['overview','event','program','music','notice','images','messages','practical']);
  assert.equal(sections.find(s=>s.id==='event').label,'Agenda');
  for(const route of ['/','/vida-liturgica','/sacramentos','/pastoral','/agenda','/nosotros','/agua-de-san-ignacio','/historia','/galeria','/contacto']){const r=await request(route);assert.equal(r.status,200,route);assert.match(r.text,/<h1/);assert.match(r.text,/<link rel="canonical"/);}
  const login=await request('/admin');assert.match(login.text,/id="toggle-password"/);assert.match(login.text,/type="button" class="password-toggle"/);assert.equal(login.response.headers.get('cache-control'),'no-store');
  for(const route of ['/api/admin/documents','/api/admin/images','/api/admin/messages','/api/admin/messages/count','/api/admin/export','/api/admin/music']){assert.equal((await request(route)).status,401);assert.equal((await request(route,{headers:{cookie:'sanIgnacio.sid=inventada','X-User-Role':'admin'}})).status,401);}
  for(const [route,method] of [['/api/admin/documents','POST'],['/api/admin/images','POST'],['/api/admin/images','PATCH'],['/api/admin/messages/inventado','PATCH'],['/api/admin/logout','POST']])assert.equal((await request(route,{method,body:{}})).status,401,method+' '+route);
  for(const route of ['/admin/preview/contacto','/admin/preview/inea']){const result=await request(route);assert.equal(result.status,302);assert.equal(result.response.headers.get('location'),'/admin');}
  for(const route of ['/','/pastoral','/galeria','/historia','/contacto','/no-existe'])assert.doesNotMatch((await request(route)).text,/<a[^>]+href="\/admin(?:["\/])/);
  assert.doesNotMatch(login.text,/<a href="\/">[^<]*Volver/);

  for(const route of ['/.env','/.local/site.sqlite','/private/admin-dashboard.html'])assert.equal((await request(route)).status,404);
 });
 await t.test('Las cuatro pistas públicas se sirven como MP3 con rangos para el reproductor',async()=>{
  for(const track of musicTracks){const result=await request(track.src,{headers:{Range:'bytes=0-31'}});assert.equal(result.status,206);assert.match(result.response.headers.get('content-type'),/audio\/mpeg/);assert.match(result.response.headers.get('content-range'),/^bytes 0-31\//);}
 });
 await auth();
 await t.test('El idioma explícito sólo afecta al sitio público y no se conserva en una nueva carga',async()=>{
  for(const language of ['en','fr'])for(const route of ['/','/pastoral','/agua-de-san-ignacio','/historia','/contacto']){const page=await request(route,{headers:{'X-Site-Language':language}});assert.equal(page.status,200);assert.equal(page.response.headers.get('content-language'),language);assert.match(page.response.headers.get('vary'),/X-Site-Language/i);assert.ok(page.text.includes('<html lang="'+language+'">'));}
  const fresh=await request('/',{headers:{'Accept-Language':'fr,en;q=0.9','Cookie':cookie}});assert.match(fresh.text,/<html lang="es">/);assert.equal(fresh.response.headers.get('content-language'),'es');
  const admin=await request('/admin',{authorized:true,headers:{'X-Site-Language':'fr'}});assert.match(admin.text,/<html lang="es">/);assert.doesNotMatch(admin.text,/data-site-language/);assert.match((await request('/admin/preview/inea',{authorized:true,headers:{'X-Site-Language':'en'}})).text,/<html lang="es">/);
 });
 await t.test('La sesión previa al acceso no permite entrar después de iniciar sesión',async()=>{
  assert.equal((await request('/api/admin/documents',{headers:{cookie:preLoginCookie}})).status,401);
  assert.equal((await request('/api/admin/documents',{authorized:true})).status,200);
 });
 await t.test('La sesión habitual sólo ve lo que puede administrar; se conservan los datos internos',async()=>{
  const all=stored(),visible=await documents();assert.ok(all.some(d=>d.type==='program'));assert.ok(visible.some(d=>d.type==='schedule'));assert.ok(visible.some(d=>d.id==='contacto'));
  assert.ok(visible.every(d=>['event','notice','gallery','program','schedule'].includes(d.type)||d.type==='settings'&&d.id==='contacto'));
  assert.ok(visible.every(d=>!d.history&&!Object.hasOwn(d.draft,'source')&&!Object.hasOwn(d.draft,'order')));
  const html=(await request('/admin',{authorized:true})).text;assert.doesNotMatch(html,/export-button|Modo avanzado|panel-técnico/);
 });
 await t.test('El servidor bloquea cambios y vistas previas del contenido permanente, incluso con una sesión de administración',async()=>{
  const before=stored();const fixed=before.filter(d=>['content','staff','music'].includes(d.type)||d.type==='settings'&&d.id!=='contacto');
  for(const doc of fixed){const r=await request('/api/admin/documents',{authorized:true,method:'POST',body:{id:doc.id,type:doc.type,version:doc.version,data:doc.draft,action:'publish'}});assert.equal(r.status,403,doc.id);assert.equal((await request('/admin/preview/'+doc.id,{authorized:true})).status,403);}
  assert.equal((await request('/admin/preview/historia-origenes',{authorized:true})).status,403);
  for(const type of ['content','staff','music','settings','schedule'])assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{type,data:{title:'No autorizado'},action:'draft'}})).status,403);
  assert.equal((await request('/api/admin/export',{authorized:true})).status,403);
  assert.deepEqual(stored(),before);
 });
 await t.test('CSRF y origen siguen protegiendo las publicaciones',async()=>{
  const body={type:'notice',data:{title:'QA'}};
  assert.equal((await request('/api/admin/documents',{authorized:true,method:'POST',token:false,body})).status,403);
  assert.equal((await request('/api/admin/documents',{authorized:true,method:'POST',origin:'https://external.invalid',body})).status,403);
 });
 let event;
 await t.test('Crear, guardar para después, vista previa y publicación de un evento',async()=>{
  event=await save({type:'event',data:{title:'Retiro QA',startsAt:'2030-07-31T18:00:00-06:00',location:'Salón',body:'Información QA <script>alert(1)</script>'}});
  assert.doesNotMatch((await request('/agenda')).text,/Retiro QA/);
  const preview=await request('/admin/preview/'+event.id,{authorized:true});assert.equal(preview.status,200);assert.match(preview.text,/Retiro QA/);assert.match(preview.text,/&lt;script&gt;/);assert.doesNotMatch(preview.text,/<script>alert/);
  event=await save({id:event.id,type:'event',version:event.version,data:event.draft},'publish');assert.match((await request('/agenda')).text,/Retiro QA/);
  const home=(await request('/')).text;assert.match(home,/data-agenda-carousel/);assert.equal((home.match(new RegExp('data-event-id="'+event.id+'"','g'))||[]).length,1);
  const detail=await request('/agenda/'+event.id);assert.match(detail.text,/18:00/);assert.match(detail.text,/Salón/);
 });
 await t.test('Guardar cambios conserva la publicación y los conflictos no sobrescriben',async()=>{
  const previous=event;event=await save({id:event.id,type:'event',version:event.version,data:{...event.draft,title:'Retiro QA corregido'}});
  assert.match((await request('/agenda')).text,/Retiro QA/);assert.doesNotMatch((await request('/agenda')).text,/Retiro QA corregido/);
  assert.match((await request('/admin/preview/'+event.id,{authorized:true})).text,/Retiro QA corregido/);
  assert.equal((await request('/api/admin/documents',{authorized:true,method:'POST',body:{id:event.id,type:'event',version:previous.version,data:previous.draft,action:'publish'}})).status,409);
 });
 await t.test('Repetir un evento crea otra ficha sin alterar el original',async()=>{
  let repeat=await save({type:'event',data:{...event.draft,startsAt:'2031-07-31T18:00:00-06:00'}});assert.notEqual(repeat.id,event.id);assert.equal(repeat.published,null);
  repeat=await save({id:repeat.id,type:repeat.type,version:repeat.version},'archive');assert.equal(repeat.archived,true);
 });
 await t.test('Retirar y recuperar conserva fotografías y versiones, sin republicar automáticamente',async()=>{
  event=await save({id:event.id,type:'event',version:event.version},'archive');assert.equal(event.archived,true);assert.doesNotMatch((await request('/agenda')).text,/Retiro QA/);
  assert.doesNotMatch((await request('/')).text,/Retiro QA/);
  event=await save({id:event.id,type:'event',version:event.version},'restore');assert.equal(event.archived,false);assert.equal(event.published,null);
  assert.ok(stored().find(d=>d.id===event.id).history.length>=4);
  assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:event.id,type:'event',version:event.version,action:'revision',revision:0}})).status,403);
 });
 await t.test('Un aviso puede llevar foto y se retira por fecha; programarlo conserva su vista previa',async()=>{
  const image='/assets/images/comunidad-juvenil-01.jpg';
  let notice=await save({type:'notice',data:{title:'Aviso vigente QA',body:'Comunicado de prueba',image,alt:'Comunidad reunida',endsAt:'2099-01-01T23:59:59-06:00'}},'publish');
  let home=(await request('/')).text;assert.match(home,/Aviso vigente QA/);assert.match(home,/alt="Comunidad reunida"/);
  notice=await save({id:notice.id,type:notice.type,version:notice.version,data:{...notice.draft,endsAt:'2000-01-01T23:59:59-06:00'}},'publish');assert.doesNotMatch((await request('/')).text,/Aviso vigente QA/);assert.equal(publicationState(notice)[0],'Finalizado');
  notice=await save({id:notice.id,type:notice.type,version:notice.version,data:{...notice.draft,startsAt:'2090-01-01T00:00:00-06:00',endsAt:'2099-01-01T23:59:59-06:00'}},'publish');assert.doesNotMatch((await request('/')).text,/Aviso vigente QA/);assert.match((await request('/admin/preview/'+notice.id,{authorized:true})).text,/Aviso vigente QA/);assert.equal(publicationState(notice)[0],'Programado');
  assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:notice.id,type:notice.type,version:notice.version,data:{...notice.draft,endsAt:'2080-01-01T00:00:00-06:00'},action:'publish'}})).status,400);
 });
 await t.test('Horarios y contacto se editan sin exponer orden, título interno ni otros ajustes',async()=>{
  const docs=await documents();let schedule=docs.find(d=>d.type==='schedule'),contact=docs.find(d=>d.id==='contacto');const original=stored().find(d=>d.id===schedule.id);
  schedule=await save({id:schedule.id,type:schedule.type,version:schedule.version,data:{day:schedule.draft.day,time:'22:22 h',detail:'Nota QA'}},'publish');assert.match((await request('/vida-liturgica')).text,/22:22/);assert.match((await request('/')).text,/22:22/);assert.equal(stored().find(d=>d.id===schedule.id).draft.order,original.draft.order);
  contact=await save({id:contact.id,type:contact.type,version:contact.version,data:{phone:'55 1234 5678',email:'oficina@example.invalid',office:'Lunes a viernes'}},'publish');assert.match((await request('/contacto')).text,/55 1234 5678/);
  for(const action of ['archive','unpublish','restore'])assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:contact.id,type:'settings',version:contact.version,action}})).status,403);
  for(const data of [{order:999},{title:'Cambiar estructura'},{bank:'Banco'},{category:'history'}])assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:contact.id,type:'settings',version:contact.version,action:'publish',data}})).status,403);
 });
 await t.test('No se pueden cambiar tipos, inventar identificadores fijos ni inyectar controles técnicos',async()=>{
  for(const body of [{id:event.id,type:'settings',version:event.version,data:{phone:'1'}},{id:'portada-falsa',type:'event',data:{title:'QA'}},{type:'event',data:{title:'QA',order:0}},{type:'event',data:{title:'QA',source:'Oculto'}}])assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body})).status,403);
 });
 await t.test('La biblioteca incluye fotos recientes y rechaza archivos inválidos; subir no publica',async()=>{
  let catalog=(await request('/api/admin/images',{authorized:true})).json.images;assert.ok(catalog.some(i=>i.url==='/assets/images/padre-luis-gonzalez-cosio.jpg'));
  const invalid=new FormData();invalid.set('image',new Blob(['no es imagen']),'bad.jpg');invalid.set('alt','QA');assert.equal((await request('/api/admin/images',{method:'POST',authorized:true,body:invalid})).status,400);
  const form=new FormData();form.set('image',new Blob([fs.readFileSync(root+'/assets/images/galeria-01-640.jpg')],{type:'image/jpeg'}),'qa.jpg');form.set('alt','Foto QA nueva');const r=await request('/api/admin/images',{method:'POST',authorized:true,body:form});assert.equal(r.status,201);assert.equal((await request(r.json.image.url)).status,200);assert.doesNotMatch((await request('/galeria')).text,/Foto QA nueva/);
 });
 await t.test('Publicar, retirar y recuperar una fotografía conserva el archivo',async()=>{
  let photo=await save({type:'gallery',data:{title:'Foto QA de actividad',image:'/assets/images/comunidad-juvenil-01.jpg',alt:'Actividad QA',summary:'Pie QA'}},'publish');assert.match((await request('/galeria')).text,/Pie QA/);
  photo=await save({id:photo.id,type:photo.type,version:photo.version},'archive');assert.doesNotMatch((await request('/galeria')).text,/Pie QA/);assert.equal((await request(photo.draft.image)).status,200);
  photo=await save({id:photo.id,type:photo.type,version:photo.version},'restore');assert.equal(photo.published,null);
 });
 await t.test('Los dos archivos guardan materiales sin publicarlos y permiten reclasificar con control de versión',async()=>{
  const form=new FormData();form.set('image',new Blob([fs.readFileSync(root+'/assets/images/galeria-01-640.jpg')],{type:'image/jpeg'}),'cartel-qa.jpg');form.set('alt','Cartel QA del retiro');form.set('title','Invitación QA');form.set('collection','material');
  const response=await request('/api/admin/images',{method:'POST',authorized:true,body:form});assert.equal(response.status,201,response.text);const material=response.json.image;
  let library=(await request('/api/admin/images',{authorized:true})).json.images;assert.equal(library.find(image=>image.url===material.url).collection,'material');
  assert.doesNotMatch((await request('/galeria')).text,/Cartel QA del retiro/);assert.doesNotMatch((await request('/')).text,/Cartel QA del retiro/);
  assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{type:'gallery',data:{title:'No mezclar',image:material.url,alt:material.alt},action:'publish'}})).status,400);
  const existing=(await documents()).find(doc=>doc.type==='gallery'&&doc.published&&!doc.archived);const inUse=library.find(image=>image.url===existing.published.image);
  assert.equal((await request('/api/admin/images',{method:'PATCH',authorized:true,body:{url:inUse.url,version:inUse.version,collection:'material'}})).status,400);
  const unused=library.find(image=>image.alt==='Foto QA nueva');assert.ok(unused);
  const moved=await request('/api/admin/images',{method:'PATCH',authorized:true,body:{url:unused.url,version:unused.version,collection:'material'}});assert.equal(moved.status,200,moved.text);assert.equal(moved.json.image.version,unused.version+1);
  assert.equal((await request('/api/admin/images',{method:'PATCH',authorized:true,body:{url:unused.url,version:unused.version,collection:'photograph'}})).status,409);
  assert.equal((await request('/api/admin/images',{method:'PATCH',authorized:true,body:{url:unused.url,version:moved.json.image.version,collection:'photograph'}})).status,200);
  assert.equal((await request('/api/admin/images',{method:'PATCH',authorized:true,body:{url:'/assets/images/no-existe.jpg',version:0,collection:'material'}})).status,404);
  assert.equal((await request('/api/admin/images',{method:'PATCH',authorized:true,token:false,body:{url:material.url,version:1,collection:'photograph'}})).status,403);
  await stop();cookie='';csrf='';await start();await auth();library=(await request('/api/admin/images',{authorized:true})).json.images;
  assert.equal(library.find(image=>image.url===material.url).collection,'material');assert.equal(new Set(library.map(image=>image.url)).size,library.length);
 });
 await t.test('Eventos y noticias admiten varias imágenes, portada, enlaces y retiro sin borrar el archivo',async()=>{
  const photos=[{image:'/assets/images/comunidad-juvenil-01.jpg',alt:'Foto QA principal'},{image:'/assets/images/adultos-mayores-03.jpg',alt:'Foto QA secundaria'}];
  let post=await save({type:'notice',data:{title:'Noticia QA con álbum',body:'Noticia sin fecha obligatoria',photos,url:'https://example.invalid/noticia'}},'publish');
  assert.equal(post.draft.image,photos[0].image);assert.equal(post.draft.photos.length,2);
  let home=(await request('/')).text;assert.match(home,/Noticia QA con álbum/);assert.match(home,/href="https:\/\/example.invalid\/noticia"/);assert.equal((home.match(new RegExp('data-photo-collection="publication-notice-'+post.id+'"','g'))||[]).length,2);
  post=await save({id:post.id,type:'notice',version:post.version,data:{...post.draft,photos:[photos[1],photos[0]]}});assert.equal(post.draft.image,photos[1].image);assert.equal(post.published.image,photos[0].image);
  let preview=(await request('/admin/preview/'+post.id,{authorized:true})).text;assert.ok(preview.indexOf('alt="Foto QA secundaria"')<preview.indexOf('alt="Foto QA principal"'));
  for(const bad of [[photos[0],photos[0]],[{image:photos[0].image,alt:''}],Array(21).fill(photos[0])])assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:post.id,type:post.type,version:post.version,data:{photos:bad},action:'draft'}})).status,400);
  assert.equal((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:post.id,type:post.type,version:post.version,data:{url:'javascript:alert(1)'},action:'publish'}})).status,400);
  post=await save({id:post.id,type:post.type,version:post.version,data:{...post.draft,photos:[],url:''}},'publish');assert.equal(post.published.image,'');assert.equal(post.published.photos.length,0);home=(await request('/')).text;assert.doesNotMatch(home,new RegExp('data-photo-collection="publication-notice-'+post.id+'"'));
  await save({id:post.id,type:post.type,version:post.version},'archive');for(const photo of photos)assert.equal((await request(photo.image)).status,200);
  let concert=await save({type:'event',data:{title:'Concierto QA con fotografías',startsAt:'2031-01-01T12:00:00-06:00',photos,url:'https://example.invalid/transmision'}});
  const collection=new RegExp('data-photo-collection="publication-event-'+concert.id+'"','g');
  assert.doesNotMatch((await request('/musica')).text,collection);
  concert=await save({id:concert.id,type:concert.type,version:concert.version,data:concert.draft},'publish');
  const page=(await request('/agenda/'+concert.id)).text;assert.match(page,/Participar o ver la transmisión/);assert.equal((page.match(/data-photo-collection=/g)||[]).length,2);
  const music=(await request('/musica')).text;assert.equal((music.match(collection)||[]).length,2);assert.match(music,/alt="Foto QA principal"/);assert.match(music,/alt="Foto QA secundaria"/);
  await save({id:concert.id,type:concert.type,version:concert.version},'archive');
  assert.doesNotMatch((await request('/musica')).text,collection);
 });
 await t.test('INEA toma fotos de la galería sin código, con borrador, portada, orden y retirada',async()=>{
  const available=await documents();let inea=available.find(doc=>doc.id==='inea');assert.ok(inea);const gallery=available.filter(doc=>doc.type==='gallery'&&doc.published&&!doc.archived);assert.ok(gallery.length>=2);
  const photos=gallery.slice(0,2).map((doc,index)=>({image:doc.published.image,alt:'Foto INEA QA '+(index+1)}));const original=stored().find(doc=>doc.id==='inea');
  inea=await save({id:inea.id,type:'program',version:inea.version,data:{photos,cover:photos[0].image}});
  assert.doesNotMatch((await request('/pastoral')).text,/Foto INEA QA/);
  let preview=(await request('/admin/preview/inea',{authorized:true})).text;assert.match(preview,/alt="Foto INEA QA 1"/);assert.equal((preview.match(/data-photo-collection="inea"/g)||[]).length,2);
  inea=await save({id:inea.id,type:'program',version:inea.version,data:inea.draft},'publish');let page=(await request('/pastoral')).text;assert.match(page,/alt="Foto INEA QA 1"/);assert.equal(stored().find(doc=>doc.id==='inea').draft.order,original.draft.order);
  inea=await save({id:inea.id,type:'program',version:inea.version,data:{photos,cover:photos[1].image}});assert.equal(inea.draft.image,photos[1].image);assert.equal(inea.published.image,photos[0].image);preview=(await request('/admin/preview/inea',{authorized:true})).text;const chapter=preview.match(/<article[^>]*id="inea">([\s\S]*?)<\/article>/)[1];assert.ok(chapter.indexOf('alt="Foto INEA QA 2"')<chapter.indexOf('alt="Foto INEA QA 1"'));
  for(const invalid of [{photos:'no es una lista'},{photos:[photos[0],photos[0]],cover:photos[0].image},{category:'history'},{order:0}])assert.ok([400,403].includes((await request('/api/admin/documents',{method:'POST',authorized:true,body:{id:inea.id,type:'program',version:inea.version,data:invalid,action:'draft'}})).status));
  inea=await save({id:inea.id,type:'program',version:inea.version,data:{photos:[],cover:''}},'publish');const cleared=(await request('/pastoral')).text.match(/<article[^>]*id="inea">([\s\S]*?)<\/article>/)[1];assert.doesNotMatch(cleared,/data-photo-collection="inea"/);for(const photo of photos)assert.equal((await request(photo.image)).status,200);
 });
 await t.test('Editar los grupos conserva sus álbumes y se crean fichas con fotos en Catecismo y Áreas pastorales',async()=>{
  let young=(await documents()).find(doc=>doc.id==='comunidad-juvenil');assert.equal(young.draft.photos.length,4);const images=structuredClone(young.draft.photos),cover=young.draft.cover;
  young=await save({id:young.id,type:'program',version:young.version,data:{body:'Información actualizada QA',time:'Martes a las 11:30 h'}},'publish');assert.deepEqual(young.draft.photos,images);assert.equal(young.draft.cover,cover);assert.match((await request('/pastoral')).text,/Información actualizada QA/);
  const material=(await request('/api/admin/images',{authorized:true})).json.images.find(image=>image.collection==='material');assert.ok(material);
  let inea=(await documents()).find(doc=>doc.id==='inea');const poster={image:material.url,alt:'Cartel INEA QA del archivo'};
  inea=await save({id:inea.id,type:'program',version:inea.version,data:{photos:[poster],cover:poster.image}});
  assert.doesNotMatch((await request('/pastoral')).text,/Cartel INEA QA del archivo/);assert.match((await request('/admin/preview/inea',{authorized:true})).text,/Cartel INEA QA del archivo/);
  inea=await save({id:inea.id,type:'program',version:inea.version,data:inea.draft},'publish');assert.match((await request('/pastoral')).text,/Cartel INEA QA del archivo/);
  const kept=(await request('/api/admin/images',{authorized:true})).json.images.find(image=>image.url===material.url);assert.equal(kept.collection,'material');assert.equal(kept.recordId,material.recordId);

  const photos=[{image:images[0].image,alt:'Fotografía del curso QA'}];
  for(const category of ['catecismo','formacion','comunidad']){
   let group=await save({type:'program',data:{title:'Ficha pastoral QA '+category,category,body:'Información QA',time:'Sábados',photos,cover:photos[0].image}},'publish');const page=(await request('/pastoral')).text;assert.match(page,new RegExp('id="'+group.id+'"'));assert.match(page,new RegExp('data-photo-collection="'+group.id+'"'));
   group=await save({id:group.id,type:'program',version:group.version},'archive');assert.doesNotMatch((await request('/pastoral')).text,new RegExp('id="'+group.id+'"'));
   group=await save({id:group.id,type:'program',version:group.version},'restore');assert.equal(group.published,null);assert.equal(group.draft.photos.length,1);
  }
  const older=(await documents()).find(doc=>doc.id==='adultos-mayores');if(older){assert.equal(older.draft.photos.length,3);assert.match(older.draft.cover,/adultos-mayores-03/);}
 });
 await t.test('Música permite subir, guardar títulos y orden, retirar y recuperar sin resucitar pistas',async()=>{
  const before=stored(),initial=(await request('/api/admin/music',{authorized:true})).json;
  assert.equal(initial.version,0);assert.equal(initial.tracks.length,4);assert.equal(initial.tracks[1].title,'Meditación III');assert.deepEqual(stored(),before);
  for(const options of [{},{authorized:true,token:false},{authorized:true,origin:'https://external.invalid'}])assert.ok([401,403].includes((await request('/api/admin/music',{method:'PUT',body:initial,...options})).status));
  const bad=new FormData();bad.set('audio',new Blob(['<html>No es audio</html>'],{type:'audio/mpeg'}),'falso.mp3');assert.equal((await request('/api/admin/music/audio',{method:'POST',authorized:true,body:bad})).status,400);
  const form=()=>{const data=new FormData();data.set('audio',new Blob([waveFixture()],{type:'audio/wav'}),'Meditación QA.wav');return data;};
  assert.equal((await request('/api/admin/music/audio',{method:'POST',body:form()})).status,401);
  assert.equal((await request('/api/admin/music/audio',{method:'POST',authorized:true,token:false,body:form()})).status,403);
  const uploaded=await request('/api/admin/music/audio',{method:'POST',authorized:true,body:form()});assert.equal(uploaded.status,201,uploaded.text);const track=uploaded.json.track;assert.equal(track.title,'Meditación QA');assert.match(track.src,/^\/uploads\/audio-[a-f0-9]+\.mp3$/);assert.ok(uploaded.json.duration>=2&&uploaded.json.duration<3);
  assert.ok(!(await request('/')).text.includes(track.src));const audio=await request(track.src,{headers:{Range:'bytes=0-31'}});assert.equal(audio.status,206);assert.match(audio.response.headers.get('content-type'),/audio\/mpeg/);
  const tracks=[{...track,title:'Nueva <pista> "QA"',detail:'Intérprete & lugar'},...initial.tracks.slice().reverse()];tracks[2].enabled=false;
  assert.equal((await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:0,tracks:[{...track,src:'https://example.invalid/no.mp3'}]}})).status,400);
  assert.equal((await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:0,tracks:[track,track]}})).status,400);
  assert.equal((await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:0,tracks:[{...track,title:''}]}})).status,400);
  let saved=await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:0,tracks}});assert.equal(saved.status,200,saved.text);assert.equal(saved.json.version,1);assert.deepEqual(saved.json.tracks,tracks);
  const page=(await request('/')).text;assert.ok(page.includes('data-title="Nueva &lt;pista&gt; &quot;QA&quot;"'));assert.ok(page.includes('data-detail="Intérprete &amp; lugar"'));assert.ok(page.indexOf('data-src="'+track.src+'"')<page.indexOf('data-src="'+tracks[1].src+'"'));assert.ok(!page.includes('data-src="'+tracks[2].src+'"'));assert.doesNotMatch(page,/\bautoplay\b/);
  assert.equal((await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:0,tracks:initial.tracks}})).status,409);
  saved=await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:1,tracks:tracks.map(track=>({...track,enabled:false}))}});assert.equal(saved.status,200);assert.doesNotMatch((await request('/')).text,/data-music-player/);assert.equal((await request('/api/admin/music',{authorized:true})).json.tracks.length,5);
  saved=await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:2,tracks:[]}});assert.equal(saved.status,200);assert.doesNotMatch((await request('/')).text,/data-music-player/);
  saved=await request('/api/admin/music',{method:'PUT',authorized:true,body:{version:3,tracks:initial.tracks}});assert.equal(saved.status,200);assert.match((await request('/')).text,/data-music-player/);assert.equal((await request(track.src)).status,200);
  await stop();cookie='';csrf='';await start();await auth();const persisted=(await request('/api/admin/music',{authorized:true})).json;assert.equal(persisted.version,4);assert.deepEqual(persisted.tracks,initial.tracks);
 });
 await t.test('El admin borra imágenes y canciones sin dejar archivos accesibles ni restaurarlos al reiniciar',async()=>{
  let library=(await request('/api/admin/images',{authorized:true})).json.images;const unused=library.find(image=>image.alt==='Foto QA nueva');assert.ok(unused);
  const deletion={url:unused.url,version:unused.version};
  for(const options of [{},{authorized:true,token:false},{authorized:true,origin:'https://external.invalid'}])assert.ok([401,403].includes((await request('/api/admin/images',{method:'DELETE',body:deletion,...options})).status));
  assert.equal((await request('/api/admin/images',{method:'DELETE',authorized:true,body:{...deletion,version:unused.version+1}})).status,409);assert.equal((await request(unused.url)).status,200);
  const used=library.find(image=>image.url==='/assets/images/comunidad-juvenil-01.jpg');const blocked=await request('/api/admin/images',{method:'DELETE',authorized:true,body:{url:used.url,version:used.version}});assert.equal(blocked.status,409);assert.match(blocked.json.error,/se usa en/);
  const deleted=await request('/api/admin/images',{method:'DELETE',authorized:true,body:deletion});assert.equal(deleted.status,200,deleted.text);assert.equal(fs.existsSync(path.join(data,unused.url.slice(1))),false);assert.equal((await request(unused.url)).status,404);assert.equal((await request('/uploads//'+unused.url.split('/').at(-1))).status,404);
  const stalePost=await request('/api/admin/documents',{method:'POST',authorized:true,body:{type:'notice',data:{title:'Formulario viejo',body:'QA',photos:[{image:unused.url,alt:'QA'}]},action:'publish'}});assert.equal(stalePost.status,409);
  let playlist=(await request('/api/admin/music',{authorized:true})).json;const track=playlist.tracks[1];
  for(const options of [{},{authorized:true,token:false},{authorized:true,origin:'https://external.invalid'}])assert.ok([401,403].includes((await request('/api/admin/music/audio',{method:'DELETE',body:{id:track.id,version:playlist.version},...options})).status));
  const removed=await request('/api/admin/music/audio',{method:'DELETE',authorized:true,body:{id:track.id,version:playlist.version}});assert.equal(removed.status,200,removed.text);assert.equal(removed.json.playlist.tracks.length,playlist.tracks.length-1);assert.equal((await request(track.src)).status,404);assert.equal((await request(track.src.replace('/audio/','/%61udio/'))).status,404);assert.equal(fs.existsSync(root+track.src),true);
  assert.equal((await request('/api/admin/music/audio',{method:'DELETE',authorized:true,body:{id:playlist.tracks[0].id,version:playlist.version}})).status,409);
  const uploaded=stored().find(doc=>doc.type==='audio');const purge=await request('/api/admin/music/audio',{method:'DELETE',authorized:true,body:{id:uploaded.id,version:removed.json.playlist.version}});assert.equal(purge.status,200,purge.text);assert.equal((await request(uploaded.draft.src)).status,404);assert.equal(fs.existsSync(path.join(data,uploaded.draft.src.slice(1))),false);
  await stop();cookie='';csrf='';await start();await auth();library=(await request('/api/admin/images',{authorized:true})).json.images;assert.ok(!library.some(image=>image.url===unused.url));playlist=(await request('/api/admin/music',{authorized:true})).json;assert.ok(!playlist.tracks.some(item=>item.id===track.id));assert.equal((await request(track.src)).status,404);assert.ok(!(await request('/')).text.includes(track.src));
 });
 await t.test('La portada conserva una selección independiente, protegida y persistente con el Cristo primero',async()=>{
  const route='/api/admin/home-slides';assert.equal((await request(route)).status,401);let initial=(await request(route,{authorized:true})).json;assert.equal(initial.photos.length,3);assert.match(initial.photos[0].image,/hero-interior-03/);
  for(const options of [{},{authorized:true,token:false},{authorized:true,origin:'https://external.invalid'}])assert.ok([401,403].includes((await request(route,{method:'PUT',body:initial,...options})).status));
  const photos=[initial.photos[0],{image:'/assets/images/galeria-08-1280.jpg',alt:'Fotografía elegida expresamente QA'}];
  for(const invalid of [[],photos.slice(1),[photos[0],photos[0]],[photos[0],{image:'https://external.invalid/no.jpg',alt:'QA'}]])assert.equal((await request(route,{method:'PUT',authorized:true,body:{version:initial.version,photos:invalid}})).status,400);
  const saved=await request(route,{method:'PUT',authorized:true,body:{version:initial.version,photos}});assert.equal(saved.status,200,saved.text);assert.deepEqual(saved.json.photos,photos);assert.equal((await request(route,{method:'PUT',authorized:true,body:initial})).status,409);
  const home=(await request('/')).text;const figure=home.match(/<figure[^>]*data-home-carousel[\s\S]*?<\/figure>/)[0];const sources=[...figure.matchAll(/data-home-slide data-image="([^"]+)"/g)].map(match=>match[1]);assert.deepEqual(sources,photos.map(photo=>photo.image));assert.ok(figure.indexOf(photos[0].image)<figure.indexOf(photos[1].image));assert.match(home,/data-music-player/);
  const library=(await request('/api/admin/images',{authorized:true})).json.images,image=library.find(item=>item.url===photos[1].image);assert.equal((await request('/api/admin/images',{method:'DELETE',authorized:true,body:{url:image.url,version:image.version}})).status,409);assert.equal((await request('/api/admin/images',{method:'PATCH',authorized:true,body:{url:photos[0].image,version:0,collection:'material'}})).status,400);
  await stop();cookie='';csrf='';await start();await auth();const persisted=(await request(route,{authorized:true})).json;assert.deepEqual(persisted.photos,photos);assert.equal(persisted.version,saved.json.version);
  const single=await request(route,{method:'PUT',authorized:true,body:{version:persisted.version,photos:[photos[0]]}});assert.equal(single.status,200);const singleFigure=(await request('/')).text.match(/<figure[^>]*data-home-carousel[\s\S]*?<\/figure>/)[0];assert.doesNotMatch(singleFigure,/data-home-controls/);assert.match(singleFigure,/hero-interior-03/);
  assert.equal((await request(route,{method:'PUT',authorized:true,body:{version:single.json.version,photos:initial.photos}})).status,200);
 });
 await t.test('Un archivo de fotografías vacío no reaparece desde referencias',async()=>{
  for(const photo of (await documents()).filter(d=>d.type==='gallery'&&d.published&&!d.archived))await save({id:photo.id,type:photo.type,version:photo.version},'archive');
  const page=(await request('/galeria')).text;assert.match(page,/No hay fotografías publicadas/);assert.doesNotMatch(page,/class="photo-button"/);
 });
 await t.test('La oficina recibe consultas y puede marcarlas como atendidas',async()=>{
  const empty=await request('/api/admin/messages/count',{authorized:true});assert.equal(empty.status,200);assert.deepEqual(empty.json,{count:0});assert.equal(empty.response.headers.get('cache-control'),'no-store');
  assert.equal((await request('/api/contact',{method:'POST',body:{name:'QA',email:'qa@example.invalid',subject:'Consulta QA',message:'Consulta aislada'}})).status,201);
  const message=(await request('/api/admin/messages',{authorized:true})).json.messages[0];assert.equal((await request('/api/admin/messages/count',{authorized:true})).json.count,1);assert.equal((await request('/api/admin/messages/'+message.id,{method:'PATCH',authorized:true,body:{status:'read'}})).status,200);assert.equal((await request('/api/admin/messages/count',{authorized:true})).json.count,1);
 });
 await t.test('Borrar consultas requiere autorización, sólo elimina la elegida y persiste al reiniciar',async()=>{
  const retained=(await request('/api/admin/messages',{authorized:true})).json.messages;
  for(const subject of ['Mensaje QA para borrar','Mensaje QA archivado para borrar'])assert.equal((await request('/api/contact',{method:'POST',body:{name:'Prueba de borrado',email:'qa@example.invalid',subject,message:'Sólo datos de prueba'}})).status,201);
  let inbox=(await request('/api/admin/messages',{authorized:true})).json.messages;const target=inbox.find(message=>message.subject==='Mensaje QA para borrar'),archived=inbox.find(message=>message.subject==='Mensaje QA archivado para borrar');assert.ok(target);assert.ok(archived);assert.equal((await request('/api/admin/messages/count',{authorized:true})).json.count,inbox.length);
  const route='/api/admin/messages/'+target.id;
  for(const options of [{},{authorized:true,token:false},{authorized:true,origin:'https://external.invalid'}])assert.ok([401,403].includes((await request(route,{method:'DELETE',...options})).status));
  assert.equal((await request(route,{method:'DELETE',authorized:true})).status,204);assert.equal((await request(route,{method:'DELETE',authorized:true})).status,404);
  assert.equal((await request(route,{method:'PATCH',authorized:true,body:{status:'read'}})).status,404);
  inbox=(await request('/api/admin/messages',{authorized:true})).json.messages;assert.ok(!inbox.some(message=>message.id===target.id));assert.ok(inbox.some(message=>message.id===archived.id));for(const message of retained)assert.ok(inbox.some(item=>item.id===message.id));
  assert.equal((await request('/api/admin/messages/'+encodeURIComponent("' OR 1=1 --"),{method:'DELETE',authorized:true})).status,404);
  assert.equal((await request('/api/admin/messages/count',{authorized:true})).json.count,inbox.length);assert.equal((await request('/api/admin/messages/'+archived.id,{method:'PATCH',authorized:true,body:{status:'archived'}})).status,200);assert.equal((await request('/api/admin/messages/count',{authorized:true})).json.count,inbox.length);assert.equal((await request('/api/admin/messages/'+archived.id,{method:'DELETE',authorized:true})).status,204);assert.equal((await request('/api/admin/messages/count',{authorized:true})).json.count,retained.length);
  await stop();cookie='';csrf='';await start();await auth();inbox=(await request('/api/admin/messages',{authorized:true})).json.messages;assert.deepEqual(inbox.map(item=>item.id).sort(),retained.map(item=>item.id).sort());
 });
 await t.test('Una actualización de estado concurrente no puede recrear un mensaje borrado',async()=>{
  assert.equal((await request('/api/contact',{method:'POST',body:{name:'Prueba concurrente',email:'qa@example.invalid',subject:'Mensaje QA concurrente',message:'Sólo datos de prueba'}})).status,201);
  const message=(await request('/api/admin/messages',{authorized:true})).json.messages.find(item=>item.subject==='Mensaje QA concurrente'),route='/api/admin/messages/'+message.id;
  const [update,deletion]=await Promise.all([request(route,{method:'PATCH',authorized:true,body:{status:'read'}}),request(route,{method:'DELETE',authorized:true})]);assert.ok([200,404].includes(update.status));assert.equal(deletion.status,204);
  assert.equal((await request(route,{method:'PATCH',authorized:true,body:{status:'archived'}})).status,404);assert.ok(!(await request('/api/admin/messages',{authorized:true})).json.messages.some(item=>item.id===message.id));
 });
 await t.test('Cerrar sesión revoca el acceso y los cambios persisten al reiniciar',async()=>{
  assert.equal((await request('/api/admin/logout',{method:'POST',authorized:true})).status,204);assert.equal((await request('/api/admin/documents',{authorized:true})).status,401);
  await stop();cookie='';csrf='';await start();await auth();assert.ok((await documents()).find(d=>d.id===event.id));assert.equal((await request('/api/admin/messages',{authorized:true})).json.messages[0].status,'read');
 });
 }finally{await stop();}
});
