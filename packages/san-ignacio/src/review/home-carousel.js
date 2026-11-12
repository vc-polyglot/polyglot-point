import {esc,photo} from './html.js';
import {publicHomePhotos} from './home-slides.js';
export function homeCarousel(documents){
 const photos=publicHomePhotos(documents);if(!photos.length)return '';
 return `<figure class="hero-image" data-home-carousel${photos.length>1?' tabindex="0"':''} role="region" aria-roledescription="Carrusel" aria-label="Fotografías del templo">${photo(photos[0].image,photos[0].alt,{eager:true})}${photos.length>1?`<span class="home-incoming" aria-hidden="true"><img data-home-incoming alt="" decoding="async"></span><div hidden>${photos.map(item=>`<span data-home-slide data-image="${esc(item.image)}" data-alt="${esc(item.alt)}"></span>`).join('')}</div>`:''}</figure>`;
}
