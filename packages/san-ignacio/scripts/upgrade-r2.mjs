import fs from 'node:fs';
import {openStore,allDocuments,getDocument,saveDocument,closeStore} from '../src/review/store.js';
import {local,dataPath} from '../src/review/config.js';
if(!local)throw new Error('Estas correcciones se aplican exclusivamente a la revisión local.');
if(fs.existsSync(dataPath+'/upgrade-r2.json')){console.log('Correcciones r2 ya aplicadas; se conservan las ediciones posteriores.');}else{
await openStore();let updated=0;
try{
 const now=()=>new Date().toISOString();const actor='Correcciones locales solicitadas · r2';
 async function patch(doc,fn){const next=structuredClone(doc);fn(next.draft);if(next.published)fn(next.published);if(JSON.stringify(next)===JSON.stringify(doc))return;const {history,...previous}=doc;next.history=[{...previous,at:now(),action:'correccion-r2',actor},...history].slice(0,40);next.version++;next.updatedAt=now();next.updatedBy=actor;await saveDocument(next,doc.version);updated++;}
 async function add(id,type,data,published=false){if(await getDocument(id))return;const stamp=now();await saveDocument({id,type,draft:data,published:published?structuredClone(data):null,version:1,history:[],createdAt:stamp,updatedAt:stamp,updatedBy:actor});updated++;}
 let docs=await allDocuments();
 const pc=docs.find(d=>d.id==='catecismo');if(pc)await patch(pc,data=>{data.category='catecismo';data.order=1;if(data.title==='Catecismo')data.title='Primera Comunión';if(data.time){data.time=data.time.replace(/Jueves/g,'jueves');if(/\d:\d\d/.test(data.time)&&! /\bh\b/.test(data.time))data.time+=' h';}});
 const confirmation=docs.find(d=>d.id==='sacrament-confirmacion');
 await add('catecismo-confirmacion','program',{title:'Confirmación',category:'catecismo',label:'Preparación para la Confirmación',body:confirmation?.published?.body||confirmation?.draft?.body||'',detail:'Consulta con la oficina las fechas y el horario del curso de preparación.',order:2,source:'src/db/editorial-schema.js: sacrament-confirmacion. Se documenta preparación; no se confirma un horario periódico de Catecismo.'},!!(confirmation?.published?.body||confirmation?.draft?.body));
 for(const doc of docs.filter(d=>d.type==='staff'))await patch(doc,data=>{if(data.order>0&&data.order<10)data.order*=10;});
 docs=await allDocuments();
 const existing=docs.find(d=>d.type==='staff'&&d.draft.title.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()==='victor contreras');
 if(existing)await patch(existing,data=>{data.role='Organista';data.order=45;});else await add('victor-contreras-organista','staff',{title:'Víctor Contreras',role:'Organista',body:'',order:45,source:'Nombre y cargo proporcionados expresamente por el usuario en la continuación del rediseño.'},true);
 for(const [id,title,category]of [['musica-liturgica','Música litúrgica','liturgia'],['organo-del-templo','El órgano','organo'],['musica-celebraciones','Música para celebraciones','servicios']])await add(id,'music',{title,category,body:'',order:10,source:'Apartado preparado; contenido institucional pendiente. No publicado.'});
 fs.writeFileSync(dataPath+'/upgrade-r2.json',JSON.stringify({appliedAt:new Date().toISOString(),updated}));
 console.log('Registros nuevos o corregidos:',updated);
}finally{await closeStore();}

}
