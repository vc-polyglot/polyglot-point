export function setupNavigation(doc=document,win=window){
 const menu=doc.querySelector('.menu-toggle'),nav=doc.querySelector('#primary-nav');if(!menu||!nav)return;
 const hover=win.matchMedia('(hover: hover) and (pointer: fine)'),reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 const groups=[...doc.querySelectorAll('[data-nav-group]')],states=new Map();let keyboard=false,lastPointerType='mouse';
 const control=group=>group.querySelector(':scope > .nav-entry > [data-nav-toggle]');
 const panel=group=>group.querySelector(':scope > .nav-submenu');
 const ancestors=group=>groups.filter(other=>other!==group&&other.contains(group));
 const descendants=group=>groups.filter(other=>other!==group&&group.contains(other));
 const depth=group=>ancestors(group).length;
 doc.documentElement.classList.add('menu-enhanced');
 for(const group of groups){group.open=false;states.set(group,{phase:'closed',intent:0,animation:null,generation:0});panel(group).inert=true;}
 function clearIntent(state){if(state.intent)win.clearTimeout(state.intent);state.intent=0;}
 function finishClose(group,state){
  descendants(group).forEach(child=>close(child,{immediate:true}));const target=panel(group);target.hidden=true;target.inert=true;target.setAttribute('aria-hidden','true');
  state.phase='closed';group.open=false;group.classList.remove('is-visible','is-closing');control(group).setAttribute('aria-expanded','false');
 }
 function frame(target,state){if(state.phase==='closed')return {opacity:0,transform:'translateY(-8px)'};const value=win.getComputedStyle(target);return {opacity:value.opacity,transform:value.transform==='none'?'translateY(0)':value.transform};}
 function close(group,{immediate=false}={}){
  const state=states.get(group),target=panel(group);clearIntent(state);if(!group.open||state.phase==='closing'&&!immediate)return;
  const from=frame(target,state);const generation=++state.generation;state.animation?.cancel();state.animation=null;group.classList.remove('is-visible');group.classList.add('is-closing');
  if(immediate||reduced.matches||typeof target.animate!=='function'){finishClose(group,state);return;}
  state.phase='closing';const animation=target.animate([from,{opacity:0,transform:'translateY(-8px)'}],{duration:330,easing:'ease-out',fill:'forwards'});state.animation=animation;
  animation.finished.then(()=>{if(state.generation!==generation||state.phase!=='closing')return;finishClose(group,state);animation.cancel();state.animation=null;}).catch(()=>{});
 }
 function open(group){
  const state=states.get(group),target=panel(group);clearIntent(state);
  ancestors(group).sort((a,b)=>depth(a)-depth(b)).forEach(parent=>open(parent));
  if(state.phase==='open'||state.phase==='opening')return;
  const from=frame(target,state);const generation=++state.generation;state.animation?.cancel();state.animation=null;
  groups.filter(other=>other!==group&&other.parentElement===group.parentElement).forEach(other=>close(other,{immediate:true}));
  group.open=true;target.hidden=false;target.inert=false;target.setAttribute('aria-hidden','false');control(group).setAttribute('aria-expanded','true');group.classList.remove('is-closing');group.classList.add('is-visible');
  if(reduced.matches||typeof target.animate!=='function'){state.phase='open';return;}
  state.phase='opening';const animation=target.animate([from,{opacity:1,transform:'translateY(0)'}],{duration:330,easing:'cubic-bezier(.22,.61,.36,1)',fill:'none'});state.animation=animation;
  animation.finished.then(()=>{if(state.generation===generation&&state.phase==='opening'){state.phase='open';state.animation=null;}}).catch(()=>{});
 }
 function closeMenu(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');groups.filter(group=>depth(group)===0).forEach(group=>close(group,{immediate:true}));}
 menu.addEventListener('click',()=>{const next=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',next);menu.setAttribute('aria-expanded',String(next));if(!next)closeMenu();});
 nav.addEventListener('click',event=>{if(event.target.closest('a[href]'))closeMenu();});
 for(const group of groups){
  const button=control(group);button.addEventListener('click',event=>{event.preventDefault();if(hover.matches&&lastPointerType==='mouse'&&event.detail>0){open(group);return;}if(group.open&&states.get(group).phase!=='closing')close(group);else open(group);});
  group.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&hover.matches)open(group);});
  group.addEventListener('pointerleave',event=>{if(event.pointerType!=='mouse'||!hover.matches)return;const state=states.get(group);clearIntent(state);state.intent=win.setTimeout(()=>{state.intent=0;if(!(keyboard&&group.contains(doc.activeElement)))close(group);},180);});
  group.addEventListener('focusin',()=>{clearIntent(states.get(group));if(states.get(group).phase==='closing')open(group);});
  group.addEventListener('focusout',event=>{if(!group.contains(event.relatedTarget))close(group);});
 }
 doc.addEventListener('pointerdown',event=>{keyboard=false;lastPointerType=event.pointerType||'mouse';},{passive:true});
 doc.addEventListener('keydown',event=>{
  if(['Tab','ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(event.key))keyboard=true;
  const focused=groups.filter(g=>g.contains(doc.activeElement)).sort((a,b)=>depth(b)-depth(a))[0];
  if(event.key==='Escape'){
   const group=focused?.open?focused:groups.filter(g=>g.open).sort((a,b)=>depth(b)-depth(a))[0];
   if(group){close(group,{immediate:true});control(group).focus();}else if(menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}
  }else if((event.key==='ArrowDown'||event.key==='ArrowRight')&&focused&&doc.activeElement===control(focused)){event.preventDefault();open(focused);panel(focused).querySelector('a,button')?.focus();}
  else if(event.key==='ArrowLeft'&&focused&&depth(focused)>0){event.preventDefault();close(focused,{immediate:true});control(focused).focus();}
 });
 doc.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});reduced.addEventListener?.('change',closeMenu);
 return {open,close,closeMenu,states};
}
