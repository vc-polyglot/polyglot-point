export const editableSelector='input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]';
export const interactiveSelector='a,button,summary,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])';
export function lerpFactor(delta){return 1-Math.pow(1-.16,Math.min(Math.max(delta,0),50)/(1000/60));}
export function lightInkFor(color){const channels=String(color).match(/[\d.]+/g)?.map(Number);if(!channels||channels.length<3)return false;const linear=channels.slice(0,3).map(v=>{const s=v/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);});return .2126*linear[0]+.7152*linear[1]+.0722*linear[2]<.179;}
export function initCursor(doc=document,win=window){
 const fine=win.matchMedia('(hover: hover) and (pointer: fine)'),reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 if(!fine.matches||reduced.matches)return {disabled:true};
 const layer=doc.createElement('div'),dot=doc.createElement('div'),ring=doc.createElement('div');
 layer.className='cursor-layer';layer.setAttribute('aria-hidden','true');layer.inert=true;dot.className='cursor-dot';ring.className='cursor-ring';layer.append(dot,ring);doc.body.append(layer);
 let x=0,y=0,rx=0,ry=0,last=0,raf=0,visible=false,themeTarget=null;
 function hide(){visible=false;layer.classList.remove('is-visible','is-hovering');doc.documentElement.classList.remove('has-custom-cursor');if(raf)win.cancelAnimationFrame(raf);raf=0;last=0;themeTarget=null;}
 function syncHost(){const host=doc.querySelector('dialog[open]')||doc.body;if(layer.parentElement!==host)host.append(layer);}
 function tick(time){raf=0;if(!visible)return;const delta=last?time-last:1000/60;last=time;const factor=lerpFactor(delta);rx+=(x-rx)*factor;ry+=(y-ry)*factor;ring.style.transform=`translate3d(${rx}px,${ry}px,0)`;if(Math.abs(x-rx)+Math.abs(y-ry)>.04)raf=win.requestAnimationFrame(tick);else{rx=x;ry=y;last=0;}}
 function contrast(target){if(target===themeTarget)return;themeTarget=target;let dark=false;if(target.closest('.photo-frame,.photo-button,.hero-image'))dark=true;else{let node=target;while(node&&node.nodeType===1){const color=win.getComputedStyle(node).backgroundColor;const rgba=color.match(/[\d.]+/g)?.map(Number);if(rgba&&rgba.length>=3&&(rgba.length===3||rgba[3]>.8)){dark=lightInkFor(color);break;}node=node.parentElement;}}layer.classList.toggle('is-on-dark',dark);}
 doc.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||!fine.matches||reduced.matches||doc.documentElement.classList.contains('intro-pending')){hide();return;}const target=event.target?.closest?event.target:doc.body;if(target.closest(editableSelector)){hide();return;}
  syncHost();
  x=event.clientX;y=event.clientY;dot.style.transform=`translate3d(${x}px,${y}px,0)`;
  if(!visible){rx=x;ry=y;ring.style.transform=`translate3d(${x}px,${y}px,0)`;visible=true;layer.classList.add('is-visible');doc.documentElement.classList.add('has-custom-cursor');}
  layer.classList.toggle('is-hovering',!!target.closest(interactiveSelector));contrast(target);if(!raf)raf=win.requestAnimationFrame(tick);
 },{passive:true});
 doc.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')hide();},{passive:true});
 doc.addEventListener('click',()=>{if(visible)syncHost();});
 doc.addEventListener('pointerleave',hide);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)hide();});doc.addEventListener('close',hide,true);win.addEventListener('blur',hide);win.addEventListener('pagehide',hide);fine.addEventListener?.('change',hide);reduced.addEventListener?.('change',hide);
 return {hide,disabled:false};
}
