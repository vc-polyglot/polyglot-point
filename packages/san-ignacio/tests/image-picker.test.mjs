import test from 'node:test';
import assert from 'node:assert/strict';
import {ImageArchive} from '../assets/image-archive.js';
import {imagePickerMode} from '../assets/publication-photos.js';

function fixture(){
 const nodes=new Map(),calls=[];
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',hidden:false,disabled:false,focus(){},classList:{toggle(){}}});return nodes.get(selector);};
 const initial=[{url:'/uploads/foto.jpg',title:'Foto del templo',alt:'Templo',collection:'photograph',version:1},{url:'/uploads/cartel.jpg',title:'Cartel INEA',alt:'Inscripciones INEA',collection:'material',version:1}];
 const saved=new Map(initial.map(image=>[image.url,{...image}]));
 const picker=Object.create(ImageArchive.prototype);
 Object.assign(picker,{collection:'photograph',dialog:{querySelector:node,querySelectorAll:()=>[],showModal(){}},api:async(url,options={})=>{
  if(options.method==='PATCH'){const change=JSON.parse(options.body);calls.push(change);const previous=saved.get(change.url);const image={...previous,collection:change.collection,version:previous.version+1};saved.set(image.url,image);return {image};}
  return {images:[...saved.values()].map(image=>({...image}))};
 }});
 return {picker,node,calls,saved};
}

test('Pastoral permite elegir un cartel en el mismo selector; sólo la galería limita el archivo',async()=>{
 const previousDocument=globalThis.document;globalThis.document={activeElement:{}};
 try{
  const {picker,node}=fixture();
  await picker.open({mode:imagePickerMode('program')});
  assert.match(node('#library-tabs').innerHTML,/Fotografías/);assert.match(node('#library-tabs').innerHTML,/Carteles y materiales/);assert.equal(node('[name=collection]').disabled,false);
  picker.collection='material';picker.renderPicker();assert.match(node('#library-grid').innerHTML,/Cartel INEA/);assert.doesNotMatch(node('#library-grid').innerHTML,/Foto del templo/);
  picker.selected.set('/uploads/cartel.jpg',{image:'/uploads/cartel.jpg',alt:'Inscripciones INEA'});picker.renderPicker();assert.equal(node('#use-images').hidden,false);assert.equal(node('#use-images').disabled,false);
  await picker.open({mode:imagePickerMode('gallery')});assert.doesNotMatch(node('#library-tabs').innerHTML,/Carteles y materiales/);assert.equal(node('[name=collection]').disabled,true);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('El selector mueve imágenes entre ambos archivos sin perder la selección ni cambiar sus direcciones',async()=>{
 const previousDocument=globalThis.document;globalThis.document={activeElement:{}};
 try{
  const {picker,node,calls,saved}=fixture();
  await picker.open({mode:imagePickerMode('program'),initial:[{image:'/uploads/foto.jpg',alt:'Templo'}]});
  assert.match(node('#library-grid').innerHTML,/data-move-image="\/uploads\/foto.jpg"/);assert.match(node('#library-grid').innerHTML,/Mover a Carteles y materiales/);assert.equal(node('#move-selected').disabled,false);
  await picker.moveImages(['/uploads/foto.jpg'],'material',{picker:true});
  assert.equal(calls.length,1);assert.equal(calls[0].version,1);assert.equal(saved.get('/uploads/foto.jpg').collection,'material');assert.equal(picker.collection,'photograph');assert.equal(picker.selected.get('/uploads/foto.jpg').image,'/uploads/foto.jpg');assert.match(node('#library-feedback').textContent,/1 imagen movida/);assert.doesNotMatch(node('#library-grid').innerHTML,/data-image-card="\/uploads\/foto.jpg"/);picker.collection='material';picker.renderPicker();assert.match(node('#library-grid').innerHTML,/Mover a Fotografías/);
  await picker.moveImages(['/uploads/foto.jpg','/uploads/cartel.jpg'],'photograph',{picker:true});
  assert.equal(saved.get('/uploads/foto.jpg').collection,'photograph');assert.equal(saved.get('/uploads/cartel.jpg').collection,'photograph');assert.equal(calls[1].version,2);assert.equal(picker.collection,'material');assert.equal(picker.selected.size,1);assert.match(node('#library-feedback').textContent,/2 imágenes movidas/);assert.equal(picker.busy,false);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('Un rechazo al mover se explica dentro del selector y conserva la imagen en su archivo',async()=>{
 const previousDocument=globalThis.document;globalThis.document={activeElement:{}};
 try{
  const {picker,node}=fixture();await picker.open({mode:imagePickerMode('program')});
  picker.api=async()=>{throw Error('Primero retira esta imagen de la galería publicada.');};
  await picker.moveImages(['/uploads/foto.jpg'],'material',{picker:true});
  assert.equal(picker.items.find(image=>image.url==='/uploads/foto.jpg').collection,'photograph');assert.equal(picker.items.find(image=>image.url==='/uploads/foto.jpg').version,1);assert.match(node('#library-feedback').textContent,/Primero retira/);assert.equal(picker.busy,false);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('Borrar una imagen permite cancelar, conserva las demás selecciones y explica un rechazo',async()=>{
 const previousDocument=globalThis.document;globalThis.document={activeElement:{}};
 try{
  const {picker,node}=fixture();await picker.open({mode:'photographs',initial:[{image:'/uploads/foto.jpg',alt:'QA'},{image:'/uploads/cartel.jpg',alt:'QA'}]});
  assert.match(node('#library-grid').innerHTML,/data-delete-image="\/uploads\/foto.jpg"/);let calls=0;picker.onBusy=()=>{};picker.onDelete=()=>{};picker.confirmDelete=()=>false;picker.api=async()=>{calls++;return {deleted:true};};
  await picker.deleteImage('/uploads/foto.jpg',{picker:true});assert.equal(calls,0);assert.equal(picker.items.length,2);
  picker.confirmDelete=()=>true;await picker.deleteImage('/uploads/foto.jpg',{picker:true});assert.equal(calls,1);assert.equal(picker.items.length,1);assert.equal(picker.selected.has('/uploads/foto.jpg'),false);assert.equal(picker.selected.has('/uploads/cartel.jpg'),true);assert.match(node('#library-feedback').textContent,/Imagen borrada/);
  picker.api=async()=>{throw Error('Esta imagen se usa en: INEA.');};await picker.deleteImage('/uploads/cartel.jpg',{picker:true});assert.equal(picker.items.length,1);assert.equal(picker.selected.size,1);assert.match(node('#library-feedback').textContent,/INEA/);assert.equal(picker.busy,false);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});
