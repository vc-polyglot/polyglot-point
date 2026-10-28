export const INTRO_TIMELINE={presentationEnd:1000,presenceEnd:2500,end:4500,watchdog:6000};
export function introPhase(time){return time<INTRO_TIMELINE.presentationEnd?'presentation':time<INTRO_TIMELINE.presenceEnd?'presence':time<INTRO_TIMELINE.end?'crossfade':'complete';}
export function shouldRevealHero({path,hash,seen,reduced,saveData=false,preview=false}){return path==='/'&&!hash&&!seen&&!reduced&&!saveData&&!preview;}
export function initHeroReveal(doc=document,win=window){
 const overlay=doc.getElementById('site-intro');if(!overlay)return;
 const root=doc.documentElement,reduced=win.matchMedia('(prefers-reduced-motion: reduce)'),buttons=[...doc.querySelectorAll('[data-replay-intro]')];
 let running=false,raf=0,watchdog=0,run=0,returnFocus=null;
 function finish(token=run){
  if(!running||token!==run)return;running=false;
  if(raf)win.cancelAnimationFrame(raf);raf=0;win.clearTimeout(watchdog);win.clearTimeout(win.__siIntroWatchdog);
  for(const animation of overlay.getAnimations?.({subtree:true})||[]){animation.finished?.catch(()=>{});animation.cancel();}
  root.classList.remove('intro-pending','intro-active');overlay.hidden=true;overlay.dataset.phase='complete';root.dataset.introState='complete';
  const target=returnFocus;returnFocus=null;if(target?.isConnected!==false)target?.focus({preventScroll:true});
 }
 function start({manual=false}={}){
  if(reduced.matches){root.classList.remove('intro-pending','intro-active');overlay.hidden=true;return;}
  if(running)return;
  running=true;const token=++run;returnFocus=manual?doc.activeElement:null;
  try{win.sessionStorage.setItem('san-ignacio-intro-r4','1');}catch{if(!manual){finish(token);return;}}
  win.clearTimeout(win.__siIntroWatchdog);watchdog=win.setTimeout(()=>finish(token),INTRO_TIMELINE.watchdog);
  overlay.hidden=false;root.classList.add('intro-pending','intro-active');
  const animation=(overlay.getAnimations?.()||[]).find(a=>a.animationName==='si-intro-curtain');
  if(!animation){finish(token);return;}
  const startTime=win.performance.now();
  function observe(){if(!running||token!==run)return;const elapsed=typeof animation.currentTime==='number'?animation.currentTime:win.performance.now()-startTime;const phase=introPhase(elapsed);overlay.dataset.phase=phase;root.dataset.introState=phase;if(phase==='complete'){finish(token);return;}raf=win.requestAnimationFrame(observe);}
  animation.finished.then(()=>finish(token)).catch(()=>finish(token));observe();
  if(manual)overlay.querySelector('[data-skip-intro]')?.focus({preventScroll:true});
 }
 function updateControls(){for(const button of buttons){button.disabled=reduced.matches;button.title=reduced.matches?'Presentación desactivada por tu preferencia de movimiento reducido':'Volver a ver la presentación de las tres cruces';}}
 for(const button of buttons)button.addEventListener('click',()=>start({manual:true}));
 overlay.querySelector('[data-skip-intro]')?.addEventListener('click',()=>finish());
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'||event.key==='Tab')finish();});
 reduced.addEventListener?.('change',()=>{updateControls();if(reduced.matches)finish();});win.addEventListener('pagehide',()=>finish());win.addEventListener('si-intro-timeout',()=>finish());
 updateControls();if(root.classList.contains('intro-pending'))start();
 return {replay:()=>start({manual:true}),finish:()=>finish()};
}
