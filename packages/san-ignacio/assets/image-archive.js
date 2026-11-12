import {updateImageGrid} from './image-grid-motion.js?v=1';
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const collectionName=value=>value==='material'?'Carteles y materiales':'Fotografías';
export class ImageArchive {
 constructor({api,status,onChoose,onGallery,onShowGallery,onRefresh,onReturn=onRefresh,onBusy=()=>{},onDelete=()=>{},confirmDelete=message=>globalThis.confirm(message)}){
  Object.assign(this,{api,status,onChoose,onGallery,onShowGallery,onRefresh,onReturn,onBusy,onDelete,confirmDelete,items:[],collection:'photograph',mode:'archive',selected:new Map(),busy:false});
  this.dialog=document.querySelector('#image-library');
  this.dialog.addEventListener('cancel',event=>{if(this.busy)event.preventDefault();});
  this.dialog.querySelector('[data-close-library]').addEventListener('click',()=>{if(!this.busy)this.dialog.close();});
  this.dialog.addEventListener('close',()=>{this.returnFocus?.focus();if(this.mode==='archive')this.onRefresh();});
  this.dialog.querySelector('#image-search').addEventListener('input',()=>this.renderPicker());
  this.dialog.querySelector('#library-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-collection]');if(button){this.collection=button.dataset.collection;this.renderPicker();}});
  this.dialog.querySelector('#library-grid').addEventListener('click',async event=>{if(this.busy)return;const remove=event.target.closest('[data-delete-image]');if(remove){await this.deleteImage(remove.dataset.deleteImage,{picker:true});return;}const move=event.target.closest('[data-move-image]');if(move){const item=this.items.find(image=>image.url===move.dataset.moveImage);if(item)await this.moveImages([item.url],item.collection==='photograph'?'material':'photograph',{picker:true});return;}const button=event.target.closest('[data-pick]');if(!button)return;const image=this.items.find(item=>item.url===button.dataset.pick);if(this.mode==='single'){this.onChoose([{image:image.url,alt:image.alt}]);this.dialog.close();return;}if(this.selected.has(image.url))this.selected.delete(image.url);else{if(this.selected.size>=20){this.dialog.querySelector('#library-count').textContent='Selecciona hasta 20 imágenes a la vez.';return;}this.selected.set(image.url,{image:image.url,alt:image.alt});}this.renderPicker();});
  this.dialog.querySelector('#use-images').addEventListener('click',()=>{if(this.selected.size){this.onChoose([...this.selected.values()]);this.dialog.close();}});
  this.dialog.querySelector('#move-selected').addEventListener('click',()=>this.moveImages([...this.selected.keys()],this.dialog.querySelector('#move-target').value,{picker:true}));
  this.dialog.querySelector('#image-upload-form').addEventListener('submit',event=>this.upload(event));
  document.querySelector('#admin-workspace').addEventListener('click',event=>this.panelClick(event));
 }
 async load(){({images:this.items}=await this.api('/api/admin/images'));}
 tabs(single=false){const values=single?['photograph']:['photograph','material'];return values.map(value=>`<button type="button" data-collection="${value}" aria-pressed="${this.collection===value}">${collectionName(value)}</button>`).join('');}
 async showPanel(work,records,isCurrent=()=>true){this.records=records;await this.load();if(isCurrent())this.drawPanel(work);}
 drawPanel(work){
  work.innerHTML=`<p class="section-note">Subir una imagen la guarda en el archivo. Sólo aparece en la página cuando la usas en una publicación o la agregas a la galería.</p><div class="archive-heading"><div class="collection-tabs" aria-label="Archivos de imágenes">${this.tabs()}</div><div class="photo-actions"><button type="button" data-archive-upload class="primary">+ Subir imágenes</button><button type="button" data-published-gallery>Galería publicada</button></div></div><label class="library-search">Buscar en ${collectionName(this.collection)}<input id="archive-search" type="search" placeholder="Nombre o descripción"></label><p id="archive-count" class="help" role="status"></p><div id="archive-grid" class="archive-grid"></div>`;
  work.querySelector('#archive-search').addEventListener('input',()=>this.renderArchive());this.renderArchive();
 }
 publishedFor(url){return this.records?.find(doc=>doc.type==='gallery'&&!doc.archived&&doc.published?.image===url);}
 renderArchive(){const host=document.querySelector('#archive-grid');if(!host)return;const query=document.querySelector('#archive-search').value.toLocaleLowerCase('es');const items=this.items.filter(item=>item.collection===this.collection&&(item.title+' '+item.alt).toLocaleLowerCase('es').includes(query));document.querySelector('#archive-count').textContent=items.length+' imágenes guardadas';host.innerHTML=items.map(item=>{const publication=this.publishedFor(item.url);return `<article class="archive-card" data-image-card="${esc(item.url)}"><img src="${esc(item.thumb||item.url)}" alt="${esc(item.alt)}" loading="lazy"><div><h2>${esc(item.title||item.alt)}</h2><p>${publication?'En la galería publicada':'Guardada en el archivo'}</p><div class="archive-card-actions">${item.collection==='photograph'?`<button type="button" data-gallery-image="${esc(item.url)}">${publication?'Revisar publicación':'Agregar a la galería'}</button>`:''}<button type="button" data-move-image="${esc(item.url)}">Mover a ${item.collection==='photograph'?'Carteles y materiales':'Fotografías'}</button><button type="button" class="danger-button" data-delete-image="${esc(item.url)}">Borrar imagen</button><a href="${esc(item.url)}" target="_blank" rel="noopener">Ver imagen completa ↗</a></div></div></article>`;}).join('')||'<p class="empty">Este archivo todavía no tiene imágenes que coincidan con tu búsqueda.</p>';}
 async panelClick(event){
  if(this.busy)return;
  const remove=event.target.closest('[data-delete-image]');if(remove){await this.deleteImage(remove.dataset.deleteImage);return;}
  const host=document.querySelector('#admin-workspace'),tab=event.target.closest('[data-collection]');
  if(tab&&host.contains(tab)){this.collection=tab.dataset.collection;this.drawPanel(host);return;}
  if(event.target.closest('[data-archive-upload]')){await this.open({mode:'archive'});return;}
  if(event.target.closest('[data-published-gallery]')){this.onShowGallery();return;}
  if(event.target.closest('[data-return-archive]')){this.onReturn();return;}
  const gallery=event.target.closest('[data-gallery-image]');if(gallery){const image=this.items.find(item=>item.url===gallery.dataset.galleryImage);const existing=this.publishedFor(image.url)||this.records.find(doc=>doc.type==='gallery'&&doc.draft?.image===image.url);this.onGallery(image,existing);return;}
  const move=event.target.closest('[data-move-image]');if(move){const item=this.items.find(image=>image.url===move.dataset.moveImage);if(item)await this.moveImages([item.url],item.collection==='photograph'?'material':'photograph');}
 }
 async deleteImage(url,{picker=false}={}){
  const item=this.items.find(image=>image.url===url);if(this.busy||!item||!this.confirmDelete('¿Borrar definitivamente «'+(item.title||item.alt)+'»? No se podrá recuperar desde la consola. Si se usa en una publicación, primero tendrás que quitarla de ahí.'))return;
  this.busy=true;this.onBusy(true);const controls=[...(picker?this.dialog:document.querySelector('#admin-workspace')).querySelectorAll('input,select,button')],states=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
  let message,error=false;
  try{const result=await this.api('/api/admin/images',{method:'DELETE',body:JSON.stringify({url:item.url,version:item.version})});this.items=this.items.filter(image=>image.url!==url);this.selected.delete(url);this.onDelete(url);if(picker)this.renderPicker();else this.renderArchive();message=result.pending?'Imagen quitada del sitio. La limpieza del archivo está pendiente y se reintentará automáticamente.':'Imagen borrada del sitio.';}catch(failure){message=failure.message;error=true;}finally{this.busy=false;this.onBusy(false);controls.forEach((control,index)=>{if(control.isConnected!==false)control.disabled=states[index];});}
  if(picker){const feedback=this.dialog.querySelector('#library-feedback');feedback.textContent=message;feedback.classList.toggle('error',error);}else this.status(message,error);
 }
 async moveImages(urls,collection,{picker=false}={}){
  if(this.busy||!urls.length)return;
  this.busy=true;
  const controls=picker?[...this.dialog.querySelectorAll('input,select,button')]:[...document.querySelectorAll('[data-move-image]')];
  const states=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
  let moved=0;const failures=[],movedUrls=[];
  try{
   for(const url of urls){const item=this.items.find(image=>image.url===url);if(!item||item.collection===collection)continue;
    try{const {image}=await this.api('/api/admin/images',{method:'PATCH',body:JSON.stringify({url:item.url,version:item.version,collection})});this.items=this.items.map(entry=>entry.url===image.url?image:entry);moved++;movedUrls.push(item.url);if(this.photosOnly&&collection!=='photograph')this.selected.delete(item.url);}
    catch(error){failures.push((item.title||item.alt)+': '+error.message);}
   }
  }finally{
   try{await updateImageGrid(picker?this.dialog.querySelector('#library-grid'):document.querySelector('#archive-grid'),movedUrls,()=>{if(picker)this.renderPicker();else this.renderArchive();});}
   finally{this.busy=false;controls.forEach((control,index)=>{if(control.isConnected!==false)control.disabled=states[index];});}
   const message=(moved?moved+(moved===1?' imagen movida a ':' imágenes movidas a ')+collectionName(collection)+'. ':'')+(failures.length?failures.join(' '):!moved?'Las imágenes ya están en ese archivo.':'');
   if(picker){const feedback=this.dialog.querySelector('#library-feedback');feedback.textContent=message;feedback.classList.toggle('error',!!failures.length);}else this.status(message,!!failures.length);
  }
 }
 async open({mode='multiple',initial=[],collection}={}){
  this.returnFocus=document.activeElement;this.mode=mode;this.multiple=['multiple','photographs'].includes(mode);this.photosOnly=mode==='single';this.selected=new Map(initial.map(photo=>[photo.image,photo]));if(collection)this.collection=collection;if(this.photosOnly)this.collection='photograph';
  this.dialog.querySelector('.upload-disclosure').open=mode==='archive';this.dialog.querySelector('[name=image]').multiple=mode!=='single';this.dialog.querySelector('#library-title').textContent=mode==='archive'?'Guardar imágenes en el archivo':'Elegir imágenes';this.dialog.querySelector('#image-search').value='';this.dialog.querySelector('#upload-status').textContent='';this.dialog.querySelector('#library-feedback').textContent='';this.dialog.showModal();
  this.dialog.querySelector('#library-grid').innerHTML='<p class="empty">Cargando imágenes…</p>';
  try{await this.load();this.renderPicker();}catch(error){this.dialog.querySelector('#library-count').textContent=error.message;}
  this.dialog.querySelector('#image-search').focus();
 }
 renderPicker(){
  this.dialog.querySelector('#library-tabs').innerHTML=this.tabs(this.photosOnly);
  this.dialog.querySelector('[name=collection]').value=this.collection;this.dialog.querySelector('[name=collection]').disabled=this.photosOnly;
  const query=this.dialog.querySelector('#image-search').value.toLocaleLowerCase('es'),items=this.items.filter(item=>item.collection===this.collection&&(item.alt+' '+item.title).toLocaleLowerCase('es').includes(query));
  this.dialog.querySelector('#library-count').textContent=items.length+' imágenes disponibles'+(this.multiple||this.mode==='archive'?' · '+this.selected.size+' seleccionadas':'');
  this.dialog.querySelector('#library-grid').innerHTML=items.map(item=>`<article class="library-item" data-image-card="${esc(item.url)}"><button type="button" class="library-select" data-pick="${esc(item.url)}" aria-pressed="${this.selected.has(item.url)}"><img src="${esc(item.thumb||item.url)}" alt="" loading="lazy"><span>${this.selected.has(item.url)?'✓ ':''}${esc(item.title||item.alt)}</span></button><button type="button" class="library-move" data-move-image="${esc(item.url)}">Mover a ${item.collection==='photograph'?'Carteles y materiales':'Fotografías'}</button><button type="button" class="danger-button library-delete" data-delete-image="${esc(item.url)}">Borrar imagen</button></article>`).join('')||'<p class="empty">No hay imágenes aquí. Puedes subirlas desde tu computadora.</p>';
  this.dialog.querySelector('#move-selection').hidden=this.mode==='single';this.dialog.querySelector('#move-selected').disabled=!this.selected.size;this.dialog.querySelector('#move-selected').textContent='Mover '+this.selected.size+(this.selected.size===1?' imagen':' imágenes');this.dialog.querySelector('#move-target').value=this.collection==='photograph'?'material':'photograph';
  const use=this.dialog.querySelector('#use-images');use.hidden=!this.multiple;use.disabled=!this.selected.size;use.textContent='Usar '+this.selected.size+(this.selected.size===1?' imagen':' imágenes');
 }
 async upload(event){
  event.preventDefault();if(this.busy)return;const form=event.currentTarget,files=[...form.elements.image.files],collection=this.photosOnly?'photograph':form.elements.collection.value;
  const label=this.dialog.querySelector('#upload-status');if(files.some(file=>file.size>8*1024*1024)){label.textContent='Cada imagen debe pesar hasta 8 MB. Elige archivos más pequeños.';return;}
  if(files.length>20||this.mode==='single'&&files.length!==1){label.textContent=this.mode==='single'?'Elige una fotografía para la galería.':'Puedes subir hasta 20 imágenes a la vez.';return;}
  if(this.multiple&&files.length+this.selected.size>20){label.textContent='La publicación admite hasta 20 imágenes. Quita algunas antes de añadir más.';return;}
  this.busy=true;const controls=[...this.dialog.querySelectorAll('input,select,button')],states=controls.map(control=>control.disabled);const alt=form.elements.alt.value;controls.forEach(control=>control.disabled=true);let saved=0,singleImage;
  try{for(const file of files){label.textContent='Guardando imagen '+(saved+1)+' de '+files.length+'…';const body=new FormData();body.set('image',file);body.set('alt',alt);body.set('title',file.name.replace(/\.[^.]+$/,''));body.set('collection',collection);const {image}=await this.api('/api/admin/images',{method:'POST',body});this.items.unshift(image);saved++;singleImage=image;if(this.multiple)this.selected.set(image.url,{image:image.url,alt:image.alt});}
   form.reset();this.collection=collection;label.textContent=saved+(saved===1?' imagen guardada.':' imágenes guardadas.')+(this.multiple?' Pulsa «Usar imágenes» para añadirlas a la publicación.':'');
  }catch(error){label.textContent=(saved?saved+' imágenes ya quedaron guardadas. ':'')+error.message;}
  finally{this.busy=false;controls.forEach((control,index)=>control.disabled=states[index]);this.renderPicker();}
  if(this.mode==='single'&&saved){this.onChoose([{image:singleImage.url,alt:singleImage.alt}]);this.dialog.close();}
 }
}
