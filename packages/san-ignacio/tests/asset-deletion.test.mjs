import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {canonicalAssetURL,assetDeletionId,assertNoDeletedReferences} from '../src/review/asset-state.js';
import {initialTracks,readPlaylist,playlistRecord} from '../src/review/music-playlist.js';
import {imageCatalog} from '../src/review/image-library.js';

test('El borrado conserva su estado, protege referencias y limpia sólo archivos administrados',async t=>{
 const base=path.resolve('.local');await fs.mkdir(base,{recursive:true});const directory=await fs.mkdtemp(path.join(base,'delete-qa-'));
 process.env.LOCAL_REVIEW_MODE='1';process.env.NODE_ENV='test';process.env.LOCAL_DATA_PATH=directory;process.env.SESSION_SECRET='delete-qa-session-secret-with-more-than-32-characters';process.env.CLOUDINARY_CLOUD_NAME='delete-qa';
 const store=await import('../src/review/store.js'),{deleteImage,deleteTrack,assetUsage,assetStorage,resumeAssetDeletions}=await import('../src/review/asset-deletion.js');
 await fs.mkdir(path.join(directory,'assets/images'),{recursive:true});await fs.mkdir(path.join(directory,'uploads'));
 await store.openStore();const user={name:'QA'},options={root:directory,dataPath:directory};
 const record=(id,type,draft)=>({id,type,draft,published:null,version:1,history:[],createdAt:new Date().toISOString()});
 try{
  await t.test('Se bloquean archivos externos y las rutas que salen del archivo administrado',()=>{
   for(const url of ['/uploads/../secret.mp3','/uploads/test.txt','https://example.invalid/photo.webp','https://res.cloudinary.com/other/image/upload/san-ignacio/images/qa.webp','https://res.cloudinary.com/delete-qa/image/upload/other/qa.webp'])assert.throws(()=>assetStorage(url,'image'),{status:400});
   assert.deepEqual(assetStorage('https://res.cloudinary.com/delete-qa/video/upload/v1/san-ignacio/audio/qa.mp3','audio'),{type:'cloudinary',publicId:'san-ignacio/audio/qa',resourceType:'video'});
   assert.equal(canonicalAssetURL('/assets/images/foto-640.jpg?x=1'),canonicalAssetURL('/assets/images/foto-1280.jpg'));
   assert.equal(canonicalAssetURL('https://iglesiasanignaciopolanco.mx/assets/images/foto-1280.jpg'),canonicalAssetURL('/assets/images/foto-1280.jpg'));
   assert.equal(canonicalAssetURL('https://res.cloudinary.com/delete-qa/image/upload/w_640/v2/san-ignacio/images/qa.webp'),canonicalAssetURL('https://res.cloudinary.com/delete-qa/image/upload/v1/san-ignacio/images/qa.jpg'));
  });
  await t.test('Una imagen en borrador o en el diseño no se puede borrar',async()=>{
   const url='/uploads/used.jpg';await fs.writeFile(path.join(directory,'uploads/used.jpg'),'qa');await store.saveDocument(record('media-used','media',{url,title:'En uso',collection:'photograph'}));await store.saveDocument(record('post-used','notice',{title:'Aviso QA',photos:[{image:url,alt:'QA'}]}));
   await assert.rejects(deleteImage({url,version:1},user,options),error=>error.status===409&&/Aviso QA/.test(error.message));assert.equal(await fs.readFile(path.join(directory,'uploads/used.jpg'),'utf8'),'qa');
   assert.ok(assetUsage([],'/assets/images/hero-vitrales-08-1280.jpg').some(label=>label.startsWith('Diseño del sitio:')));
   assert.ok(assetUsage([],'/assets/images/hero-interior-03-1280.jpg').some(label=>label.startsWith('Diseño del sitio:')));
  });
  await t.test('El borrado elimina un archivo local y no deja volver a referenciarlo',async()=>{
   const url='/uploads/unused.jpg';await fs.writeFile(path.join(directory,'uploads/unused.jpg'),'qa');await store.saveDocument(record('media-unused','media',{url,title:'Sin uso',collection:'material'}));
   await assert.rejects(deleteImage({url,version:0},user,options),{status:409});assert.equal((await fs.stat(path.join(directory,'uploads/unused.jpg'))).isFile(),true);
   assert.equal((await deleteImage({url,version:1},user,options)).pending,false);await assert.rejects(fs.stat(path.join(directory,'uploads/unused.jpg')),{code:'ENOENT'});assert.equal(imageCatalog(directory,await store.allDocuments()).some(image=>image.url===url),false);
   await assert.rejects(store.saveDocument(record('late-post','notice',{title:'Viejo formulario',photos:[{image:url}]})),{status:409});
   const tombstone=await store.getDocument(assetDeletionId(url));assert.equal(tombstone.purge.state,'done');assert.throws(()=>assertNoDeletedReferences(record('media-again','media',{url}),[tombstone]),{status:409});
   assert.equal((await deleteImage({url,version:1},user,options)).deleted,true);
  });
  await t.test('Los archivos incluidos en código no reaparecen y sus originales se conservan',async()=>{
   const url='/assets/images/unused-1280.jpg';await fs.writeFile(path.join(directory,'assets/images/unused-1280.jpg'),'qa');await fs.writeFile(path.join(directory,'assets/images/unused-640.jpg'),'qa');
   assert.equal((await deleteImage({url,version:0},user,options)).deleted,true);assert.equal(imageCatalog(directory,await store.allDocuments()).some(image=>image.url.includes('unused')),false);assert.equal(await fs.readFile(path.join(directory,'assets/images/unused-1280.jpg'),'utf8'),'qa');
  });
  await t.test('Cloudinary recibe el tipo correcto y se reintenta una limpieza pendiente',async()=>{
   const url='https://res.cloudinary.com/delete-qa/image/upload/v1/san-ignacio/images/qa.webp';await store.saveDocument(record('media-cloud','media',{url,title:'Remota',collection:'photograph'}));let calls=0;
   const cloudinaryClient={uploader:{async destroy(id,config){calls++;assert.equal(id,'san-ignacio/images/qa');assert.equal(config.resource_type,'image');assert.equal(config.invalidate,true);if(calls===1)throw Error('Temporal');return {result:'ok'};}}};
   const pending=await deleteImage({url,version:1},user,{...options,cloudinaryClient});assert.equal(pending.pending,true);assert.equal(imageCatalog(directory,await store.allDocuments()).some(image=>image.url===url),false);
   await resumeAssetDeletions({...options,cloudinaryClient});assert.equal(calls,2);assert.equal((await store.getDocument(assetDeletionId(url))).purge.state,'done');
  });
  await t.test('Borrar música actualiza sólo la lista guardada, rechaza conflictos y no resucita pistas',async()=>{
   const original=initialTracks(),track=original[1];const result=await deleteTrack({id:track.id,version:0},user,options);assert.equal(result.playlist.version,1);assert.equal(result.playlist.tracks.length,3);assert.ok(!result.playlist.tracks.some(item=>item.id===track.id));
   await assert.rejects(deleteTrack({id:original[0].id,version:0},user,options),{status:409});assert.equal(readPlaylist(await store.allDocuments()).tracks.length,3);
   const documents=await store.allDocuments();assert.throws(()=>playlistRecord({version:1,tracks:original},documents,user),{status:400});
   const url='/uploads/audio-unpublished.mp3';await fs.writeFile(path.join(directory,'uploads/audio-unpublished.mp3'),'qa');await store.saveDocument(record('audio-new','audio',{src:url,title:'Sin publicar',detail:'',enabled:true}));
   const deleted=await deleteTrack({id:'audio-new',version:1},user,options);assert.deepEqual(deleted.playlist.tracks,result.playlist.tracks);assert.equal(deleted.playlist.version,2);await assert.rejects(fs.stat(path.join(directory,'uploads/audio-unpublished.mp3')),{code:'ENOENT'});
   await store.closeStore();await store.openStore();assert.equal(readPlaylist(await store.allDocuments()).tracks.length,3);assert.ok(!readPlaylist(await store.allDocuments()).tracks.some(item=>item.id===track.id));
  });
  await t.test('Un cambio concurrente no puede guardar referencias después del borrado',async()=>{
   const url='/uploads/concurrent.jpg';await fs.writeFile(path.join(directory,'uploads/concurrent.jpg'),'qa');await store.saveDocument(record('media-concurrent','media',{url,title:'Concurrente',collection:'photograph'}));
   const [deletion,publication]=await Promise.allSettled([deleteImage({url,version:1},user,options),store.saveDocument(record('concurrent-post','notice',{title:'Concurrente',image:url}))]);
   assert.equal(deletion.status,'fulfilled');assert.equal(publication.status,'rejected');assert.equal(publication.reason.status,409);assert.equal(await store.getDocument('concurrent-post'),null);
  });
  await t.test('Borrar un audio remoto usa video y conserva las otras pistas',async()=>{
   const src='https://res.cloudinary.com/delete-qa/video/upload/v1/san-ignacio/audio/audio-remote.mp3';await store.saveDocument(record('audio-remote','audio',{src,title:'Remota',detail:'',enabled:true}));const before=readPlaylist(await store.allDocuments());let calls=0;
   const cloudinaryClient={uploader:{async destroy(id,config){calls++;assert.equal(id,'san-ignacio/audio/audio-remote');assert.equal(config.resource_type,'video');assert.equal(config.invalidate,true);return {result:'ok'};}}};
   const result=await deleteTrack({id:'audio-remote',version:before.version},user,{...options,cloudinaryClient});assert.equal(calls,1);assert.equal(result.pending,false);assert.deepEqual(result.playlist.tracks,before.tracks);
  });
 }finally{await store.closeStore();}
});
