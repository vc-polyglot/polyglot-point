import {esc,photo} from './html.js';
import {publicHomePhotos} from './home-slides.js';
export function homeCarousel(documents){
 const photos=publicHomePhotos(documents);if(!photos.length)return '';
 return `<figure class="hero-image" data-home-carousel role="region" aria-roledescription="Carrusel" aria-label="Fotografías del templo">${photo(photos[0].image,photos[0].alt,{eager:true})}${photos.length>1?`<span class="home-incoming" aria-hidden="true"><img data-home-incoming alt="" decoding="async"></span><div hidden>${photos.map(item=>`<span data-home-slide data-image="${esc(item.image)}" data-alt="${esc(item.alt)}"></span>`).join('')}</div><div class="home-carousel-controls" data-home-controls hidden><button type="button" data-home-prev aria-label="Fotografía anterior">‹</button><button type="button" data-home-play aria-label="Pausar cambio automático" aria-pressed="false">Ⅱ</button><button type="button" data-home-next aria-label="Fotografía siguiente">›</button><span data-home-counter aria-hidden="true">1 / ${photos.length}</span></div>`:''}</figure>`;
}
