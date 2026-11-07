import test from 'node:test';
import assert from 'node:assert/strict';
import {ImageArchive} from '../assets/image-archive.js';
import {imagePickerMode} from '../assets/publication-photos.js';

test('Pastoral permite elegir un cartel en el mismo selector; sólo la galería limita el archivo',async()=>{
 const previousDocument=globalThis.document;
 const nodes=new Map();
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',hidden:false,disabled:false,focus(){}});return nodes.get(selector);};
 globalThis.document={activeElement:{}};
 try{
  const picker=Object.create(ImageArchive.prototype);
  Object.assign(picker,{collection:'photograph',dialog:{querySelector:node,showModal(){}},api:async()=>({images:[
   {url:'/uploads/foto.jpg',title:'Foto del templo',alt:'Templo',collection:'photograph'},
   {url:'/uploads/cartel.jpg',title:'Cartel INEA',alt:'Inscripciones INEA',collection:'material'}
  ]})});
  await picker.open({mode:imagePickerMode('program')});
  assert.match(node('#library-tabs').innerHTML,/Fotografías/);
  assert.match(node('#library-tabs').innerHTML,/Carteles y materiales/);
  assert.equal(node('[name=collection]').disabled,false);
  picker.collection='material';picker.renderPicker();
  assert.match(node('#library-grid').innerHTML,/Cartel INEA/);
  assert.doesNotMatch(node('#library-grid').innerHTML,/Foto del templo/);
  picker.selected.set('/uploads/cartel.jpg',{image:'/uploads/cartel.jpg',alt:'Inscripciones INEA'});picker.renderPicker();
  assert.equal(node('#use-images').hidden,false);
  assert.equal(node('#use-images').disabled,false);
  await picker.open({mode:imagePickerMode('gallery')});
  assert.doesNotMatch(node('#library-tabs').innerHTML,/Carteles y materiales/);
  assert.equal(node('[name=collection]').disabled,true);
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});
