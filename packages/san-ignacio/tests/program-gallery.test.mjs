import test from 'node:test';
import assert from 'node:assert/strict';
import {programGallery} from '../src/review/program-gallery.js';
import {renderPage} from '../src/review/pages.js';
import {setupPhotoViewer} from '../assets/photo-viewer.js';

test('Cada grupo presenta únicamente su colección y los otros programas no reciben fotos',()=>{
 const young=programGallery('comunidad-juvenil'),older=programGallery('adultos-mayores');
 assert.equal((young.match(/data-image=/g)||[]).length,4);assert.equal((older.match(/data-image=/g)||[]).length,3);
 assert.doesNotMatch(young,/data-image="[^"]*adultos-mayores/);assert.doesNotMatch(older,/data-image="[^"]*comunidad-juvenil/);
 assert.equal(programGallery('inea'),'');
 for(const album of [young,older]){
  assert.equal((album.match(/program-photo-featured/g)||[]).length,1);
  assert.match(album,/<details class="person-profile program-more-photos"/);
  assert.ok(album.indexOf('program-photo-featured')<album.indexOf('<details'));
 }
});

test('Los dos álbumes aparecen una sola vez junto a su grupo en Pastoral',()=>{
 const html=renderPage('/pastoral',[
  {id:'comunidad-juvenil',type:'program',title:'Comunidad Juvenil Ignaciana',body:'Texto existente',order:3},
  {id:'adultos-mayores',type:'program',title:'Grupo de Adultos Mayores',category:'comunidad',order:5}
 ]);
 assert.equal((html.match(/class="program-gallery"/g)||[]).length,2);
 assert.equal((html.match(/id="adultos-mayores"/g)||[]).length,1);
 assert.match(html,/Texto existente/);
 assert.equal((html.match(/data-photo-collection="adultos-mayores"/g)||[]).length,3);
});

test('El orden institucional es jóvenes, adultos mayores e INEA al final',()=>{
 const html=renderPage('/pastoral',[
  {id:'inea',type:'program',title:'INEA',order:1},
  {id:'adultos-mayores',type:'program',title:'Grupo de Adultos Mayores',category:'comunidad',order:2},
  {id:'comunidad-juvenil',type:'program',title:'Comunidad Juvenil Ignaciana',order:30}
 ]);
 assert.ok(html.indexOf('id="comunidad-juvenil"')<html.indexOf('id="adultos-mayores"'));
 assert.ok(html.indexOf('id="adultos-mayores"')<html.indexOf('id="inea"'));
 assert.equal((html.match(/class="community-feature"/g)||[]).length,2);
});

function viewer({motion=false,reduced=false}={}){
 class Node{
  constructor(){this.listeners={};this.dataset={};this.animations=[];
   if(motion)this.animate=(frames,options)=>{let resolve,reject;const animation={frames,options,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),finish:()=>resolve(),cancel:()=>{animation.cancelled=true;reject(new Error('cancelled'));}};this.animations.push(animation);return animation;};
  }
  addEventListener(type,fn){this.listeners[type]=fn;}
  focus(){this.focused=true;}
 }
 const buttons=[];
 for(const [group,count]of [['young',4],['older',3],['',2]])for(let i=0;i<count;i++){
  const button=new Node();button.dataset={photoCollection:group,image:group+i+'.jpg',caption:group};button.querySelector=()=>({alt:group+' '+i});buttons.push(button);
 }
 const dialog=new Node(),image=new Node(),caption={},close=new Node(),next=new Node(),prev=new Node();
 dialog.querySelector=selector=>({'img':image,'figcaption':caption,'.lightbox-close':close,'.lightbox-next':next,'.lightbox-prev':prev}[selector]);
 dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.listeners.close();};
 setupPhotoViewer({querySelectorAll:()=>buttons,querySelector:()=>dialog},{matchMedia:()=>({matches:reduced,addEventListener(){}}),getComputedStyle:()=>({opacity:'1'})});
 return {buttons,dialog,image,caption,close,next,prev};
}

test('El visor recorre sólo el grupo elegido y devuelve el foco al cerrar',()=>{
 const e=viewer();e.buttons[4].listeners.click();assert.equal(e.image.src,'older0.jpg');assert.match(e.caption.textContent,/1 \/ 3/);
 e.prev.listeners.click();assert.equal(e.image.src,'older2.jpg');e.next.listeners.click();assert.equal(e.image.src,'older0.jpg');
 e.close.listeners.click();assert.equal(e.dialog.open,false);assert.equal(e.buttons[4].focused,true);
 e.buttons[0].listeners.click();e.prev.listeners.click();assert.equal(e.image.src,'young3.jpg');assert.match(e.caption.textContent,/4 \/ 4/);
});

test('Las flechas del teclado recorren la colección y la galería general mantiene su grupo',()=>{
 const e=viewer();e.buttons[7].listeners.click();let prevented=false;
 e.dialog.listeners.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(e.image.src,'1.jpg');assert.match(e.caption.textContent,/2 \/ 2/);
});

test('Las páginas sin imágenes ampliables no requieren visor',()=>{
 assert.doesNotThrow(()=>setupPhotoViewer({querySelectorAll:()=>[],querySelector:()=>null}));
});

const settle=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};

test('El carrusel abre, cambia y cierra con fundidos antes de devolver el foco',async()=>{
 const e=viewer({motion:true});e.buttons[0].listeners.click();
 assert.equal(e.dialog.animations.at(-1).options.duration,400);
 e.next.listeners.click();assert.equal(e.image.src,'young0.jpg');
 e.image.animations.at(-1).finish();await settle();
 assert.equal(e.image.src,'young1.jpg');assert.equal(e.image.animations.at(-1).options.duration,320);
 e.close.listeners.click();assert.equal(e.dialog.open,true);assert.equal(e.dialog.animations.at(-1).options.duration,280);
 e.dialog.animations.at(-1).finish();await settle();assert.equal(e.dialog.open,false);assert.equal(e.buttons[0].focused,true);
});

test('Los cambios rápidos no permiten que una transición anterior muestre otra foto',async()=>{
 const e=viewer({motion:true});e.buttons[0].listeners.click();e.next.listeners.click();const first=e.image.animations.at(-1);
 e.next.listeners.click();assert.equal(first.cancelled,true);e.image.animations.at(-1).finish();await settle();
 assert.equal(e.image.src,'young2.jpg');assert.match(e.caption.textContent,/3 \/ 4/);
});

test('Movimiento reducido conserva el carrusel inmediato sin animaciones',()=>{
 const e=viewer({motion:true,reduced:true});e.buttons[0].listeners.click();e.next.listeners.click();e.close.listeners.click();
 assert.equal(e.image.src,'young1.jpg');assert.equal(e.dialog.open,false);assert.equal(e.dialog.animations.length,0);assert.equal(e.image.animations.length,0);
});
