export function setupPublicationReader(doc=document,win=window){
 const dialog=doc.querySelector('#publication-reader'),opener=doc.querySelector('[data-publication-open]');
 if(!dialog||!opener)return;
 const find=selector=>dialog.querySelector(selector);
 const layout=find('.publication-reader-layout'),stage=find('.publication-stage'),image=find('[data-publication-image]');
 const select=find('#publication-page'),pages=[...select.options],status=find('[data-publication-status]');
 const previous=find('[data-publication-prev]'),next=find('[data-publication-next]');
 const minus=find('[data-publication-minus]'),plus=find('[data-publication-plus]'),scale=find('[data-publication-scale]');
 const full=find('[data-publication-fullscreen]'),close=find('[data-publication-close]');
 let active=0,zoom=1,loading=false;
 function resize(){
  const page=pages[active].dataset;
  const width=Math.max(1,Math.min(stage.clientWidth-32,(stage.clientHeight-32)*Number(page.width)/Number(page.height)));
  image.style.width=Math.round(width*zoom)+'px';
 }
 function setZoom(value){
  zoom=Math.min(3,Math.max(1,value));
  scale.textContent=Math.round(zoom*100)+' %';minus.disabled=zoom===1;plus.disabled=zoom===3;
  resize();
 }
 function show(index){
  active=Math.min(pages.length-1,Math.max(0,index));
  select.value=String(active);
  const page=pages[active].dataset;
  previous.disabled=active===0;next.disabled=active===pages.length-1;
  image.hidden=true;loading=true;status.textContent=`Cargando ${page.label.toLowerCase()}…`;
  image.alt=page.label+' · Memorias de la Iglesia de San Ignacio de Loyola';
  image.width=Number(page.width);image.height=Number(page.height);image.src=page.src;
  setZoom(1);stage.scrollTop=0;stage.scrollLeft=0;
 }
 image.addEventListener('load',()=>{
  if(!dialog.open)return;
  loading=false;image.hidden=false;resize();
  status.textContent=`${pages[active].dataset.label} · ${active+1} de ${pages.length}`;
 });
 image.addEventListener('error',()=>{
  if(!dialog.open)return;
  loading=false;image.hidden=true;status.textContent='No se pudo cargar esta página. Usa las flechas para cambiar de página y volver a intentarlo.';
 });
 opener.addEventListener('click',()=>{dialog.showModal();show(active);close.focus();});
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  if(doc.fullscreenElement===layout)doc.exitFullscreen?.().catch(()=>{});
  opener.focus();
 });
 previous.addEventListener('click',()=>show(active-1));next.addEventListener('click',()=>show(active+1));
 select.addEventListener('change',()=>show(Number(select.value)));
 minus.addEventListener('click',()=>setZoom(zoom-.5));plus.addEventListener('click',()=>setZoom(zoom+.5));
 find('[data-publication-fit]').addEventListener('click',()=>{setZoom(1);stage.scrollTop=0;stage.scrollLeft=0;});
 dialog.addEventListener('keydown',event=>{
  if(event.target?.matches?.('select,input,textarea,[contenteditable="true"]'))return;
  const index=event.key==='ArrowLeft'?active-1:event.key==='ArrowRight'?active+1:null;
  if(index!==null){event.preventDefault();if(index>=0&&index<pages.length)show(index);}
 });
 full.hidden=typeof layout.requestFullscreen!=='function';
 full.addEventListener('click',async()=>{
  try{if(doc.fullscreenElement===layout)await doc.exitFullscreen();else await layout.requestFullscreen();}
  catch{status.textContent='La lectura ya ocupa toda la ventana. Puedes seguir consultando aquí.';}
 });
 doc.addEventListener('fullscreenchange',()=>{
  const expanded=doc.fullscreenElement===layout;
  full.setAttribute('aria-pressed',String(expanded));full.textContent=expanded?'Salir de pantalla completa':'Pantalla completa';resize();
 });
 if(typeof win.ResizeObserver==='function')new win.ResizeObserver(()=>{if(dialog.open&&!loading)resize();}).observe(stage);
 else win.addEventListener('resize',()=>{if(dialog.open)resize();});
 return {show,setZoom};
}
