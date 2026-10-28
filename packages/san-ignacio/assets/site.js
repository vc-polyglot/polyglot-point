import {setupNavigation} from './navigation-motion.js';
import {initCursor} from './cursor.js';
import {initHeroReveal} from './entrance.js';
setupNavigation();
initCursor();
initHeroReveal();
const main=document.querySelector('#contenido');
window.addEventListener('pageshow',event=>{if(event.persisted)main?.classList.add('skip-page-entry');});
function openAnchor(){if(!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const el=document.getElementById(id);const details=el?.matches('details')?el:el?.closest('details');if(details)details.open=true;}
openAnchor();window.addEventListener('hashchange',openAnchor);
const gallery=[...document.querySelectorAll('.photo-button')],dialog=document.querySelector('#lightbox');let active=0,opener;
function showPhoto(){const button=gallery[active];dialog.querySelector('img').src=button.dataset.image;dialog.querySelector('img').alt=button.querySelector('img').alt;dialog.querySelector('figcaption').textContent=`${active+1} / ${gallery.length} · ${button.dataset.caption}`;}
gallery.forEach((button,index)=>button.addEventListener('click',()=>{active=index;opener=button;showPhoto();dialog.showModal();dialog.querySelector('.lightbox-close').focus();}));
dialog?.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());dialog?.addEventListener('close',()=>opener?.focus());
function step(delta){if(gallery.length){active=(active+delta+gallery.length)%gallery.length;showPhoto();}}
dialog?.querySelector('.lightbox-prev').addEventListener('click',()=>step(-1));dialog?.querySelector('.lightbox-next').addEventListener('click',()=>step(1));dialog?.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')step(-1);if(event.key==='ArrowRight')step(1);});
const form=document.querySelector('#contact-form');form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Enviando mensaje…';try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo enviar el mensaje.');form.reset();status.textContent='Tu mensaje fue recibido. Gracias por escribirnos.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
