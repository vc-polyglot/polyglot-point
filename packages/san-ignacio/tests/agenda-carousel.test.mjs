import test from 'node:test';
import assert from 'node:assert/strict';
import {setupAgendaCarousel} from '../assets/agenda-carousel.js';

function environment({mobile=false,reduced=false,count=3}={}){
 function element(){const listeners={},attrs={};return {hidden:false,textContent:'',listeners,attrs,classList:{toggle(){}},addEventListener(type,fn){listeners[type]=fn;},emit(type,event={}){listeners[type]?.(event);},setAttribute(key,value){attrs[key]=value;},removeAttribute(key){delete attrs[key];},getAttribute(key){return attrs[key];},animate(){this.animated=true;}};}
 const slides=Array.from({length:count},element),dots=Array.from({length:count},(_,i)=>{const e=element();e.setAttribute('aria-label',`${i+1}. Encuentro ${i+1}`);return e;});
 const root=element(),controls=element(),play=element(),counter=element(),status=element(),prev=element(),next=element();
 root.querySelectorAll=selector=>selector==='[data-agenda-slide]'?slides:dots;
 root.querySelector=selector=>({'[data-agenda-controls]':controls,'[data-agenda-play]':play,'[data-agenda-counter]':counter,'[data-agenda-status]':status,'[data-agenda-prev]':prev,'[data-agenda-next]':next}[selector]);
 const doc=element();doc.querySelector=()=>root;
 const timers=new Map();let serial=0;
 const small=element(),motion=element();small.matches=mobile;motion.matches=reduced;
 const win=element();win.matchMedia=q=>q.includes('720')?small:motion;win.setTimeout=(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;};win.clearTimeout=id=>timers.delete(id);
 const controller=setupAgendaCarousel(doc,win);
 const tick=()=>{const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();};
 return {doc,root,win,controls,play,counter,status,prev,next,slides,dots,timers,small,motion,controller,tick};
}

test('El avance automático espera ocho segundos y no anuncia cambios involuntarios',()=>{
 const e=environment();assert.equal(e.controls.hidden,false);assert.equal([...e.timers.values()][0].ms,8000);
 e.tick();assert.equal(e.slides[0].hidden,true);assert.equal(e.slides[1].hidden,false);assert.equal(e.counter.textContent,'02 / 03');assert.equal(e.status.textContent,'');
 e.next.emit('click');assert.equal(e.slides[2].hidden,false);assert.equal(e.timers.size,0);assert.match(e.status.textContent,/Actividad 3 de 3/);
 e.play.emit('click');assert.equal(e.timers.size,1);e.tick();assert.equal(e.slides[0].hidden,false);
});

test('El puntero, el foco, la pestaña oculta y la salida de la página detienen la rotación',()=>{
 const e=environment();e.root.emit('mouseenter');assert.equal(e.timers.size,0);e.root.emit('mouseleave');assert.equal(e.timers.size,1);
 e.root.emit('focusin',{target:e.next});assert.equal(e.timers.size,0);e.play.emit('click');assert.equal(e.timers.size,1);
 e.doc.hidden=true;e.doc.emit('visibilitychange');assert.equal(e.timers.size,0);e.doc.hidden=false;e.doc.emit('visibilitychange');assert.equal(e.timers.size,1);
 e.win.emit('pagehide');assert.equal(e.timers.size,0);e.win.emit('pageshow');assert.equal(e.timers.size,1);
});

test('Reproducir reanuda aunque el ratón permanezca sobre el botón',()=>{
 const e=environment();
 e.root.emit('mouseenter');e.root.emit('focusin',{target:e.next});e.next.emit('click');
 assert.equal(e.timers.size,0);assert.equal(e.play.textContent,'Reproducir');
 e.root.emit('focusin',{target:e.play});e.play.emit('click');
 assert.equal(e.timers.size,1);assert.equal(e.play.textContent,'Pausar');
 e.tick();assert.equal(e.slides[2].hidden,false);
 e.root.emit('mouseleave');e.root.emit('mouseenter');assert.equal(e.timers.size,0);
 e.root.emit('mouseleave');assert.equal(e.timers.size,1);
 e.play.emit('click');assert.equal(e.timers.size,0);assert.equal(e.play.textContent,'Reproducir');
});

test('Móvil y movimiento reducido conservan controles manuales sin temporizador',()=>{
 for(const options of [{mobile:true},{reduced:true}]){
  const e=environment(options);assert.equal(e.timers.size,0);assert.equal(e.play.hidden,true);
  e.next.emit('click');assert.equal(e.slides[1].hidden,false);e.prev.emit('click');assert.equal(e.slides[0].hidden,false);
  e.dots[2].emit('click');assert.equal(e.slides[2].hidden,false);assert.equal(e.timers.size,0);
  if(options.reduced)assert.equal(e.slides[2].animated,undefined);
 }
 const e=environment();e.motion.matches=true;e.motion.emit('change');assert.equal(e.timers.size,0);assert.equal(e.play.hidden,true);
});

test('Teclado y deslizamiento cambian de actividad sin interceptar el desplazamiento vertical',()=>{
 const e=environment({mobile:true});let prevented=false;
 e.root.emit('keydown',{key:'End',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(e.slides[2].hidden,false);
 e.root.emit('keydown',{key:'ArrowRight',preventDefault(){}});assert.equal(e.slides[0].hidden,false);
 e.root.emit('pointerdown',{pointerType:'touch',pointerId:1,clientX:200,clientY:50});e.root.emit('pointerup',{pointerId:1,clientX:100,clientY:55});assert.equal(e.slides[1].hidden,false);
 let blocked=false;e.root.emit('click',{preventDefault(){blocked=true;}});assert.equal(blocked,true);
 e.root.emit('pointerdown',{pointerType:'touch',pointerId:2,clientX:200,clientY:50});e.root.emit('pointerup',{pointerId:2,clientX:190,clientY:200});assert.equal(e.slides[1].hidden,false);
});

test('Sin actividades o con una sola no se inicia un carrusel',()=>{
 assert.equal(setupAgendaCarousel({querySelector:()=>null},{}),undefined);
 const e=environment({count:1});assert.equal(e.controller,undefined);assert.equal(e.timers.size,0);
});

test('Cambiar con teclado conserva el foco dentro de la actividad visible',()=>{
 const e=environment();let focused=false;
 e.doc.activeElement={};
 e.slides[0].contains=node=>node===e.doc.activeElement;
 e.slides[1].querySelector=()=>({focus(){focused=true;}});
 e.root.emit('keydown',{key:'ArrowRight',preventDefault(){}});
 assert.equal(e.slides[1].hidden,false);assert.equal(focused,true);assert.equal(e.timers.size,0);
});

test('El cambio automático sólo empieza cuando la sección entra en pantalla',()=>{
 let visibility;
 const e=environment();
 e.controller.pause();
 // A separate environment with an observer models a carousel below the fold.
 const doc=e.doc,win=e.win;
 win.IntersectionObserver=class {constructor(callback){visibility=callback;}observe(){}};
 setupAgendaCarousel(doc,win);
 assert.equal(e.timers.size,0);
 visibility([{isIntersecting:true}]);assert.equal(e.timers.size,1);
 visibility([{isIntersecting:false}]);assert.equal(e.timers.size,0);
});
