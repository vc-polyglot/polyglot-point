import {ui} from './i18n.js?v=2';
export function setupHomeCarousel(doc=document,win=window){
 const root=doc.querySelector('[data-home-carousel]');if(!root)return;
 const slides=[...root.querySelectorAll('[data-home-slide]')].map(node=>({image:node.dataset.image,alt:node.dataset.alt}));if(slides.length<2)return;
 const base=root.querySelector('.photo-frame img'),incoming=root.querySelector('[data-home-incoming]'),layer=root.querySelector('.home-incoming'),reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 let index=0,timer=null,busy=false,ended=false,visible=!win.IntersectionObserver,animation,serial=0;const failed=new Set();
 function sync(){
  if(timer!==null)win.clearTimeout(timer);timer=null;
  if(!ended&&!busy&&!reduced.matches&&!doc.hidden&&visible&&root.isConnected!==false&&slides.length-failed.size>1)timer=win.setTimeout(()=>{void show(index+1);},8000);
 }
 async function show(target){
  if(busy||ended)return;
  let nextIndex=(target+slides.length)%slides.length;const direction=target<index?-1:1;for(let n=0;failed.has(slides[nextIndex].image)&&n<slides.length;n++)nextIndex=(nextIndex+direction+slides.length)%slides.length;
  if(nextIndex===index||failed.has(slides[nextIndex].image)){sync();return;}
  const slide=slides[nextIndex],token=++serial;busy=true;sync();
  try{
   incoming.src=slide.image;await incoming.decode();if(ended||token!==serial||root.isConnected===false)return;
   if(!reduced.matches&&layer.animate){animation=layer.animate([{opacity:0},{opacity:1}],{duration:1200,easing:'ease-in-out',fill:'forwards'});await animation.finished;}
   if(ended||token!==serial||root.isConnected===false)return;
   base.removeAttribute('srcset');base.src=slide.image;base.alt=ui(slide.alt,doc);index=nextIndex;
  }catch{if(!ended&&token===serial)failed.add(slide.image);}finally{animation?.cancel();animation=null;busy=false;if(!ended)sync();}
 }
 root.addEventListener('click',event=>{if(event.defaultPrevented||event.button>0)return;root.focus({preventScroll:true});void show(index+1);});
 root.addEventListener('keydown',event=>{if(event.target!==root||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();void show(index+(event.key==='ArrowLeft'?-1:1));});
 doc.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);win.addEventListener('site-languagechange',sync);win.addEventListener('pagehide',()=>{ended=true;serial++;animation?.cancel();sync();});win.addEventListener('pageshow',()=>{ended=false;sync();});
 if(win.IntersectionObserver)new win.IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();},{threshold:0.15}).observe(root);
 sync();return {show,destroy(){ended=true;serial++;animation?.cancel();if(timer!==null)win.clearTimeout(timer);timer=null;}};
}
