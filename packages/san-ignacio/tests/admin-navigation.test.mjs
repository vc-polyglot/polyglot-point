import test from 'node:test';
import assert from 'node:assert/strict';
import {AdminNavigation} from '../assets/admin-navigation.js';

function fixture(options={}) {
 const entries=[{state:null,url:'/sitio-publico'},{state:null,url:'/admin'}];let index=1;
 const visits=[];
 const win={history:{
  replaceState(state,_title,url){entries[index]={state,url};},
  pushState(state,_title,url){entries.splice(index+1);entries.push({state,url});index++;}
 },addEventListener(){}};
 const nav=new AdminNavigation({win,onNavigate:view=>visits.push(view),...options});nav.start();
 return {nav,entries,visits,current:()=>entries[index],back:async()=>{index--;await nav.back({state:entries[index].state});}};
}

test('Atrás recorre pantallas internas y permanece en Admin al llegar al inicio',async()=>{
 const f=fixture();f.nav.visit({kind:'panel',panel:'program'});f.nav.visit({kind:'editor',id:'inea',type:'program'});
 await f.back();assert.deepEqual(f.nav.view,{kind:'panel',panel:'program'});assert.equal(f.current().url,'/admin');
 await f.back();assert.equal(f.nav.view.panel,'overview');
 for(let i=0;i<5;i++){await f.back();assert.equal(f.current().url,'/admin');assert.equal(f.nav.view.panel,'overview');}
});

test('Atrás cierra el selector antes de abandonar la ficha y conserva los cambios sin guardar',async()=>{
 let modal=true,allowLeave=true;
 const f=fixture({onBack:()=>{if(modal){modal=false;return true;}return false;},canLeave:()=>allowLeave});
 f.nav.visit({kind:'panel',panel:'program'});f.nav.visit({kind:'editor',id:'inea',type:'program'});
 await f.back();assert.equal(modal,false);assert.equal(f.nav.view.kind,'editor');
 allowLeave=false;await f.back();assert.equal(f.nav.view.kind,'editor');assert.equal(f.current().url,'/admin');
 allowLeave=true;await f.back();assert.equal(f.nav.view.panel,'program');
});

test('Restaurar una pantalla no añade entradas duplicadas al historial',async()=>{
 let nav;const f=fixture({onNavigate:view=>nav.visit(view)});nav=f.nav;
 nav.visit({kind:'panel',panel:'images'});nav.visit({kind:'gallery'});
 const count=f.entries.length;await f.back();assert.equal(f.entries.length,count);assert.equal(nav.view.panel,'images');
});

test('La pantalla de acceso también conserva Atrás dentro de la ruta de Admin',async()=>{
 const f=fixture({onNavigate:()=>{}});for(let i=0;i<3;i++){await f.back();assert.equal(f.current().url,'/admin');}
});
