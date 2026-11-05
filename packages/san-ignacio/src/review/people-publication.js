import fs from 'node:fs';
import crypto from 'node:crypto';
import {personIdentity} from './deploy-plan.js';
import {recoverHostedCollections} from './deploy-migration.js';

export const peoplePublicationMigration='staff-portraits-order-20261104-v1';
export const approvedPeople=JSON.parse(fs.readFileSync(new URL('./data/approved-people.json',import.meta.url),'utf8')).people;

export function validatePeopleAssets(){
 for(const person of approvedPeople){
  if(!person.fields.image)continue;
  if(!/^\/assets\/images\/[a-z0-9-]+\.png$/.test(person.fields.image))throw new Error('Ruta de retrato no válida.');
  const file=new URL('../../'+person.fields.image.slice(1),import.meta.url);
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(hash!==person.sha256)throw new Error('La fotografía aprobada no coincide: '+person.name);
 }
}

export function planPeoplePublication(existing,_references,stamp=new Date().toISOString()){
 const updates=[];
 for(const person of approvedPeople){
  const identity=personIdentity(person.name);
  const matches=existing.filter(record=>record.type==='staff'&&[record.draft,record.published].some(data=>data&&personIdentity(data.title)===identity));
  if(matches.length!==1)throw new Error('No se identificó una ficha única para '+person.name+'. No se asignará la fotografía a otra persona.');
  const previous=matches[0];if(previous.archived)continue;
  const record=structuredClone(previous);
  for(const key of ['draft','published'])if(record[key]&&personIdentity(record[key].title)===identity)Object.assign(record[key],person.fields);
  if(JSON.stringify(record)===JSON.stringify(previous))continue;
  const {history,...snapshot}=previous;
  record.history=[{...structuredClone(snapshot),action:'publicar-fotos-y-orden',at:stamp,actor:'Cambios de Nosotros aprobados por el usuario'},...(history||[])].slice(0,40);
  record.version++;record.updatedAt=stamp;record.updatedBy='Cambios de Nosotros aprobados por el usuario';
  updates.push({record,expectedVersion:previous.version});
 }
 return {additions:[],updates};
}

export async function publishHostedPeople(client){
 validatePeopleAssets();
 const result=await recoverHostedCollections(client,[],{migrationId:peoplePublicationMigration,planner:planPeoplePublication,format:'san-ignacio-staff-portraits-order-v1'});
 return {alreadyApplied:result.alreadyApplied,updatedPeople:result.orderCorrections??result.changed,checksum:result.checksum};
}
