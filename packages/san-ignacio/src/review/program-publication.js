import {recoverHostedCollections} from './deploy-migration.js';

export function planProgramAlbums(existing,_references,stamp=new Date().toISOString()){
 const matches=existing.filter(record=>record.type==='program'&&[record.draft,record.published].some(data=>/adultos?.*mayores?/i.test(data?.title||'')));
 if(matches.length)return {additions:[],updates:[]};
 if(existing.some(record=>record.id==='adultos-mayores'))throw new Error('El identificador de Adultos Mayores ya se utiliza; se conserva el contenido existente.');
 const data={title:'Grupo de Adultos Mayores',label:'Comunidad',category:'comunidad',body:'',order:4,source:'Grupo y fotografías proporcionados por el usuario.'};
 return {additions:[{id:'adultos-mayores',type:'program',draft:data,published:structuredClone(data),version:1,history:[],createdAt:stamp,updatedAt:stamp,updatedBy:'Galerías de grupos aprobadas por el usuario'}],updates:[]};
}

export function publishHostedProgramAlbums(client){
 return recoverHostedCollections(client,[],{migrationId:'community-photo-albums-20261104-v1',planner:planProgramAlbums,format:'san-ignacio-community-photo-albums-v1'});
}
