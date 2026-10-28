const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createApp } = require('../backend');
const root = path.resolve(__dirname,'..');
const read = relative => fs.readFileSync(path.join(root,relative),'utf8');
const events = JSON.parse(read('public/data/agenda.json')).events;

function engine() {
  const context = { window:{},Intl,Date,AbortController,setTimeout,clearTimeout,console };
  vm.runInNewContext(read('public/js/content-engine.js'),context);
  return context.window.VictorContent;
}
async function withServer(options,run) {
  const server = createApp(options).listen(0,'127.0.0.1');
  await once(server,'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  try { await run(url); } finally { await new Promise(resolve => server.close(resolve)); }
}
const validMessage = { name:'Prueba local',email:'test@example.invalid',subject:'concert',message:'Mensaje de prueba aislada',lang:'es',website:'' };
function post(url,body) {
  return fetch(url+'/api/contact',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) });
}

test('historical records retain partial dates and the author-confirmed correction',() => {
  assert.equal(events.length,146);
  assert.equal(events.filter(e => e.category === 'conducting').length,36);
  const trumpet = events.filter(e => e.title.startsWith('El arte de la trompeta'));
  assert.equal(trumpet.length,1);
  assert.equal(trumpet[0].date,'2025-05-31');
  const messina = events.find(e => e.title.includes('Messina'));
  assert.equal(messina.date,null);
  assert.equal(messina.period,'2025-04');
  assert.ok(events.some(e => e.title.includes('Catedral de San Buenaventura')));
});

test('calendar classification handles ongoing events, cancellation and Mexican midnight',() => {
  const model=engine();
  assert.equal(model.calendarDay(new Date('2026-10-29T02:00:00Z')),'2026-10-28');
  const data=model.splitEvents([
    {id:'ongoing',date:'2026-10-01',endDate:'2026-11-01'},
    {id:'canceled',date:'2026-11-01',status:'canceled'},
    {id:'partial',period:'2025-04',sortYear:2025},
    {id:'unknown',dateLabel:'Fecha pendiente'},
    {id:'invalid',date:'2026-02-30'}
  ],new Date('2026-10-28T12:00:00Z'));
  assert.equal(data.upcoming[0].id,'ongoing');
  assert.equal(data.canceled[0].id,'canceled');
  assert.equal(data.past[0].id,'partial');
  assert.deepEqual(Array.from(data.undated,e=>e.id),['unknown','invalid']);
  assert.equal(model.splitEvents(events,new Date('2026-10-28T12:00:00Z')).past.length,146);
});

test('news is not shown before publication or after expiry',() => {
  const model=engine();
  const items=model.activeNowItems([
    {id:'future',publishedAt:'2026-11-01',expiresAt:'2026-12-01'},
    {id:'old',publishedAt:'2026-01-01'},
    {id:'expired',publishedAt:'2026-10-01',expiresAt:'2026-10-27'},
    {id:'current',publishedAt:'2026-10-01',expiresAt:'2026-10-28'}
  ],new Date('2026-10-28T12:00:00Z'));
  assert.deepEqual(Array.from(items,e=>e.id),['current']);
});

test('archive preserves all records, searches Polish names without accents and filters conducting',() => {
  const nodes={
    archiveDynamic:{innerHTML:'',querySelectorAll:()=>[]},
    'archive-search':{value:''},'archive-category':{value:'all'},'archive-count':{textContent:''}
  };
  const model=engine();
  const window={currentLang:'es',location:{origin:'http://localhost'},VictorContent:model};
  const document={getElementById:id=>nodes[id]||null,addEventListener:()=>{}};
  vm.runInNewContext(read('public/js/content-renderer.js'),{window,document,Intl,URL,console});
  const data={agenda:{...model.splitEvents(events,new Date('2026-10-28T12:00:00Z'))}};
  window.VictorRenderer.renderArchive(data);
  assert.equal((nodes.archiveDynamic.innerHTML.match(/class="concert-item"/g)||[]).length,146);
  nodes['archive-search'].value='plonsk';
  window.VictorRenderer.renderArchive(data);
  assert.match(nodes.archiveDynamic.innerHTML,/Płońsk/);
  nodes['archive-search'].value=''; nodes['archive-category'].value='conducting';
  window.VictorRenderer.renderArchive(data);
  assert.equal((nodes.archiveDynamic.innerHTML.match(/class="concert-item"/g)||[]).length,36);
  nodes['archive-search'].value='no-such-concert';
  window.VictorRenderer.renderArchive(data);
  assert.match(nodes.archiveDynamic.innerHTML,/No hay coincidencias/);
  window.currentLang='en'; window.VictorRenderer.renderArchive(data);
  assert.match(nodes.archiveDynamic.innerHTML,/No matches/);
});

