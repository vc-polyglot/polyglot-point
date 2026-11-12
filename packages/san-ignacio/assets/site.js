import {setupPhotoViewer} from './photo-viewer.js?v=3';
import {setupNavigation} from './navigation-motion.js?v=2';
import {initCursor} from './cursor.js';
import {initHeroReveal} from './entrance.js';
import {setupPeopleMotion} from './people-motion.js';
import {setupAgendaCarousel} from './agenda-carousel.js?v=2';
import {setupHistoryChapters} from './history.js?v=4';
import {setupPublicationReader} from './publication-reader.js?v=1';
import {setupMusicPlayer} from './music-player.js?v=4';
import {createPageScope} from './page-scope.js?v=1';
import {setupPublicNavigation} from './public-navigation.js?v=1';

const navigation=setupNavigation(),cursor=initCursor(),intro=initHeroReveal();
setupMusicPlayer();
let page;
function openAnchor(){if(!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const el=document.getElementById(id);const details=el?.matches('details')?el:el?.closest('details');if(details)details.open=true;}
function mountPage(){
 page=createPageScope();
 setupPeopleMotion(page.doc,page.win);setupAgendaCarousel(page.doc,page.win);setupPhotoViewer(page.doc,page.win);
 setupHistoryChapters(page.doc,page.win);setupPublicationReader(page.doc,page.win);openAnchor();
 const form=document.querySelector('#contact-form');form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Enviando mensaje…';try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo enviar el mensaje.');form.reset();status.textContent='Tu mensaje fue recibido. Gracias por escribirnos.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
}
function unmountPage(){
 navigation?.closeMenu();intro?.finish();cursor?.hide();
 const layer=document.querySelector('.cursor-layer');if(layer)document.body.append(layer);
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
 if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
 page?.destroy();
 for(const node of document.querySelectorAll('#contenido,body > dialog'))for(const animation of node.getAnimations?.({subtree:true})||[]){animation.finished?.catch(()=>{});animation.cancel();}
}
mountPage();
setupPublicNavigation({beforeSwap:unmountPage,afterSwap:mountPage,onPlayerAdded:()=>setupMusicPlayer()});
window.addEventListener('pageshow',event=>{if(event.persisted)document.querySelector('#contenido')?.classList.add('skip-page-entry');});
window.addEventListener('hashchange',openAnchor);
