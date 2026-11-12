import {setupHomeCarousel} from './home-carousel.js?v=2';
import {setupContactForm} from './contact-form.js?v=1';
import {setupPhotoViewer} from './photo-viewer.js?v=4';
import {setupNavigation} from './navigation-motion.js?v=2';
import {initCursor} from './cursor.js?v=2';
import {initHeroReveal} from './entrance.js?v=2';
import {setupPeopleMotion} from './people-motion.js';
import {setupAgendaCarousel} from './agenda-carousel.js?v=3';
import {setupHistoryChapters} from './history.js?v=4';
import {setupPublicationReader} from './publication-reader.js?v=2';
import {setupMusicPlayer} from './music-player.js?v=5';
import {createPageScope} from './page-scope.js?v=1';
import {setupPublicNavigation} from './public-navigation.js?v=2';

const navigation=setupNavigation(),cursor=initCursor(),intro=initHeroReveal();
setupMusicPlayer();
let page,homeCarousel;
function openAnchor(){if(!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const el=document.getElementById(id);const details=el?.matches('details')?el:el?.closest('details');if(details)details.open=true;}
function mountPage(){
 page=createPageScope();homeCarousel=setupHomeCarousel(page.doc,page.win);
 setupPeopleMotion(page.doc,page.win);setupAgendaCarousel(page.doc,page.win);setupPhotoViewer(page.doc,page.win);
 setupHistoryChapters(page.doc,page.win);setupPublicationReader(page.doc,page.win);openAnchor();
 setupContactForm(page.doc,page.win);
}
function unmountPage(){
 navigation?.closeMenu();intro?.finish();cursor?.hide();
 const layer=document.querySelector('.cursor-layer');if(layer)document.body.append(layer);
 for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
 if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
 homeCarousel?.destroy();page?.destroy();
 for(const node of document.querySelectorAll('#contenido,body > dialog'))for(const animation of node.getAnimations?.({subtree:true})||[]){animation.finished?.catch(()=>{});animation.cancel();}
}
mountPage();
setupPublicNavigation({beforeSwap:unmountPage,afterSwap:mountPage,onPlayerAdded:()=>setupMusicPlayer()});
window.addEventListener('pageshow',event=>{if(event.persisted)document.querySelector('#contenido')?.classList.add('skip-page-entry');});
window.addEventListener('hashchange',openAnchor);
