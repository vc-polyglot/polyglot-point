import test from 'node:test';
import assert from 'node:assert/strict';
import {setupHistoryChapters} from '../assets/history.js';

test('Un enlace directo abre el capítulo nativo sin mover o repetir su contenido',()=>{
 const listeners={};const chapter={open:false,matches:()=>true};
 const timeline={contains:node=>node===chapter};
 const doc={querySelector:()=>timeline,getElementById:id=>id==='pinturas-miguel-cabrera'?chapter:null};
 const win={location:{hash:'#pinturas-miguel-cabrera'},addEventListener:(type,fn)=>listeners[type]=fn};
 setupHistoryChapters(doc,win);assert.equal(chapter.open,true);assert.ok(listeners.hashchange);
});

test('Las anclas ajenas al capítulo y los fragmentos incorrectos no abren lecturas',()=>{
 const chapter={open:false};
 const doc={querySelector:()=>({contains:()=>false}),getElementById:()=>chapter};
 for(const hash of ['#hist-030','#inexistente','#%E0'])assert.doesNotThrow(()=>setupHistoryChapters(doc,{location:{hash},addEventListener(){}}));
 assert.equal(chapter.open,false);
});

test('El resto de páginas no necesita activar capítulos de historia',()=>{
 assert.doesNotThrow(()=>setupHistoryChapters({querySelector:()=>null},{}));
});
