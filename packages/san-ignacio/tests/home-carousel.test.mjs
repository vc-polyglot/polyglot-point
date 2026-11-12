import test from 'node:test';
import assert from 'node:assert/strict';
import {setupHomeCarousel} from '../assets/home-carousel.js';
import {homeCarousel} from '../src/review/home-carousel.js';
import {readHomeSlides,homeSlidesRecord,mainHomePhoto,homeSlidesId,withHomeSlides} from '../src/review/home-slides.js';
import {assetDeletionId} from '../src/review/asset-state.js';
import {HomeSlidesAdmin} from '../assets/admin-home-slides.js';
import {renderPage} from '../src/review/pages.js';

test('La portada sólo usa su lista exclusiva, conserva el Cristo primero y no incorpora otras publicaciones',()=>{
 const others=[{id:'event',type:'event',photos:[{image:'/uploads/event.jpg',alt:'Evento'}]},{id:'person',type:'staff',image:'/uploads/person.jpg'},{id:'gallery',type:'gallery',image:'/uploads/gallery.jpg'}];
 const html=homeCarousel(others),sources=[...html.matchAll(/data-home-slide data-image="([^"]+)"/g)].map(match=>match[1]);assert.equal(sources.length,3);assert.equal(sources[0],mainHomePhoto.image);assert.doesNotMatch(html,/\/uploads\//);assert.doesNotMatch(html,/<button|data-home-(?:controls|prev|next|play|counter)|title=/);assert.match(html,/tabindex="0"/);assert.equal((html.match(/fetchpriority="high"/g)||[]).length,1);
 const configured={id:homeSlidesId,type:'home-slideshow',photos:[mainHomePhoto]};assert.doesNotMatch(homeCarousel([...others,configured]),/data-home-controls|hero-nueva/);
 const fr=renderPage('/',others,{language:'fr'});assert.match(fr,/aria-label="Photographies de l’église"/);assert.match(fr,/aria-roledescription="Carrousel"/);
});

test('La selección exige versión vigente, imágenes explícitas sin duplicados y conserva listas de una sola foto',()=>{
 const config=readHomeSlides([]),user={name:'QA'},root=process.cwd();const record=homeSlidesRecord({version:0,photos:[mainHomePhoto]},[],user,root);assert.deepEqual(readHomeSlides([record]).photos,[mainHomePhoto]);assert.equal(record.version,1);
 for(const input of [{version:0,photos:[]},{version:0,photos:[config.photos[1]]},{version:0,photos:[mainHomePhoto,mainHomePhoto]},{version:0,photos:[mainHomePhoto,{image:'https://example.invalid/unknown.jpg',alt:'QA'}]}])assert.throws(()=>homeSlidesRecord(input,[],user,root),{status:400});
 assert.throws(()=>homeSlidesRecord(config,[record],user,root),{status:409});
 const deletion={id:assetDeletionId(config.photos[1].image),type:'asset-deletion',deletedAt:'2026-11-12',draft:{url:config.photos[1].image}};assert.equal(readHomeSlides([deletion]).photos.length,2);assert.equal(withHomeSlides([deletion]).find(doc=>doc.id===homeSlidesId).published.photos.length,2);
});

function environment({reduced=false}={}){
 const element=()=>({listeners:{},attrs:{},dataset:{},hidden:false,disabled:false,isConnected:true,addEventListener(type,fn){this.listeners[type]=fn;},emit(type,event={}){this.listeners[type]?.(event);},setAttribute(key,value){this.attrs[key]=value;},removeAttribute(key){delete this.attrs[key];}});
 const root=element(),doc=element(),win=element(),base=element(),incoming=element(),layer=element(),media=element();const slides=[0,1,2].map(index=>({dataset:{image:'/qa/'+index+'.jpg',alt:'Foto '+index}}));
 base.src=slides[0].dataset.image;incoming.decode=async()=>{};layer.animate=(_frames,options)=>{layer.options=options;return {finished:Promise.resolve(),cancel(){}};};root.querySelectorAll=()=>slides;
 root.querySelector=selector=>({'.photo-frame img':base,'[data-home-incoming]':incoming,'.home-incoming':layer}[selector]);root.focus=()=>{doc.activeElement=root;};doc.querySelector=()=>root;doc.documentElement={lang:'es'};win.matchMedia=()=>media;media.matches=reduced;
 const timers=new Map();let serial=0;win.setTimeout=(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;};win.clearTimeout=id=>timers.delete(id);
 const controller=setupHomeCarousel(doc,win);return {root,doc,win,base,incoming,layer,media,timers,controller,async tick(){const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();await new Promise(resolve=>setImmediate(resolve));}};
}

