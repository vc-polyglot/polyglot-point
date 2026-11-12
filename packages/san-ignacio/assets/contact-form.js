import {ui} from './i18n.js?v=1';
export function setupContactForm(doc=document,win=window){
 const form=doc.querySelector('#contact-form');if(!form)return;
 form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
 form.addEventListener('invalid',event=>{const field=event.target;field.setCustomValidity(ui(field.validity.valueMissing?'Completa este campo.':field.type==='email'?'Introduce un correo electrónico válido.':'Revisa el formato de este campo.',doc));},true);
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button[type=submit]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent=ui('Enviando mensaje…',doc);
  try{const response=await win.fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo enviar el mensaje.');form.reset();status.textContent=ui('Tu mensaje fue recibido. Gracias por escribirnos.',doc);}
  catch(error){status.textContent=ui(error.name==='TypeError'?'No se pudo enviar el mensaje.':error.message,doc);}finally{button.disabled=false;}
 });
}
