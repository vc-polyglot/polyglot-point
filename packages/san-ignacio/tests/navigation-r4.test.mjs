import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {navigationGroups,navigation} from '../src/review/navigation.js';
import {renderPage} from '../src/review/pages.js';
import {introBootstrap} from '../src/review/intro.js';
import {initHeroReveal,introPhase,INTRO_TIMELINE} from '../assets/entrance.js';

test('Orden institucional y jerarquía sin entradas raíz duplicadas',()=>{
 assert.deepEqual(navigationGroups.map(g=>g[0]),['Vida litúrgica','Sacramentos','Pastoral','Comunidad','Nosotros','Agua de San Ignacio','El templo','Visítanos']);
 const pastoral=navigationGroups[2];assert.deepEqual(pastoral[2].map(g=>g[0]),['Catecismo','Áreas pastorales','Música']);assert.deepEqual(pastoral[2][0][2].map(g=>g.slice(0,2)),[['Primera Comunión','/pastoral#catecismo-primera-comunion'],['Confirmación','/pastoral#catecismo-confirmacion']]);
 function audit(group){const [label,url,children=[]]=group;assert.ok(!children.some(g=>g[0]===label||g[1]===url));assert.equal(new Set(children.map(g=>g[1])).size,children.length);children.forEach(audit);}navigationGroups.forEach(audit);
 const html=navigation('/pastoral');assert.equal((html.match(/href="\/comunidad"/g)||[]).length,1);assert.match(html,/<a href="\/pastoral"[^>]*data-primary-link[^>]*>Pastoral<\/a><button/);assert.match(html,/data-depth="1"/);
});
test('Comunidad presenta sus grupos y conserva enlaces específicos a información compartida',()=>{
 const html=renderPage('/comunidad',[{id:'inea',type:'program',title:'INEA',body:'Información institucional del programa'},{id:'grupo-juvenil',type:'program',title:'Grupo juvenil',body:'Información del grupo'},{id:'catecismo',type:'program',category:'catecismo',title:'Primera Comunión'}]);
 const content=html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];assert.match(content,/<h2>INEA<\/h2>/);assert.match(content,/<h2>Grupo juvenil<\/h2>/);assert.match(content,/href="\/pastoral#inea"/);assert.doesNotMatch(content,/<h2>(Pastoral|Nosotros|Primera Comunión)<\/h2>|community-links/);
});
test('Portada sin rótulo de archivo, con presentación de viewport y excepciones de movimiento',()=>{
 const html=renderPage('/',[{id:'portada',type:'content',image:'/assets/images/templo-1280.jpg',title:'San Ignacio'}],{nonce:'test-nonce'});
 assert.match(html,/<script nonce="test-nonce">/);assert.match(html,/id="site-intro" hidden/);assert.doesNotMatch(html,/01 \/ El templo|hero-reveal-logo/);
 const css=fs.readFileSync('assets/site.css','utf8');assert.match(css,/\.site-intro\{position:fixed;inset:0/);assert.match(css,/\.hero-image \.photo-frame>img,\.hero-image \.photo-frame:hover>img\{transform:none;filter:none;transition:none\}/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{html.intro-pending/);
 const interior=renderPage('/pastoral',[],{nonce:'x'});assert.match(interior,/id="site-intro" hidden/);assert.match(interior,/data-replay-intro/);assert.doesNotMatch(interior,/<script nonce=/);assert.doesNotMatch(renderPage('/',[],{preview:true}),/id="site-intro"|data-replay-intro/);
});
function bootstrap({path='/',hash='',seen=false,reduced=false,saveData=false,storageFails=false}={}){
 const classes=new Set(),timers=[],overlay={hidden:false},events=[];
 const document={documentElement:{classList:{add:(...v)=>v.forEach(n=>classes.add(n)),remove:(...v)=>v.forEach(n=>classes.delete(n))}},getElementById:()=>overlay};
 const context={location:{pathname:path,hash},matchMedia:()=>({matches:reduced}),navigator:{connection:{saveData}},sessionStorage:{getItem(){if(storageFails)throw new Error('Unavailable');return seen?'1':null;}},document,setTimeout:(fn,ms)=>(timers.push({fn,ms}),timers.length),Event:class{constructor(type){this.type=type;}}};context.window={dispatchEvent:e=>events.push(e)};vm.runInNewContext(introBootstrap,context);return {classes,timers,overlay,events};
}
test('La preparación previa al primer pintado evita repeticiones y libera la capa ante fallos',()=>{
 const e=bootstrap();assert.ok(e.classes.has('intro-pending'));assert.equal(e.timers[0].ms,6000);e.timers[0].fn();assert.equal(e.overlay.hidden,true);assert.equal(e.classes.size,0);assert.equal(e.events[0].type,'si-intro-timeout');
 for(const change of [{path:'/musica'},{hash:'#contenido'},{seen:true},{reduced:true},{saveData:true},{storageFails:true}]){const skipped=bootstrap(change);assert.equal(skipped.classes.size,0);assert.equal(skipped.timers.length,0);}
});
function entranceEnvironment({noAnimation=false,pending=true,reduced=false,storageFails=false}={}){
 const frames=new Map(),stored=new Map(),timers=new Map(),animations=[];let sequence=0;
 class Node{constructor(){this.listeners=new Map();this.dataset={};this.classes=new Set();this.isConnected=true;this.classList={contains:v=>this.classes.has(v),add:(...v)=>v.forEach(n=>this.classes.add(n)),remove:(...v)=>v.forEach(n=>this.classes.delete(n))};}addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}emit(type,event={}){for(const fn of this.listeners.get(type)||[])fn(event);}focus(){doc.activeElement=this;}}
 const doc=new Node(),win=new Node(),overlay=new Node(),skip=new Node(),button=new Node(),preference=new Node();preference.matches=reduced;doc.documentElement=new Node();if(pending)doc.documentElement.classes.add('intro-pending');doc.activeElement=null;doc.getElementById=()=>overlay;doc.querySelectorAll=()=>[button];overlay.querySelector=()=>skip;overlay.hidden=true;
 let animation=null;
 overlay.getAnimations=({subtree=false}={})=>{
  if(noAnimation)return [];
  if(!subtree){let resolve,reject;animation={animationName:'si-intro-curtain',currentTime:0,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),cancel(){this.cancelled=true;reject(new Error('cancelled'));},finish(){resolve();}};animations.push(animation);}
  return animation?[animation]:[];
 };
 win.matchMedia=()=>preference;win.sessionStorage={setItem:(key,value)=>{if(storageFails)throw new Error('Unavailable');stored.set(key,value);}};win.performance={now:()=>0};win.requestAnimationFrame=fn=>(frames.set(++sequence,fn),sequence);win.cancelAnimationFrame=id=>frames.delete(id);win.clearTimeout=id=>timers.delete(id);win.setTimeout=(fn,ms)=>(timers.set(++sequence,{fn,ms}),sequence);
 const controller=initHeroReveal(doc,win);
 return {doc,win,overlay,skip,button,preference,controller,stored,frames,timers,animations,get animation(){return animation;},step(time){animation.currentTime=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));},replay(){button.focus();button.emit('click');}};
}
test('Presentación, presencia y crossfade duran 4,5 segundos y retiran la capa al finalizar',()=>{
 assert.deepEqual([introPhase(0),introPhase(1000),introPhase(2500),introPhase(4500)],['presentation','presence','crossfade','complete']);assert.equal(INTRO_TIMELINE.end,4500);
 const e=entranceEnvironment();assert.equal(e.overlay.hidden,false);assert.equal(e.overlay.dataset.phase,'presentation');e.step(1100);assert.equal(e.overlay.dataset.phase,'presence');e.step(2600);assert.equal(e.overlay.dataset.phase,'crossfade');e.step(4500);assert.equal(e.overlay.hidden,true);assert.equal(e.animation.cancelled,true);assert.equal(e.doc.documentElement.classes.size,0);assert.equal(e.frames.size,0);assert.equal(e.timers.size,0);assert.equal(e.stored.get('san-ignacio-intro-r4'),'1');
});
test('Saltar, Tab, Escape, salir y fallo de animación dejan el contenido accesible',()=>{
 for(const action of [e=>e.skip.emit('click'),e=>e.doc.emit('keydown',{key:'Tab'}),e=>e.doc.emit('keydown',{key:'Escape'}),e=>e.win.emit('pagehide'),e=>e.win.emit('si-intro-timeout')]){const e=entranceEnvironment();action(e);assert.equal(e.overlay.hidden,true);assert.equal(e.frames.size,0);assert.equal(e.doc.documentElement.classes.has('intro-pending'),false);}
 const e=entranceEnvironment({noAnimation:true});assert.equal(e.overlay.hidden,true);assert.equal(e.doc.documentElement.classes.size,0);
});
test('Las cruces repiten sin navegar y cada reproducción recupera el foco y limpia sus recursos',async()=>{
 const e=entranceEnvironment({pending:false});assert.equal(e.overlay.hidden,true);assert.equal(e.animations.length,0);
 for(let i=0;i<3;i++){e.replay();assert.equal(e.overlay.hidden,false);assert.equal(e.doc.activeElement,e.skip);assert.equal(e.animations.length,i+1);e.step(4500);await Promise.resolve();await Promise.resolve();assert.equal(e.overlay.hidden,true);assert.equal(e.doc.activeElement,e.button);assert.equal(e.frames.size,0);assert.equal(e.timers.size,0);}
});
test('Cancelar y repetir enseguida no permite que una promesa anterior cierre la nueva presentación',async()=>{
 const e=entranceEnvironment({pending:false});e.replay();e.skip.emit('click');e.replay();await Promise.resolve();await Promise.resolve();assert.equal(e.overlay.hidden,false);assert.equal(e.overlay.dataset.phase,'presentation');assert.equal(e.animations.length,2);e.skip.emit('click');assert.equal(e.doc.activeElement,e.button);
});
test('La repetición manual funciona sin almacenamiento y tiene un límite de seguridad propio',()=>{
 const e=entranceEnvironment({pending:false,storageFails:true});e.replay();assert.equal(e.overlay.hidden,false);assert.equal([...e.timers.values()][0].ms,6000);[...e.timers.values()][0].fn();assert.equal(e.overlay.hidden,true);assert.equal(e.doc.activeElement,e.button);assert.equal(e.frames.size,0);
});
test('Movimiento reducido desactiva la repetición y un cambio de preferencia cierra la presentación',()=>{
 const e=entranceEnvironment({pending:false,reduced:true});assert.equal(e.button.disabled,true);e.controller.replay();assert.equal(e.overlay.hidden,true);assert.equal(e.animations.length,0);
 e.preference.matches=false;e.preference.emit('change');assert.equal(e.button.disabled,false);e.replay();assert.equal(e.overlay.hidden,false);e.preference.matches=true;e.preference.emit('change');assert.equal(e.overlay.hidden,true);assert.equal(e.button.disabled,true);
});
