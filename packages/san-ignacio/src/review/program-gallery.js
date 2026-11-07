import fs from 'node:fs';
import {esc,photo} from './html.js';

export const programAlbums=JSON.parse(fs.readFileSync(new URL('./data/program-albums.json',import.meta.url),'utf8')).groups;

export function programGallery(id, program={}){
 const album=Array.isArray(program.photos)?{id,title:program.title,cover:program.cover,photos:program.photos}:program.image?{id,title:program.title,cover:program.image,photos:[{image:program.image,alt:program.alt||program.title}]}:programAlbums.find(group=>group.id===id);
 if(!album?.photos.length)return '';
 const cover=album.photos.find(item=>item.image===album.cover)||album.photos[0];
 const rest=album.photos.filter(item=>item!==cover);
 const button=(item,index,featured=false)=>`<button class="photo-button program-photo${featured?' program-photo-featured':''}" type="button" data-photo-collection="${esc(id)}" data-image="${esc(item.image)}" data-caption="${esc(album.title)}" aria-label="Ampliar fotografía ${index+1} de ${esc(album.title)}">${photo(item.image,item.alt,{sizes:featured?'(max-width: 720px) 100vw, 760px':'(max-width: 720px) 50vw, 240px'})}<span${featured?' class="program-photo-label"':''}>${featured?'Ver galería ↗':String(index+1).padStart(2,'0')}</span></button>`;
 return `<div class="program-gallery">${button(cover,0,true)}${rest.length?'<details class="person-profile program-more-photos" id="fotos-'+esc(id)+'"><summary><span>Más fotografías <small>('+rest.length+')</small></span><span class="person-expand" aria-hidden="true">+</span></summary><div class="person-profile-reading program-photo-grid" role="group" aria-label="Más fotografías de '+esc(album.title)+'">'+rest.map((item,index)=>button(item,index+1)).join('')+'</div></details>':''}</div>`;
}