const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('El carrusel cambia cada ocho segundos y completa el ciclo sin controles visibles',async()=>{
 const e=environment();assert.equal(e.base.src,'/qa/0.jpg');assert.equal([...e.timers.values()][0].ms,8000);await e.tick();assert.equal(e.base.src,'/qa/1.jpg');assert.equal(e.layer.options.duration,1200);
 await e.tick();assert.equal(e.base.src,'/qa/2.jpg');await e.tick();assert.equal(e.base.src,'/qa/0.jpg');assert.equal(e.controller.pause,undefined);e.controller.destroy();assert.equal(e.timers.size,0);
});

test('Un clic cambia la foto y reinicia el avance automático sin pausarlo',async()=>{
 const e=environment();const originalTimer=[...e.timers.keys()][0];e.root.emit('click',{button:0});await flush();assert.equal(e.doc.activeElement,e.root);assert.equal(e.base.src,'/qa/1.jpg');assert.equal(e.timers.size,1);assert.equal(e.timers.has(originalTimer),false);assert.equal([...e.timers.values()][0].ms,8000);
 e.root.emit('focusin',{target:e.root});e.root.emit('mouseenter');assert.equal(e.timers.size,1);await e.tick();assert.equal(e.base.src,'/qa/2.jpg');e.controller.destroy();
});

test('Las flechas sólo actúan sobre la imagen enfocada y el carrusel sigue después',async()=>{
 const e=environment();let prevented=0;
 e.root.emit('keydown',{target:{},key:'ArrowRight',preventDefault(){prevented++;}});await flush();assert.equal(e.base.src,'/qa/0.jpg');assert.equal(prevented,0);
 e.root.focus();e.root.emit('keydown',{target:e.root,key:'ArrowLeft',preventDefault(){prevented++;}});await flush();assert.equal(e.base.src,'/qa/2.jpg');assert.equal(prevented,1);assert.equal(e.timers.size,1);
 e.root.emit('keydown',{target:e.root,key:'ArrowRight',ctrlKey:true,preventDefault(){prevented++;}});await flush();assert.equal(e.base.src,'/qa/2.jpg');assert.equal(prevented,1);
 e.root.emit('keydown',{target:e.root,key:'ArrowRight',preventDefault(){prevented++;}});await flush();assert.equal(e.base.src,'/qa/0.jpg');assert.equal(e.timers.size,1);await e.tick();assert.equal(e.base.src,'/qa/1.jpg');e.controller.destroy();
});

test('Movimiento reducido, pestaña oculta y salida de sección detienen el avance sin modificar el audio',async()=>{
 const e=environment({reduced:true});assert.equal(e.timers.size,0);await e.controller.show(1);assert.equal(e.base.src,'/qa/1.jpg');assert.equal(e.layer.options,undefined);
 const f=environment();f.doc.hidden=true;f.doc.emit('visibilitychange');assert.equal(f.timers.size,0);f.doc.hidden=false;f.doc.emit('visibilitychange');assert.equal(f.timers.size,1);
 let release;f.incoming.decode=()=>new Promise(resolve=>{release=resolve;});const pending=f.controller.show(1);f.controller.destroy();release();await pending;assert.equal(f.base.src,'/qa/0.jpg');assert.equal(f.timers.size,0);
});

test('Una foto que falla no deja la portada en blanco ni bloquea las siguientes',async()=>{
 const e=environment();e.incoming.decode=async()=>{if(e.incoming.src==='/qa/1.jpg')throw Error('No disponible');};await e.tick();assert.equal(e.base.src,'/qa/0.jpg');await e.tick();assert.equal(e.base.src,'/qa/2.jpg');e.controller.destroy();
});

test('La consola mantiene fija la primera imagen y conserva cambios ante conflictos al guardar',async()=>{
 const nodes=new Map(),dirty=[],messages=[];const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',addEventListener(){}});return nodes.get(selector);};const host={querySelector:node,querySelectorAll:()=>[]};
 const admin=new HomeSlidesAdmin({api:async()=>{throw Error('La portada cambió en otra sesión');},status:text=>messages.push(text),onDirty:value=>dirty.push(value)});Object.assign(admin,{host,config:readHomeSlides([]),images:[{url:'/qa/new.jpg',alt:'QA nueva',title:'Nueva'}]});
 const original=structuredClone(admin.config);admin.action('remove',0);assert.deepEqual(admin.config,original);admin.action('up',1);assert.deepEqual(admin.config,original);admin.action('down',1);assert.equal(admin.config.photos[0].image,mainHomePhoto.image);admin.add('/qa/new.jpg');assert.equal(admin.config.photos.length,4);admin.add('/qa/new.jpg');assert.equal(admin.config.photos.length,4);
 const pending=structuredClone(admin.config);await admin.save();assert.deepEqual(admin.config,pending);assert.equal(dirty.at(-1),true);assert.match(messages.at(-1),/otra sesión/);assert.equal(admin.busy,false);
});
