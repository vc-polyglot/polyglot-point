import test from 'node:test';
import assert from 'node:assert/strict';
import {MessagesAdmin} from '../assets/admin-messages.js';

const message=(id,status='new')=>({id,name:'Visitante QA',email:'qa@example.invalid',phone:'',subject:'Consulta '+id,message:'Mensaje de prueba',status,createdAt:'2026-11-11T12:00:00Z'});
function fixture({confirmDelete=()=>true,api=async()=>({})}={}){
 const feedback=[],busy=[];let focused=false;
 const host={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>({focus(){focused=true;}})};
 const admin=new MessagesAdmin({api,confirmDelete,status:(text,error=false)=>feedback.push({text,error}),onBusy:value=>busy.push(value)});
 Object.assign(admin,{host,messages:[message('first'),message('second','archived')]});
 return {admin,host,feedback,busy,isFocused:()=>focused};
}

test('Borrar un mensaje exige confirmación y conserva los otros mensajes',async()=>{
 let confirmed=false;const requests=[];const {admin,feedback,busy,isFocused}=fixture({confirmDelete:text=>{assert.match(text,/Consulta first/);assert.match(text,/No se podrá recuperar/);return confirmed;},api:async(url,options)=>{requests.push({url,...options});}});
 await admin.deleteMessage('first');assert.equal(requests.length,0);assert.equal(admin.messages.length,2);
 confirmed=true;await admin.deleteMessage('first');assert.deepEqual(requests,[{url:'/api/admin/messages/first',method:'DELETE'}]);assert.deepEqual(admin.messages.map(item=>item.id),['second']);assert.equal(admin.messages[0].status,'archived');assert.match(feedback.at(-1).text,/borrado definitivamente/);assert.deepEqual(busy,[true,false]);assert.equal(admin.busy,false);assert.equal(isFocused(),true);
});

test('Un fallo al borrar mantiene el mensaje y permite reintentar sin duplicar solicitudes en curso',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});let calls=0;
 const {admin,feedback}=fixture({api:async()=>{calls++;await pending;throw Error('No fue posible borrar.');}});const before=structuredClone(admin.messages);
 const deletion=admin.deleteMessage('first');await admin.deleteMessage('first');assert.equal(calls,1);assert.equal(admin.busy,true);release();await deletion;
 assert.deepEqual(admin.messages,before);assert.equal(admin.busy,false);assert.equal(feedback.at(-1).error,true);assert.match(feedback.at(-1).text,/No fue posible borrar/);
});

test('Borrar el último mensaje muestra la bandeja vacía y el contenido del visitante siempre se escapa',async()=>{
 const {admin,host}=fixture();admin.messages=[{...message('only'),name:'<script>alert(1)</script>',subject:'" onclick="alert(1)',message:'<img src=x onerror=alert(1)>'}];admin.render();
 assert.doesNotMatch(host.innerHTML,/<script>|<img /);assert.match(host.innerHTML,/&lt;script&gt;/);assert.match(host.innerHTML,/data-delete-message="only"/);
 await admin.deleteMessage('only');assert.equal(admin.messages.length,0);assert.match(host.innerHTML,/Todavía no hay mensajes recibidos/);
});

test('Atender un mensaje conserva su estado ante fallos y actualiza la información al guardar',async()=>{
 const {admin,feedback}=fixture({api:async()=>{throw Error('Sesión vencida');}});const select={dataset:{message:'first',savedStatus:'new'},value:'read'};
 await admin.updateStatus(select);assert.equal(select.value,'new');assert.equal(select.dataset.savedStatus,'new');assert.equal(admin.messages[0].status,'new');assert.equal(feedback.at(-1).error,true);
 admin.api=async()=>({message:message('first','read')});select.value='read';await admin.updateStatus(select);assert.equal(select.dataset.savedStatus,'read');assert.equal(admin.messages[0].status,'read');
});
