export function setupPhotoViewer(doc=document,win=globalThis.window){
 const gallery=[...doc.querySelectorAll('.photo-button')],dialog=doc.querySelector('#lightbox');
 if(!dialog||!gallery.length)return;
 const reduced=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const image=dialog.querySelector('img');
 let active=0,opener,collection=[],sequence=0,closing=false,dialogEffect=null,imageEffect=null,closeOnImageClick=false;
 const canAnimate=node=>!reduced?.matches&&typeof node.animate==='function';
 const opacity=node=>win?.getComputedStyle?.(node).opacity||'1';
 function effect(node,frames,duration){
  const animation=node.animate(frames,{duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'});
  animation.finished.catch(()=>{});return animation;
 }
 function show(){
  const button=collection[active];
  image.src=button.dataset.image;image.alt=button.querySelector('img').alt;
  dialog.querySelector('figcaption').textContent=closeOnImageClick?button.dataset.caption:`${active+1} / ${collection.length} · ${button.dataset.caption}`;
 }
 async function switchPhoto(){
  const current=++sequence;
  const fromOpacity=opacity(image);imageEffect?.cancel();
  if(!canAnimate(image)){show();return;}
  imageEffect=effect(image,[{opacity:fromOpacity},{opacity:'0'}],140);
  try{await imageEffect.finished;}catch{return;}
  if(current!==sequence||closing)return;
  show();
  try{await image.decode?.();}catch{}
  if(current!==sequence||closing)return;
  imageEffect?.cancel();imageEffect=effect(image,[{opacity:'0'},{opacity:'1'}],320);
 }
 function step(delta){
  if(collection.length<2||closing)return;
  active=(active+delta+collection.length)%collection.length;switchPhoto();
 }
 function closeViewer(){
  if(closing)return;
  sequence++;imageEffect?.cancel();
  if(!canAnimate(dialog)){dialog.close();return;}
  const fromOpacity=opacity(dialog);dialogEffect?.cancel();closing=true;
  const animation=effect(dialog,[{opacity:fromOpacity},{opacity:'0'}],280);dialogEffect=animation;
  animation.finished.then(()=>{if(closing&&dialogEffect===animation)dialog.close();}).catch(()=>{});
 }
 for(const button of gallery)button.addEventListener('click',()=>{
  sequence++;closing=false;dialogEffect?.cancel();imageEffect?.cancel();
  closeOnImageClick=button.dataset.closeOnImageClick==='true';
  dialog.dataset.closeOnImageClick=String(closeOnImageClick);
  image.title=closeOnImageClick?'Cerrar fotografía':'';
  dialog.querySelector('.lightbox-prev').hidden=closeOnImageClick;
  dialog.querySelector('.lightbox-next').hidden=closeOnImageClick;
  collection=closeOnImageClick?[button]:gallery.filter(item=>(item.dataset.photoCollection||'')===(button.dataset.photoCollection||''));
  active=collection.indexOf(button);opener=button;show();
  if(!dialog.open)dialog.showModal();
  if(canAnimate(dialog))dialogEffect=effect(dialog,[{opacity:'0'},{opacity:'1'}],400);
  dialog.querySelector('.lightbox-close').focus();
 });
 dialog.querySelector('.lightbox-close').addEventListener('click',closeViewer);
 image.addEventListener('click',()=>{if(closeOnImageClick)closeViewer();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeViewer();});
 dialog.addEventListener('close',()=>{sequence++;closing=false;dialogEffect?.cancel();imageEffect?.cancel();dialogEffect=null;imageEffect=null;opener?.focus();});
 dialog.querySelector('.lightbox-prev').addEventListener('click',()=>step(-1));
 dialog.querySelector('.lightbox-next').addEventListener('click',()=>step(1));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}});
 reduced?.addEventListener?.('change',()=>{
  if(!reduced.matches)return;
  sequence++;dialogEffect?.cancel();imageEffect?.cancel();dialogEffect=null;imageEffect=null;
  if(closing)dialog.close();else if(collection.length)show();
 });
}
