import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageCounter} from '../assets/message-counter.js';

function fixture(api=async()=>({count:3})){
 const attributes={},listeners=new Map(),timers=new Map();let badge={textContent:'',setAttribute:(key,value)=>attributes[key]=value};
 const doc={visibilityState:'visible',querySelector:()=>badge,addEventListener:(type,fn)=>listeners.set('doc:'+type,fn),removeEventListener:type=>listeners.delete('doc:'+type)};
 const win={addEventListener:(type,fn)=>listeners.set('win:'+type,fn),removeEventListener:type=>listeners.delete('win:'+type),setInterval(fn,ms){timers.set(1,{fn,ms});return 1;},clearInterval:id=>timers.delete(id)};
 return {counter:new MessageCounter({api,doc,win}),doc,attributes,listeners,timers,get badge(){return badge;},replaceBadge(){badge={textContent:'',setAttribute:(key,value)=>attributes[key]=value};}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('El total aparece al entrar, se actualiza cada 15 segundos y conserva el cero al vaciar la bandeja',async()=>{
 let count=3;const f=fixture(async url=>{assert.equal(url,'/api/admin/messages/count');return {count};});f.counter.start();await flush();assert.equal(f.badge.textContent,'3');assert.equal(f.timers.get(1).ms,15000);
 count=4;f.timers.get(1).fn();await flush();assert.equal(f.badge.textContent,'4');f.counter.removed();assert.equal(f.badge.textContent,'3');count=3;await flush();
 count=0;await f.counter.refresh();assert.equal(f.badge.textContent,'0');assert.equal(f.attributes['aria-label'],'0 mensajes en la bandeja');
 f.replaceBadge();f.counter.render();assert.equal(f.badge.textContent,'0');f.counter.stop();assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
});

test('Al regresar a la pestaña se consulta el total y no hay sondeo mientras está oculta',async()=>{
 let calls=0;const f=fixture(async()=>({count:++calls}));f.counter.start();await flush();assert.equal(calls,1);
 f.doc.visibilityState='hidden';f.timers.get(1).fn();f.listeners.get('doc:visibilitychange')();await flush();assert.equal(calls,1);
 f.doc.visibilityState='visible';f.listeners.get('doc:visibilitychange')();await flush();assert.equal(calls,2);assert.equal(f.badge.textContent,'2');
 f.listeners.get('win:focus')();await flush();assert.equal(f.badge.textContent,'3');f.counter.stop();
});

test('Las respuestas anteriores y las peticiones que terminan al salir no alteran el total más reciente',async()=>{
 const pending=[];const f=fixture(()=>new Promise(resolve=>pending.push(resolve)));f.counter.active=true;f.counter.set(5);
 const first=f.counter.refresh(),second=f.counter.refresh();pending[1]({count:6});await second;pending[0]({count:4});await first;assert.equal(f.badge.textContent,'6');
 const third=f.counter.refresh();f.counter.set(3);pending[2]({count:7});await third;assert.equal(f.badge.textContent,'3');
 const fourth=f.counter.refresh();f.counter.stop();pending[3]({count:9});await fourth;assert.equal(f.badge.textContent,'3');
});

test('Un fallo de conexión conserva el último total confirmado',async()=>{
 const f=fixture(async()=>{throw Error('Sin conexión');});f.counter.active=true;f.counter.set(2);await f.counter.refresh();assert.equal(f.badge.textContent,'2');
 f.counter.api=async()=>({count:-1});await f.counter.refresh();assert.equal(f.badge.textContent,'2');
});
