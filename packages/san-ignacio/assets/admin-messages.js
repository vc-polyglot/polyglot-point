const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const date=value=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(new Date(value));
export class MessagesAdmin{
 constructor({api,status,onBusy=()=>{},confirmDelete=message=>globalThis.confirm(message)}){Object.assign(this,{api,status,onBusy,confirmDelete,busy:false,messages:[]});}
 async showPanel(host,isCurrent=()=>true){const {messages}=await this.api('/api/admin/messages');if(!isCurrent())return;this.host=host;this.messages=messages;this.render();}
 render(){
  this.host.innerHTML=this.messages.length?this.messages.map(message=>`<article class="message-card"><div class="message-meta"><span>${esc(message.name)} · ${esc(message.email)}${message.phone?' · '+esc(message.phone):''}</span><time>${esc(date(message.createdAt))}</time></div><h2>${esc(message.subject)}</h2><p class="message-body">${esc(message.message)}</p><label>Atención del mensaje<select data-message="${esc(message.id)}" data-saved-status="${esc(message.status)}">${[['new','Pendiente'],['read','Atendido'],['archived','Archivado']].map(([value,label])=>`<option value="${value}" ${message.status===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="help">Responde desde el correo de la oficina a la dirección indicada arriba.</p><div class="photo-actions"><button type="button" class="danger-button" data-delete-message="${esc(message.id)}" aria-label="Borrar mensaje: ${esc(message.subject)}">Borrar mensaje</button></div></article>`).join(''):'<p class="empty" tabindex="-1">Todavía no hay mensajes recibidos.</p>';
  this.host.querySelectorAll('[data-message]').forEach(select=>select.addEventListener('change',()=>this.updateStatus(select)));
  this.host.querySelectorAll('[data-delete-message]').forEach(button=>button.addEventListener('click',()=>this.deleteMessage(button.dataset.deleteMessage)));
 }
 setBusy(value){this.busy=value;this.onBusy(value);this.host.querySelectorAll('button,select').forEach(control=>control.disabled=value);}
 async updateStatus(select){
  if(this.busy){select.value=select.dataset.savedStatus;return;}this.setBusy(true);
  try{const {message}=await this.api('/api/admin/messages/'+encodeURIComponent(select.dataset.message),{method:'PATCH',body:JSON.stringify({status:select.value})});this.messages=this.messages.map(item=>item.id===message.id?message:item);select.dataset.savedStatus=message.status;this.status('Estado del mensaje actualizado.');}catch(error){select.value=select.dataset.savedStatus;this.status(error.message,true);}finally{this.setBusy(false);}
 }
 async deleteMessage(id){
  const message=this.messages.find(item=>item.id===id);if(this.busy||!message||!this.confirmDelete('¿Borrar definitivamente el mensaje «'+message.subject+'» de '+message.name+'? No se podrá recuperar desde la consola.'))return;
  this.setBusy(true);this.status('Borrando mensaje…');
  try{await this.api('/api/admin/messages/'+encodeURIComponent(id),{method:'DELETE'});this.messages=this.messages.filter(item=>item.id!==id);this.render();this.status('Mensaje borrado definitivamente.');this.setBusy(false);this.host.querySelector('[data-delete-message],.empty')?.focus();}catch(error){this.status(error.message,true);}finally{if(this.busy)this.setBusy(false);}
 }
}
