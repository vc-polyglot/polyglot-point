import {esc,paragraphs,photo} from './html.js';

export function peopleList(people){
 return [...people].sort((a,b)=>(a.order||0)-(b.order||0)).map(person=>`<article class="person-entry"><p class="eyebrow">${esc(person.role)}</p><details class="person-profile" id="${esc(person.id)}"><summary><h2>${esc(person.title)}</h2><span class="person-expand" aria-hidden="true">+</span></summary><div class="person-profile-reading">${person.image?photo(person.image,person.alt||person.title,{sizes:'(max-width: 720px) calc(100vw - 40px), 440px'}):'<p class="person-photo-pending">Fotografía pendiente.</p>'}${person.body?`<div class="prose person-biography">${paragraphs(person.body)}</div>`:''}</div></details></article>`).join('');
}
