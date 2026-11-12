import {canonicalAssetURL,deletedAssetURLs} from './asset-state.js';
import {imageCatalog} from './image-library.js';
export const homeSlidesId='carrusel-portada';
export const mainHomePhoto=Object.freeze({image:'/assets/images/hero-interior-03-1280.jpg',alt:'Crucifijo y vitrales en el interior de San Ignacio de Loyola'});
const defaults=[mainHomePhoto,{image:'/assets/images/hero-nueva-01-1280.jpg',alt:'Fachada y vitrales de San Ignacio de Loyola bajo el cielo azul'},{image:'/assets/images/hero-vitrales-08-1280.jpg',alt:'Vitrales de colores en la fachada del templo'}];
const fail=(message,status=400)=>{const error=new Error(message);error.status=status;throw error;};
export function readHomeSlides(documents){const record=documents.find(doc=>doc.id===homeSlidesId&&doc.type==='home-slideshow'),deleted=deletedAssetURLs(documents);return {version:record?.version||0,photos:structuredClone(record?.published?.photos??defaults).filter(photo=>!deleted.has(canonicalAssetURL(photo.image)))};}
export function withHomeSlides(documents){if(documents.some(doc=>doc.id===homeSlidesId))return documents;const data={title:'Imágenes de portada',photos:readHomeSlides(documents).photos};return [...documents,{id:homeSlidesId,type:'home-slideshow',version:0,draft:data,published:data}];}
export function publicHomePhotos(documents){const record=documents.find(doc=>doc.id===homeSlidesId&&doc.type==='home-slideshow');return structuredClone(record?.photos??defaults);}
export function homeSlidesRecord(input,documents,user,root){
 if(!input||!Number.isSafeInteger(input.version)||input.version<0||!Array.isArray(input.photos)||input.photos.length<1||input.photos.length>12)fail('Elige entre 1 y 12 fotografías para la portada.');
 const previous=documents.find(doc=>doc.id===homeSlidesId),version=previous?.version||0;if(input.version!==version)fail('La portada cambió en otra sesión. Vuelve a abrir Imágenes de portada antes de guardar.',409);
 if(input.photos[0]?.image!==mainHomePhoto.image)fail('La primera imagen de la portada debe ser el Cristo con los vitrales.');
 const catalog=imageCatalog(root,documents),seen=new Set();const photos=input.photos.map((photo,index)=>{
  if(!photo||typeof photo.image!=='string'||typeof photo.alt!=='string'||!photo.alt.trim()||photo.alt.length>300)fail('Cada fotografía necesita una descripción de hasta 300 caracteres.');
  const key=canonicalAssetURL(photo.image);if(seen.has(key))fail('No repitas fotografías en la portada.');seen.add(key);
  if(!catalog.some(image=>image.url===photo.image&&image.collection==='photograph'))fail('Elige las imágenes de portada desde el archivo Fotografías.');
  return index===0?{...mainHomePhoto}:{image:photo.image,alt:photo.alt.trim()};
 });
 const now=new Date().toISOString(),data={title:'Imágenes de portada',photos};return {id:homeSlidesId,type:'home-slideshow',draft:data,published:structuredClone(data),version:version+1,history:previous?[{published:previous.published,version:previous.version,at:now,actor:user.name},...(previous.history||[])].slice(0,40):[],createdAt:previous?.createdAt||now,updatedAt:now,updatedBy:user.name};
}
