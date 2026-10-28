import crypto from 'node:crypto';
import * as store from './store.js';

export const types = ['schedule','content','program','staff','event','gallery','music','notice','settings'];
const short = (value, max=240) => String(value??'').trim().slice(0,max);
const safeId = value => /^[a-z0-9][a-z0-9-]{0,100}$/.test(value);
export function validateData(type, data) {
  if (!types.includes(type) || !data || typeof data !== 'object' || Array.isArray(data)) bad('Contenido no válido.');
  const allowed = ['title','body','summary','label','day','time','detail','role','period','startsAt','endsAt','location','image','alt','url','email','phone','address','office','facebook','category','bank','account','clabe','holder','source'];
  const result = { order: Math.max(0,Math.min(9999,Number(data.order)||0)) };
  for (const key of allowed) if (data[key] !== undefined) result[key]=short(data[key],key==='body'?30000:key==='summary'?1200:800);
  if (!result.title || result.title.length>240) bad('Escriba un título de hasta 240 caracteres.');
  if (type==='schedule' && (!result.day || !result.time)) bad('El horario requiere día y hora.');
  if(type==='gallery'&&!result.image) bad('Selecciona una imagen para la galería.');
  if(type==='staff'&&!result.role) bad('Escribe el cargo de esta persona.');
  if(type==='content'&&!['liturgy','sacrament','pastoral','spirituality','history','rector','water'].includes(result.category)) bad('Selecciona una sección de contenido válida.');
  if (type==='event') {
    if (!result.startsAt || !Number.isFinite(Date.parse(result.startsAt))) bad('El evento requiere una fecha de inicio válida.');
    if (!/(Z|[+-]\d\d:\d\d)$/.test(result.startsAt)) bad('La fecha debe incluir su zona horaria.');
    if (result.endsAt && (!Number.isFinite(Date.parse(result.endsAt)) || Date.parse(result.endsAt)<Date.parse(result.startsAt))) bad('La fecha final debe ser posterior al inicio.');
  }
  if(type==='notice') for(const field of ['startsAt','endsAt']) if(result[field]&&!Number.isFinite(Date.parse(result[field]))) bad('La vigencia del aviso no es válida.');
  if (result.image && !(/^\/assets\/images\/[a-zA-Z0-9._/-]+$/.test(result.image) || /^\/uploads\/[a-z0-9.-]+$/.test(result.image) || /^https:\/\//.test(result.image))) bad('Seleccione una imagen de la biblioteca o una dirección HTTPS.');
  if (result.image && !result.alt) bad('Describa la imagen para quienes no pueden verla.');
  for (const key of ['url','facebook']) if (result[key] && !/^https:\/\//.test(result[key])) bad('Use una dirección HTTPS.');
  if(result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) bad('Revise el correo electrónico.');
  return result;
}
function bad(message) { const error=new Error(message); error.status=400; throw error; }
export async function changeDocument(input,user) {
  const id = input.id || `${input.type}-${crypto.randomBytes(6).toString('hex')}`;
  if(!safeId(id)) bad('Identificador no válido.');
  const previous=await store.getDocument(id);
  const expected=Number(input.version)||0;
  if(previous && previous.version!==expected) { const error=new Error('Hay cambios más recientes. Recargue antes de guardar.');error.status=409;throw error; }
  if(previous && previous.type!==input.type) bad('No se puede cambiar el tipo de un registro.');
  const action=input.action || 'draft';
  if(!['draft','publish','unpublish','archive','restore','revision'].includes(action)) bad('Acción no válida.');
  if(!previous && !['draft','publish'].includes(action)) bad('El registro no existe.');
  const now=new Date().toISOString();
  let doc=previous ? structuredClone(previous) : {id,type:input.type,draft:null,published:null,version:0,history:[],createdAt:now};
  if(previous) { const { history,...snapshot }=previous; doc.history=[{...snapshot,action,at:now,actor:user.name},...history].slice(0,40); }
  if(action==='revision') {
    const revision=previous.history[Number(input.revision)];
    if(!revision) bad('Revisión no disponible.');
    doc.draft=structuredClone(revision.draft); // restore to draft; publication remains untouched
  } else if(action==='draft'||action==='publish') {
    doc.draft=validateData(doc.type,input.data);
    if(action==='publish') {
      if(doc.archived) bad('Restaure el registro antes de publicarlo.');
      if(id==='donativos'&&(!doc.draft.holder||!doc.draft.bank||!/^\d{18}$/.test(doc.draft.clabe||''))) bad('Los donativos requieren titular, banco y CLABE confirmados de 18 dígitos.');
      if(id==='privacidad'&&!doc.draft.body) bad('Integra el aviso aprobado antes de publicarlo.');
      doc.published=structuredClone(doc.draft);doc.publishedAt=now;
    }
  } else if(action==='unpublish') doc.published=null;
  else if(action==='archive') { doc.archived=true;doc.published=null; }
  else if(action==='restore') doc.archived=false;
  doc.version++;doc.updatedAt=now;doc.updatedBy=user.name;
  return store.saveDocument(doc,expected);
}
export async function publicDocuments() {
  const all=await store.allDocuments();
  return all.filter(d=>!d.archived && d.published && (d.type!=='notice'||((!d.published.startsAt||Date.parse(d.published.startsAt)<=Date.now())&&(!d.published.endsAt||Date.parse(d.published.endsAt)>=Date.now())))).map(d=>({id:d.id,type:d.type,publishedAt:d.publishedAt||d.updatedAt,...d.published})).sort((a,b)=>(a.order||0)-(b.order||0)||a.title.localeCompare(b.title,'es'));
}
