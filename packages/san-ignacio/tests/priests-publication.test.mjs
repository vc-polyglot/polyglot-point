import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {approvedPriestPortraits,planPriestPortraits,publishHostedPriestPortraits} from '../src/review/priests-publication.js';
import {validatePeopleAssets} from '../src/review/people-publication.js';
const references=JSON.parse(fs.readFileSync('src/db/reference-content.json','utf8')).records;

test('Se incluyen los originales seleccionados para el rector y el vicario',()=>{
 assert.equal(approvedPriestPortraits.length,2);assert.doesNotThrow(()=>validatePeopleAssets(approvedPriestPortraits));
 assert.ok(approvedPriestPortraits.find(p=>/Luis/.test(p.name)).fields.image.endsWith('padre-luis-gonzalez-cosio.jpg'));
 assert.ok(approvedPriestPortraits.find(p=>/José de Jesús/.test(p.name)).fields.image.endsWith('jose-de-jesus-rojas-garcia-actual.png'));
});

test('Sólo cambian las dos fotografías y se conservan las fichas y sus revisiones',()=>{
 const original=JSON.stringify(references),plan=planPriestPortraits(references,[]);
 assert.equal(plan.additions.length,0);assert.equal(plan.updates.length,2);assert.equal(JSON.stringify(references),original);
 for(const {record,expectedVersion}of plan.updates){
  const previous=references.find(p=>p.id===record.id);
  assert.equal(record.version,expectedVersion+1);assert.deepEqual(record.history[0].draft,previous.draft);
  for(const key of ['title','role','body','order'])assert.equal(record.published[key],previous.published[key]);
 }
 const applied=references.map(p=>plan.updates.find(u=>u.record.id===p.id)?.record||p);
 assert.equal(planPriestPortraits(applied,[]).updates.length,0);
});

test('La publicación se ejecuta una sola vez y verifica el respaldo antes de modificar',async()=>{
 const calls=[];let snapshot,applied=false;
 const client={async query(sql,values=[]){calls.push(sql);
  if(sql.startsWith('SELECT id,checksum'))return {rowCount:applied?1:0,rows:applied?[{imported_count:2}]:[]};
  if(sql.startsWith('SELECT id,record,version'))return {rows:references.map(record=>({id:record.id,record,version:record.version}))};
  if(sql.startsWith('INSERT INTO san_ignacio.site_migration_backups'))snapshot=JSON.parse(values[2]);
  if(sql.startsWith('SELECT snapshot'))return {rows:[{snapshot}]};
  if(sql.startsWith('UPDATE san_ignacio.site_documents'))assert.ok(snapshot);
  return {rowCount:1,rows:[]};
 }};
 const result=await publishHostedPriestPortraits(client);assert.equal(result.orderCorrections,2);assert.equal(calls.at(-1),'COMMIT');
 const changes=calls.filter(sql=>sql.startsWith('UPDATE san_ignacio.site_documents')).length;
 applied=true;assert.equal((await publishHostedPriestPortraits(client)).alreadyApplied,true);
 assert.equal(calls.filter(sql=>sql.startsWith('UPDATE san_ignacio.site_documents')).length,changes);
});
