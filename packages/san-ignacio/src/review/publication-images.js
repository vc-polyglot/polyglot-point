import {esc,photo} from './html.js';
import {publicationPhotos} from '../../assets/publication-photos.js';

export function publicationImages(doc) {
  const images = publicationPhotos(doc);
  if (!images.length) return '';
  const button = (image,index) => `<button type="button" class="publication-image${index===0?' publication-image-main':''}" data-photo-collection="publication-${esc(doc.type)}-${esc(doc.id)}" data-image="${esc(image.image)}" data-caption="${esc(doc.title)}" aria-label="Ampliar imagen ${index+1} de ${esc(doc.title)}" aria-haspopup="dialog" aria-controls="lightbox">${photo(image.image,image.alt,{sizes:index===0?'(max-width: 720px) 100vw, 640px':'(max-width: 720px) 33vw, 180px'})}${index ? `<span class="publication-image-number">${index+1}</span>` : ''}</button>`;
  return `<div class="publication-images">${button(images[0],0)}${images.length>1?`<div class="publication-thumbnails" role="group" aria-label="Más imágenes de ${esc(doc.title)}">${images.slice(1).map((image,index)=>button(image,index+1)).join('')}</div>`:''}</div>`;
}
