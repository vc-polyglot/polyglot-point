import {setupPhotoViewer} from './photo-viewer.js?v=3';
import {setupNavigation} from './navigation-motion.js';
import {initCursor} from './cursor.js';
import {initHeroReveal} from './entrance.js';
import {setupPeopleMotion} from './people-motion.js';
import {setupAgendaCarousel} from './agenda-carousel.js?v=2';
setupNavigation();
initCursor();
initHeroReveal();
setupPeopleMotion();
setupAgendaCarousel();
const main=document.querySelector('#contenido');
window.addEventListener('pageshow',event=>{if(event.persisted)main?.classList.add('skip-page-entry');});
function openAnchor(){if(!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const el=document.getElementById(id);const details=el?.matches('details')?el:el?.closest('details');if(details)details.open=true;}
openAnchor();window.addEventListener('hashchange',openAnchor);
setupPhotoViewer();
const form=document.querySelector('#contact-form');form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Enviando mensaje…';try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo enviar el mensaje.');form.reset();status.textContent='Tu mensaje fue recibido. Gracias por escribirnos.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
