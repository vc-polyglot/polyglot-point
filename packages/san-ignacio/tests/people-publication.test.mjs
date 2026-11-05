import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {approvedPeople,validatePeopleAssets,planPeoplePublication,publishHostedPeople} from '../src/review/people-publication.js';
const references=JSON.parse(fs.readFileSync('src/db/reference-content.json','utf8')).records;

test('Las cuatro fotos aprobadas existen y coinciden con los originales seleccionados',()=>{
 assert.equal(approvedPeople.filter(person=>person.fields.image).length,4);
 assert.doesNotThrow(validatePeopleAssets);
 assert.ok(approvedPeople.find(p=>p.name==='Víctor Contreras').fields.image.endsWith('victor-contreras-organo.png'));
});

test('Las asignaciones se aplican por identidad, conservando textos, estados y revisiones',()=>{
 const existing=structuredClone(references);const person=existing.find(d=>/Arturo/.test(d.draft.title));person.draft.body='Borrador conservado';person.published.body='Texto publicado conservado';
 const original=JSON.stringify(existing),plan=planPeoplePublication(existing,[]);
 assert.equal(plan.additions.length,0);assert.equal(plan.updates.length,5);assert.equal(JSON.stringify(existing),original);
 const arturo=plan.updates.find(d=>/Arturo/.test(d.record.draft.title));
 assert.equal(arturo.record.draft.body,'Borrador conservado');assert.equal(arturo.record.published.body,'Texto publicado conservado');assert.equal(arturo.record.published.order,40);
 assert.equal(arturo.record.version,arturo.expectedVersion+1);assert.equal(arturo.record.history[0].draft.body,'Borrador conservado');
 assert.equal(plan.updates.find(d=>/Adriana/.test(d.record.draft.title)).record.published.order,30);
 assert.equal(planPeoplePublication(existing.map(d=>plan.updates.find(u=>u.record.id===d.id)?.record||d),[]).updates.length,0);
});

test('No se resucitan fichas archivadas ni se publica un borrador retirado',()=>{
 const existing=structuredClone(references),victor=existing.find(d=>d.draft.title==='Víctor Contreras');victor.published=null;
 const arturo=existing.find(d=>/Arturo/.test(d.draft.title));arturo.archived=true;arturo.published=null;
 const plan=planPeoplePublication(existing,[]);
 assert.equal(plan.updates.find(d=>d.record.id===victor.id).record.published,null);
 assert.ok(!plan.updates.some(d=>d.record.id===arturo.id));
});

test('Una identidad ausente o ambigua cancela el plan sin asignar fotos ajenas',()=>{
 const existing=structuredClone(references);assert.throws(()=>planPeoplePublication(existing.filter(d=>d.draft.title!=='Víctor Contreras'),[]),/ficha única/);
 const duplicate=structuredClone(existing.find(d=>d.draft.title==='Víctor Contreras'));duplicate.id='duplicado';assert.throws(()=>planPeoplePublication([...existing,duplicate],[]),/ficha única/);
});

function client({already=false,fail=false}={}){
 const calls=[];let snapshot;
 return {calls,async query(sql,values=[]){calls.push(sql);
  if(sql.startsWith('SELECT id,checksum'))return {rowCount:already?1:0,rows:already?[{imported_count:5}]:[]};
  if(sql.startsWith('SELECT id,record,version'))return {rows:references.map(d=>({id:d.id,record:d,version:d.version}))};
  if(sql.startsWith('INSERT INTO san_ignacio.site_migration_backups'))snapshot=JSON.parse(values[2]);
  if(sql.startsWith('SELECT snapshot'))return {rows:[{snapshot}]};
  if(sql.startsWith('UPDATE san_ignacio.site_documents')){assert.ok(snapshot);if(fail)throw new Error('Fallo simulado');}
  return {rowCount:1,rows:[]};
 }};
}

test('La actualización alojada verifica respaldo, usa versiones y se ejecuta una sola vez',async()=>{
 const fresh=client();assert.equal((await publishHostedPeople(fresh)).updatedPeople,5);
 assert.equal(fresh.calls.at(-1),'COMMIT');assert.equal(fresh.calls.filter(sql=>sql.startsWith('UPDATE san_ignacio.site_documents')).length,5);
 assert.ok(fresh.calls.some(sql=>sql.includes('version=$4')));
 const repeated=client({already:true});assert.equal((await publishHostedPeople(repeated)).alreadyApplied,true);assert.ok(!repeated.calls.some(sql=>sql.startsWith('UPDATE san_ignacio.site_documents')));
 const failed=client({fail:true});await assert.rejects(publishHostedPeople(failed),/Fallo simulado/);assert.equal(failed.calls.at(-1),'ROLLBACK');
});
