export function setupPeopleMotion(doc=document,win=window){
 const profiles=[...doc.querySelectorAll('.person-profile')];
 if(!profiles.length)return;
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 const states=new Map();
 function finish(profile,state){
  state.generation++;
  profile.open=state.desiredOpen;
  state.panel.inert=!state.desiredOpen;
  state.animation?.cancel();state.fade?.cancel();
  state.animation=null;state.fade=null;
  profile.style.removeProperty('height');profile.style.removeProperty('overflow');
  profile.classList.remove('is-closing');
 }
 function move(profile,state,opening){
  const wasOpen=profile.open;
  const fromHeight=profile.getBoundingClientRect().height;
  const fromOpacity=wasOpen?win.getComputedStyle(state.panel).opacity:'0';
  const generation=++state.generation;
  state.desiredOpen=opening;
  // Preserve the current frame before cancelling an interrupted animation.
  profile.style.height=fromHeight+'px';profile.style.overflow='hidden';
  state.animation?.cancel();state.fade?.cancel();
  profile.open=true;state.panel.inert=!opening;
  profile.classList.toggle('is-closing',!opening);
  const summaryHeight=state.summary.getBoundingClientRect().height;
  const targetHeight=summaryHeight+(opening?state.panel.getBoundingClientRect().height:0);
  state.targetHeight=targetHeight;
  state.animation=profile.animate([{height:fromHeight+'px'},{height:targetHeight+'px'}],{duration:opening?480:380,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'});
  state.fade=state.panel.animate([{opacity:fromOpacity},{opacity:opening?'1':'0'}],{duration:opening?400:260,easing:'ease-out',fill:'forwards'});
  state.fade.finished.catch(()=>{});
  state.animation.finished.then(()=>{if(state.generation===generation)finish(profile,state);}).catch(()=>{});
 }
 for(const profile of profiles){
  const summary=profile.querySelector('summary'),panel=profile.querySelector('.person-profile-reading');
  if(!summary||!panel)continue;
  const state={summary,panel,desiredOpen:profile.open,generation:0,animation:null,fade:null,targetHeight:0};
  states.set(profile,state);
  summary.addEventListener('click',event=>{
   if(reduced.matches||typeof profile.animate!=='function'||typeof panel.animate!=='function')return;
   event.preventDefault();
   move(profile,state,state.animation?!state.desiredOpen:!profile.open);
  });
  profile.addEventListener('toggle',()=>{
   if(state.animation)return;
   state.desiredOpen=profile.open;panel.inert=!profile.open;
  });
  if(typeof win.ResizeObserver==='function'){
   const observer=new win.ResizeObserver(()=>{
    if(!state.animation||!state.desiredOpen)return;
    const height=summary.getBoundingClientRect().height+panel.getBoundingClientRect().height;
    if(Math.abs(height-state.targetHeight)>1)move(profile,state,true);
   });
   observer.observe(panel);
  }
 }
 reduced.addEventListener?.('change',()=>{if(reduced.matches)for(const [profile,state]of states)if(state.animation)finish(profile,state);});
 return {states};
}