test('missing optional gallery does not prevent contact and video initialization',() => {
  const registered=[];
  const button={};
  const form={querySelector:()=>button,addEventListener:name=>registered.push('form:'+name)};
  const video={dataset:{youtubeId:'cai7zmwvKxo'},setAttribute:()=>{},addEventListener:name=>registered.push('video:'+name)};
  const document={
    documentElement:{},dispatchEvent:()=>{},
    getElementById:id=>id==='contactForm'?form:id==='formStatus'?{dataset:{}}:null,
    querySelector:()=>null,
    querySelectorAll:selector=>selector==='.youtube-facade'?[video]:[]
  };
  const errors=[];
  const context={document,window:{location:{href:'http://localhost/'}},URL,CustomEvent:class{},localStorage:{getItem:()=>null,setItem:()=>{}},console:{error:(...args)=>errors.push(args)}};
  vm.runInNewContext(read('public/js/site.js'),context);
  assert.deepEqual(registered,['video:click','form:submit']);
  assert.equal(errors.length,0);
  for(const lang of ['es','en','fr','it']) { context.window.setLang(lang); assert.equal(document.documentElement.lang,lang); }
});

test('HTTP serves the site and CV, rejects missing paths and blocks backup files',async()=> {
  await withServer({env:{}},async url=> {
    const page=await fetch(url+'/'); assert.equal(page.status,200);
    const html=await page.text(); assert.match(html,/id="lightbox"/); assert.match(html,/id="main"/);
    assert.match(html,/victoropus24@yahoo.com.mx/); assert.doesNotMatch(html,/onclick=/);
    for(const file of ['/cv.html','/cv-victor-contreras.txt','/media/director-960.jpg','/healthz']) assert.equal((await fetch(url+file)).status,200,file);
    for(const file of ['/missing','/missing.jpg','/index.html.backup','/index.html%2ebackup','/api/unknown']) assert.equal((await fetch(url+file)).status,404,file);
    assert.equal(page.headers.get('x-powered-by'),null);
    assert.equal(page.headers.get('x-content-type-options'),'nosniff');
  });
});

test('contact refuses invalid input and never reports delivery when mail is unconfigured',async()=> {
  await withServer({env:{}},async url=> {
    assert.equal((await post(url,{...validMessage,website:'spam'})).status,400);
    assert.equal((await post(url,{...validMessage,email:'invalid'})).status,400);
    assert.equal((await post(url,{...validMessage,name:{malicious:true}})).status,400);
    assert.equal((await post(url,{...validMessage,message:'x'.repeat(5001)})).status,400);
    const response=await post(url,validMessage);
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{success:false,error:'mail_not_configured'});
  });
});

test('contact has a bounded retry window and rejects oversized or malformed bodies',async()=> {
  await withServer({env:{}},async url=> {
    const malformed=await fetch(url+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
    assert.equal(malformed.status,400);
    assert.equal((await post(url,{...validMessage,message:'x'.repeat(40000)})).status,413);
    for(let i=0;i<5;i++) assert.equal((await post(url,validMessage)).status,503);
    const response=await post(url,validMessage); assert.equal(response.status,429); assert.equal(response.headers.get('retry-after'),'600');
  });
});

test('contact succeeds only after provider acceptance; provider failures remain failures',async()=> {
  let delivered;
  const env={RESEND_API_KEY:'test-only',CONTACT_TO_EMAIL:'recipient@example.invalid'};
  await withServer({env,sendMail:async payload=>{delivered=payload;}},async url=> {
    const response=await post(url,{...validMessage,name:'<script>name</script>',message:'<img src=x onerror=bad>'});
    assert.equal(response.status,200); assert.deepEqual(await response.json(),{success:true});
    assert.equal(delivered.subject,'Contacto web: Concierto / Recital');
    assert.match(delivered.html,/&lt;script&gt;/); assert.doesNotMatch(delivered.html,/<script>/);
    assert.equal(delivered.replyTo,validMessage.email);
  });
  await withServer({env,sendMail:async()=>{throw new Error('simulated failure');}},async url=> {
    const response=await post(url,validMessage); assert.equal(response.status,502); assert.equal((await response.json()).success,false);
  });
});
