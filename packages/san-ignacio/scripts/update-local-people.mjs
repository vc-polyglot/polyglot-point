import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {local,root,dataPath} from '../src/review/config.js';

if(!local)throw new Error('Esta actualización sólo está permitida en la copia local.');
const [victorPhoto,vicarPhoto]=process.argv.slice(2);
if(!victorPhoto||!vicarPhoto)throw new Error('Indica las dos fotografías: Víctor Contreras y José de Jesús.');
const portraits=[
 {id:'victor-contreras-organista',source:victorPhoto,file:'victor-contreras-organo.png',alt:'Víctor Contreras frente a un órgano de tubos'},
 {id:'persona-2',source:vicarPhoto,file:'jose-de-jesus-rojas-garcia.png',alt:'P. José de Jesús Rojas García, S.J., vicario'}
];
const metadataFile=path.join(root,'assets/image-metadata.json');
const metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8'));
for(const portrait of portraits){
 const bytes=fs.readFileSync(portrait.source);
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Se esperaba el PNG original proporcionado.');
 const target=path.join(root,'assets/images',portrait.file);
 if(fs.existsSync(target)){
  if(!fs.readFileSync(target).equals(bytes))throw new Error('Ya existe una fotografía diferente: '+portrait.file);
 }else fs.writeFileSync(target,bytes,{flag:'wx'});
 metadata[portrait.file]={bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
fs.writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');

const patches=new Map(portraits.map(p=>[p.id,{image:'/assets/images/'+p.file,alt:p.alt}]));
patches.set('persona-4',{order:30});
patches.set('persona-3',{order:40});
const db=new DatabaseSync(path.join(dataPath,'site.sqlite'));
let updated=0;
try{
 db.exec('BEGIN IMMEDIATE');
 for(const [id,patch]of patches){
  const row=db.prepare('SELECT record FROM documents WHERE id=?').get(id);
  if(!row)throw new Error('No se encontró la persona: '+id);
  const previous=JSON.parse(row.record),next=structuredClone(previous);
  if(previous.type!=='staff')throw new Error('El registro no corresponde al directorio: '+id);
  for(const field of ['draft','published'])if(next[field])Object.assign(next[field],patch);
  if(JSON.stringify(previous)===JSON.stringify(next))continue;
  const {history,...snapshot}=previous,now=new Date().toISOString();
  next.history=[{...snapshot,action:'local-people-update',at:now,actor:'Cambios de Nosotros solicitados por el usuario'},...(history||[])].slice(0,40);
  next.version++;next.updatedAt=now;next.updatedBy='Cambios de Nosotros solicitados por el usuario';
  const result=db.prepare('UPDATE documents SET record=?,version=? WHERE id=? AND version=?').run(JSON.stringify(next),next.version,id,previous.version);
  if(result.changes!==1)throw new Error('Se detectó una edición concurrente: '+id);
  updated++;
 }
 db.exec('COMMIT');
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
console.log(`${updated} fichas locales actualizadas; originales y revisiones anteriores conservados.`);
