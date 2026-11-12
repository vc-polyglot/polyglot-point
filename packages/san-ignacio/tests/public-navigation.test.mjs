import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationController,internalLink,setupPublicNavigation} from '../assets/public-navigation.js';
import {renderPage} from '../src/review/pages.js';

function browser(){
 const win={location:new URL('https://example.test/'),scrollX:0,scrollY:0,listeners:{},Event:class{constructor(type){this.type=type;}},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event);},scrollTo({left,top}){this.scrollX=left;this.scrollY=top;}};
 const entries=[{url:win.location.href,state:null}];let index=0;
 win.history={get state(){return entries[index].state;},replaceState(state,_title,url){entries[index]={state,url};win.location=new URL(url);},pushState(state,_title,url){entries.splice(++index);entries.push({state,url});win.location=new URL(url);},back(){if(index>0){win.location=new URL(entries[--index].url);win.dispatchEvent({type:'popstate',state:entries[index].state});}},forward(){if(index<entries.length-1){win.location=new URL(entries[++index].url);win.dispatchEvent({type:'popstate',state:entries[index].state});}}};
 return win;
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

test('Cambiar de sección, volver y avanzar conserva audio, posición, volumen y pausa',async()=>{
 const win=browser(),audio={paused:false,currentTime:82.5,src:'/assets/audio/meditacion-iii.mp3',volume:0.35},renders=[];
 const router=createNavigationController({win,load:async url=>({url:url.href}),render:page=>renders.push(page.url)});
 win.scrollY=640;win.dispatchEvent({type:'scroll'});
 for(const route of ['/pastoral','/agua-de-san-ignacio','/historia','/galeria','/contacto','/musica','/']){assert.equal(await router.navigate(route),true);assert.equal(audio.paused,false);assert.equal(audio.currentTime,82.5);assert.equal(audio.volume,0.35);}
 audio.paused=true;await router.navigate('/pastoral');assert.equal(audio.paused,true);
 win.history.back();await settle();assert.equal(win.location.pathname,'/');assert.equal(audio.paused,true);win.history.forward();await settle();assert.equal(win.location.pathname,'/pastoral');assert.equal(audio.currentTime,82.5);assert.ok(renders.length>=10);
});

test('Atrás recupera el desplazamiento y las anclas de una misma sección no vuelven a pedir HTML',async()=>{
 const win=browser(),anchors=[];let loads=0;
 const router=createNavigationController({win,load:async url=>(loads++,{url:url.href}),render(){},anchor:hash=>anchors.push(hash)});
 win.scrollY=620;win.dispatchEvent({type:'scroll'});await router.navigate('/pastoral#grupos-comunidad');assert.equal(anchors.at(-1),'#grupos-comunidad');win.scrollY=950;win.dispatchEvent({type:'scroll'});
 await router.navigate('/pastoral#catecismo');assert.equal(loads,1);win.history.back();await settle();assert.equal(win.location.hash,'#grupos-comunidad');assert.equal(win.scrollY,950);
 win.history.back();await settle();assert.equal(win.location.pathname,'/');assert.equal(win.scrollY,620);
});

test('Un fallo de red conserva contenido y dirección, y permite reintentar sin recargar la ventana',async()=>{
 const win=browser();let retry,renders=0,fail=true;
 const router=createNavigationController({win,load:async url=>{if(fail)throw Error('Sin conexión');return {url:url.href};},render(){renders++;},onError:again=>{retry=again;}});
 assert.equal(await router.navigate('/pastoral'),false);assert.equal(win.location.pathname,'/');assert.equal(renders,0);fail=false;await retry();assert.equal(renders,1);assert.equal(win.location.pathname,'/pastoral');
});

test('Las respuestas lentas no sustituyen una sección elegida después',async()=>{
 const win=browser(),pending=[],renders=[];
 const router=createNavigationController({win,load:(url,signal)=>new Promise(resolve=>pending.push({url,signal,resolve})),render:page=>renders.push(page.url)});
 const first=router.navigate('/pastoral'),second=router.navigate('/musica');assert.equal(pending[0].signal.aborted,true);pending[1].resolve({url:pending[1].url.href});await second;pending[0].resolve({url:pending[0].url.href});assert.equal(await first,false);assert.deepEqual(renders,['https://example.test/musica']);assert.equal(win.location.pathname,'/musica');
});

test('La navegación conserva gestos de nueva pestaña y excluye Admin, descargas y sitios externos',()=>{
 const current='https://example.test/',event={button:0},link=(href,extra={})=>({href,target:'',hasAttribute:()=>false,...extra});
 assert.equal(internalLink(event,link(current+'pastoral'),current).pathname,'/pastoral');
 for(const [click,anchor]of [[{button:1},link(current+'musica')],[{button:0,ctrlKey:true},link(current+'musica')],[event,link(current+'admin')],[event,link('https://external.test/')],[event,link(current+'musica',{target:'_blank'})],[event,link(current+'musica',{hasAttribute:()=>true})]])assert.equal(internalLink(click,anchor,current),null);
});

test('La sustitución real de contenido deja intacto el nodo del reproductor y no llama play ni pause',async()=>{
 class Node{
  constructor(doc,slot){this.doc=doc;this.slot=slot;this.attrs={};this.children=[];this.classList={add(){},toggle(){}};}
  setAttribute(key,value){this.attrs[key]=value;}hasAttribute(key){return key in this.attrs;}append(...nodes){this.children.push(...nodes);}querySelectorAll(){return [];}querySelector(){return null;}addEventListener(){}focus(){}remove(){}before(){}
  replaceWith(node){this.doc[this.slot]=node;node.doc=this.doc;node.slot=this.slot;}
 }
 function documentFor(title){const doc={title,addEventListener(){}};doc.body=new Node(doc);doc.body.setAttribute('data-public-site','');doc.head=new Node(doc);doc.main=new Node(doc,'main');doc.footer=new Node(doc,'footer');doc.header=new Node(doc);doc.createElement=()=>new Node(doc);doc.querySelectorAll=()=>[];doc.querySelector=selector=>({'#contenido':doc.main,'.site-footer':doc.footer,'.site-header':doc.header,'[data-music-player]':doc.player}[selector]||null);doc.importNode=node=>new Node(doc,node.slot);doc.getElementById=()=>null;return doc;}
 const doc=documentFor('Inicio'),next=documentFor('Pastoral'),audio={currentTime:123,paused:false,play(){throw Error('No debe reiniciarse');},pause(){throw Error('No debe detenerse');}};doc.player={audio};const player=doc.player,main=doc.main,win=browser();
 win.fetch=async url=>({ok:true,url,headers:{get:()=> 'text/html'},text:async()=>renderPage('/pastoral',[])});win.DOMParser=class{parseFromString(){return next;}};
 let mounts=0;const router=setupPublicNavigation({doc,win,afterSwap(){mounts++;}});assert.equal(await router.navigate('/pastoral'),true);
 assert.notEqual(doc.main,main);assert.equal(doc.player,player);assert.equal(doc.player.audio,audio);assert.equal(audio.currentTime,123);assert.equal(audio.paused,false);assert.equal(doc.title,'Pastoral');assert.equal(mounts,1);
});

test('Las páginas públicas se identifican para navegación persistente y Admin/vista previa quedan fuera',()=>{
 assert.match(renderPage('/',[]),/<body data-public-site>/);assert.match(renderPage('/historia',[]),/<body data-public-site>/);assert.doesNotMatch(renderPage('/musica',[],{preview:true}),/<body data-public-site>/);
});
