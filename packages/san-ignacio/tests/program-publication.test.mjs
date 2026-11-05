import test from 'node:test';
import assert from 'node:assert/strict';
import {planProgramAlbums} from '../src/review/program-publication.js';

test('La publicación incluye el grupo nuevo sin copiar la base local ni inventar horarios',()=>{
 const plan=planProgramAlbums([]);assert.equal(plan.additions.length,1);
 const group=plan.additions[0];assert.equal(group.id,'adultos-mayores');assert.equal(group.published.title,'Grupo de Adultos Mayores');
 assert.equal(group.published.body,'');assert.equal(group.published.time,undefined);assert.equal(plan.updates.length,0);
});

test('Un grupo existente, archivado o retirado se conserva sin duplicarse',()=>{
 for(const archived of [false,true])for(const published of [null,{title:'Grupo Adultos Mayores'}]){
  const existing=[{id:'grupo-propio',type:'program',archived,published,draft:{title:'Adultos mayores',body:'Edición existente'}}];
  const before=JSON.stringify(existing);assert.equal(planProgramAlbums(existing).additions.length,0);assert.equal(JSON.stringify(existing),before);
 }
});

test('Un identificador ocupado no sobrescribe otro documento',()=>{
 assert.throws(()=>planProgramAlbums([{id:'adultos-mayores',type:'content',draft:{title:'Otro contenido'}}]),/ya se utiliza/);
});
