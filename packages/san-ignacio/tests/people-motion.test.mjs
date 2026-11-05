import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPeopleMotion} from '../assets/people-motion.js';

function environment({reduced=false,animation=true}={}){
 const observers=[];
 class Node{
  constructor(height){this.height=height;this.listeners={};this.classes=new Set();this.open=false;this.animations=[];this.style={removeProperty:key=>delete this.style[key]};this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key),remove:key=>this.classes.delete(key)};}
  getBoundingClientRect(){return {height:this.height};}
  addEventListener(type,fn){this.listeners[type]=fn;}
  animate(frames,options){let resolve,reject;const result={frames,options,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),finish:()=>resolve(),cancel:()=>{result.cancelled=true;reject(new Error('cancelled'));}};this.animations.push(result);return result;}
 }
 const profile=new Node(56),summary=new Node(56),panel=new Node(500);
 profile.querySelector=selector=>selector==='summary'?summary:panel;
 if(!animation)profile.animate=undefined;
 const preference={matches:reduced,addEventListener:(_type,fn)=>preference.change=fn};
 const doc={querySelectorAll:()=>[profile]};
 const win={matchMedia:()=>preference,getComputedStyle:()=>({opacity:'0.6'}),ResizeObserver:class{constructor(fn){observers.push(fn);}observe(){}}};
 const controller=setupPeopleMotion(doc,win);
 return {profile,summary,panel,preference,observers,controller,click(){let prevented=false;summary.listeners.click({detail:0,preventDefault(){prevented=true;}});return prevented;}};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};

test('La apertura reserva espacio progresivamente y deja el tamaño natural al terminar',async()=>{
 const e=environment();assert.equal(e.click(),true);assert.equal(e.profile.open,true);
 const animation=e.profile.animations.at(-1);
 assert.deepEqual(animation.frames,[{height:'56px'},{height:'556px'}]);assert.equal(animation.options.duration,480);
 assert.equal(e.panel.animations.at(-1).frames[0].opacity,'0');
 animation.finish();await settle();
 assert.equal(e.profile.style.height,undefined);assert.equal(e.profile.style.overflow,undefined);assert.equal(e.panel.inert,false);
});

test('El cierre se anima antes de ocultar el desplegable',async()=>{
 const e=environment();e.click();e.profile.animations.at(-1).finish();await settle();e.profile.height=556;
 e.click();assert.equal(e.profile.open,true);assert.equal(e.panel.inert,true);
 const closing=e.profile.animations.at(-1);assert.equal(closing.frames[1].height,'56px');assert.equal(closing.options.duration,380);
 closing.finish();await settle();assert.equal(e.profile.open,false);assert.equal(e.profile.style.height,undefined);
});

test('Los clics rápidos invierten desde la altura actual y no completan una animación obsoleta',async()=>{
 const e=environment();e.click();const first=e.profile.animations.at(-1);e.profile.height=240;
 e.click();const closing=e.profile.animations.at(-1);assert.equal(first.cancelled,true);assert.equal(closing.frames[0].height,'240px');
 e.profile.height=180;e.click();const latest=e.profile.animations.at(-1);
 assert.equal(closing.cancelled,true);assert.equal(latest.frames[0].height,'180px');
 closing.finish();await settle();assert.equal(e.profile.open,true);
 latest.finish();await settle();assert.equal(e.profile.open,true);assert.equal(e.panel.inert,false);
});

test('El tamaño de una foto que termina de cargar actualiza la animación sin saltar',()=>{
 const e=environment();e.click();e.profile.height=160;e.panel.height=580;e.observers[0]();
 const latest=e.profile.animations.at(-1);assert.equal(latest.frames[0].height,'160px');assert.equal(latest.frames[1].height,'636px');
});

test('Movimiento reducido y navegadores sin animación conservan la activación nativa por teclado',()=>{
 for(const options of [{reduced:true},{animation:false}]){const e=environment(options);assert.equal(e.click(),false);assert.equal(e.profile.animations.length,0);}
});

test('Cambiar a movimiento reducido termina el estado solicitado sin dejar altura bloqueada',async()=>{
 const e=environment();e.click();e.preference.matches=true;e.preference.change();await settle();
 assert.equal(e.profile.open,true);assert.equal(e.profile.style.height,undefined);assert.equal(e.panel.inert,false);
});
