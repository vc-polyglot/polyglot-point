import {eventHasEnded} from './agenda-events.js';

export const sections = [
 ['overview','Inicio','Hoy','Publica las actividades y los avisos de la comunidad.','/'],
 ['event','Agenda','Publicar','Publica una actividad una sola vez: aparecerá en Agenda y entre las próximas actividades de la portada.','/agenda'],
 ['program','Pastoral','Publicar','Grupos, catecismo y actividades: información, horarios y fotografías.','/pastoral'],
 ['music','Música','Publicar','Administra las grabaciones y el orden del reproductor del sitio.','/'],
 ['notice','Avisos y noticias','Publicar','Comunicados y cambios especiales que aparecen en la portada.','/'],
 ['images','Imágenes','Publicar','Fotografías y carteles guardados para tus publicaciones.','/galeria'],
 ['messages','Mensajes','Oficina','Consultas que llegan desde la página. Marca las que ya atendiste.',null],
 ['practical','Horarios y contacto','Oficina','Corrige los horarios habituales y los datos de la oficina.','/contacto']
].map(([id,label,group,description,path])=>({id,label,group,description,path}));

export const recordData = doc => doc.draft || doc.published || {};
export function publicationState(doc, now=Date.now()) {
 if(doc.archived) return ['Retirado','archived'];
 if(!doc.published) return ['Guardado sin publicar','draft'];
 const changed=JSON.stringify(doc.draft)!==JSON.stringify(doc.published);
 if(doc.type==='event' && eventHasEnded(doc.published,now)) return [changed?'Finalizado · cambios guardados':'Finalizado','archived'];
 if(doc.type==='notice' && doc.published.endsAt && Date.parse(doc.published.endsAt)<now) return [changed?'Finalizado · cambios guardados':'Finalizado','archived'];
 if(doc.type==='notice' && doc.published.startsAt && Date.parse(doc.published.startsAt)>now) return [changed?'Programado · cambios guardados':'Programado','draft'];
 return [changed?'Publicado · cambios guardados':'Publicado','published'];
}
