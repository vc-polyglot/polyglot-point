import fs from 'node:fs/promises';
import path from 'node:path';
import * as store from './store.js';
import {assetDeletionId,canonicalAssetURL,assetReferences,deletedAssetURLs,withoutDeletedAssets} from './asset-state.js';
import {imageCatalog} from './image-library.js';
import {initialTracks,readPlaylist,playlistRecord} from './music-playlist.js';
import {withEditorialDefaults,withAlbumDefaults} from './editorial-defaults.js';
import {renderPage,routes} from './pages.js';
const fail=(message,status=409)=>{const error=new Error(message);error.status=status;throw error;};
export function assetUsage(documents,url,{kind='image'}={}){
 const key=canonicalAssetURL(url),uses=new Set(),all=withEditorialDefaults(documents).map(withAlbumDefaults);
 for(const doc of all){if(['media','audio','playlist','asset-deletion'].includes(doc.type))continue;if([doc.draft,doc.published].some(data=>assetReferences(data).has(key)))uses.add(doc.draft?.title||doc.published?.title||doc.id);}
 if(kind==='image'&&!uses.size){
  const deleted=deletedAssetURLs(all),published=all.filter(doc=>doc.published&&!doc.archived).map(doc=>({id:doc.id,type:doc.type,...withoutDeletedAssets(doc.published,deleted)})).filter(doc=>doc.type!=='gallery'||doc.image);
  for(const [route,[title]]of Object.entries(routes)){const html=renderPage(route,published,{origin:'https://asset-usage.invalid'});if([...html.matchAll(/(?:src|data-image|content)="([^"]+)"/g)].some(match=>canonicalAssetURL(match[1].replace('https://asset-usage.invalid','').replaceAll('&amp;','&'))===key))uses.add('Diseño del sitio: '+title);}
 }
 return [...uses];
}
export function assetStorage(url,kind,{cloudName=process.env.CLOUDINARY_CLOUD_NAME}={}){
 if(url.startsWith('/assets/'+(kind==='audio'?'audio/':'images/')))return {type:'bundled'};
 if(/^\/uploads\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp|mp3)$/i.test(url))return {type:'local',filename:url.slice('/uploads/'.length)};
 let parsed;try{parsed=new URL(url);}catch{fail('No se reconoce el almacenamiento de este archivo.',400);}
 const parts=parsed.pathname.split('/').filter(Boolean),resourceType=kind==='audio'?'video':'image',folder=parts.indexOf('san-ignacio'),prefix='san-ignacio/'+(kind==='audio'?'audio/':'images/');
 if(parsed.protocol!=='https:'||parsed.hostname!=='res.cloudinary.com'||!cloudName||parts[0]!==cloudName||parts[1]!==resourceType||parts[2]!=='upload'||folder<3)fail('Este archivo externo no pertenece al almacenamiento administrado por el sitio.',400);
 const publicId=decodeURIComponent(parts.slice(folder).join('/')).replace(/\.[^.\/]+$/,'');if(!publicId.startsWith(prefix)||!/^san-ignacio\/(?:images|audio)\/[a-zA-Z0-9_-]+$/.test(publicId))fail('No se reconoce el identificador del archivo.',400);
 return {type:'cloudinary',publicId,resourceType};
}
function deletionRecord(url,kind,storage,user,title){const now=new Date().toISOString();return {id:assetDeletionId(url),type:'asset-deletion',draft:{url,kind,title,storage},published:null,deletedAt:now,purge:{state:'pending',attempts:0},version:1,history:[],createdAt:now,updatedAt:now,updatedBy:user.name};}
const purging=new Map();
export function purgeAsset(id,options={}){
 if(purging.has(id))return purging.get(id);const operation=performPurge(id,options).finally(()=>purging.delete(id));purging.set(id,operation);return operation;
}
async function performPurge(id,{dataPath,cloudinaryClient}={}){
 const record=await store.getDocument(id);if(!record||record.type!=='asset-deletion'||record.purge.state==='done')return true;
 try{
  const storage=record.draft.storage;
  if(storage.type==='local'){
   const directory=path.resolve(dataPath,'uploads'),target=path.resolve(directory,storage.filename);if(path.dirname(target)!==directory||!/^\w[\w.-]*$/.test(storage.filename))throw Error('Ruta de borrado inválida.');
   await fs.rm(target,{force:true});
  }else if(storage.type==='cloudinary'){
   let client=cloudinaryClient;if(!client){if(!process.env.CLOUDINARY_CLOUD_NAME||!process.env.CLOUDINARY_API_KEY||!process.env.CLOUDINARY_API_SECRET)throw Error('Almacenamiento remoto no configurado.');const {v2}=await import('cloudinary');v2.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});client=v2;}
   const result=await client.uploader.destroy(storage.publicId,{resource_type:storage.resourceType,invalidate:true,timeout:15000});if(!['ok','not found'].includes(result.result))throw Error('No se confirmó el borrado remoto.');
  }else if(storage.type!=='bundled')throw Error('Almacenamiento desconocido.');
  await store.documentTransaction(async()=>{const latest=await store.getDocument(id);await store.saveDocument({...latest,purge:{state:'done',attempts:latest.purge.attempts+1},version:latest.version+1,updatedAt:new Date().toISOString()},latest.version);});return true;
 }catch{
  await store.documentTransaction(async()=>{const latest=await store.getDocument(id);if(latest.purge.state==='done')return;await store.saveDocument({...latest,purge:{state:'pending',attempts:latest.purge.attempts+1},version:latest.version+1,updatedAt:new Date().toISOString()},latest.version);});return false;
 }
}
export async function deleteImage(input,user,{root,dataPath,cloudinaryClient}={}){
 const result=await store.documentTransaction(async()=>{
  if(!input||typeof input.url!=='string'||!Number.isSafeInteger(input.version)||input.version<0)fail('Selecciona una imagen válida.',400);
  const documents=await store.allDocuments(),existing=documents.find(doc=>doc.id===assetDeletionId(input.url));if(existing)return {record:existing};
  const image=imageCatalog(root,documents).find(item=>item.url===input.url);if(!image)fail('La imagen ya no está en el archivo.',404);if(image.version!==input.version)fail('La imagen cambió. Actualiza el archivo antes de borrarla.');
  const uses=assetUsage(documents,image.url);if(uses.length)fail('Esta imagen se usa en: '+uses.slice(0,5).join('; ')+'. Quita primero la imagen de esas publicaciones antes de borrarla.');
  const record=deletionRecord(image.url,'image',assetStorage(image.url,'image'),user,image.title);await store.saveDocument(record);return {record};
 });
 const purged=await purgeAsset(result.record.id,{dataPath,cloudinaryClient});return {deleted:true,url:result.record.draft.url,pending:!purged};
}
export async function deleteTrack(input,user,{dataPath,cloudinaryClient}={}){
 const result=await store.documentTransaction(async()=>{
  if(!input||typeof input.id!=='string'||!Number.isSafeInteger(input.version)||input.version<0)fail('Selecciona una canción válida.',400);
  const documents=await store.allDocuments(),playlist=readPlaylist(documents);if(input.version!==playlist.version)fail('La lista cambió. Vuelve a abrir Música antes de borrar la canción.');
  const track=playlist.tracks.find(track=>track.id===input.id)||initialTracks().find(track=>track.id===input.id)||documents.filter(doc=>doc.type==='audio').map(doc=>({id:doc.id,...doc.draft})).find(track=>track.id===input.id);if(!track)fail('La canción ya no está en el archivo.',404);
  const existing=documents.find(doc=>doc.id===assetDeletionId(track.src));if(existing)return {record:existing,playlist};
  const uses=assetUsage(documents,track.src,{kind:'audio'});if(uses.length)fail('Esta canción se usa en: '+uses.join('; ')+'. Quita primero esos enlaces.');
  const record=deletionRecord(track.src,'audio',assetStorage(track.src,'audio'),user,track.title),updated=playlistRecord({version:playlist.version,tracks:playlist.tracks.filter(item=>item.id!==track.id)},documents,user);
  await store.saveDocument(updated,playlist.version);await store.saveDocument(record);return {record,playlist:readPlaylist([updated])};
 });
 const purged=await purgeAsset(result.record.id,{dataPath,cloudinaryClient});return {deleted:true,id:input.id,playlist:result.playlist,pending:!purged};
}
export async function resumeAssetDeletions(options={}){const pending=(await store.allDocuments()).filter(doc=>doc.type==='asset-deletion'&&doc.purge?.state==='pending');for(const doc of pending)await purgeAsset(doc.id,options);}
