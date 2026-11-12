import {musicTracks} from '../../assets/music-tracks.js';
import {deletedAssetURLs,canonicalAssetURL} from './asset-state.js';

export const playlistId='reproductor-musica';
export const initialTracks=()=>musicTracks.map(track=>({id:'initial-'+track.src.split('/').at(-1).replace('.mp3',''),...track,enabled:true}));
export function readPlaylist(documents){
 const record=documents.find(doc=>doc.id===playlistId&&doc.type==='playlist');
 const deleted=deletedAssetURLs(documents);return {version:record?.version||0,tracks:structuredClone(record?.published?.tracks??initialTracks()).filter(track=>!deleted.has(canonicalAssetURL(track.src)))};
}
export function publicPlaylist(documents){
 const record=documents.find(doc=>doc.id===playlistId&&doc.type==='playlist');
 const deleted=deletedAssetURLs(documents);return (record?record.tracks:initialTracks()).filter(track=>track.enabled&&!deleted.has(canonicalAssetURL(track.src)));
}
function invalid(message){const error=new Error(message);error.status=400;throw error;}
export function playlistRecord(input,documents,user){
 if(!input||!Number.isSafeInteger(input.version)||input.version<0||!Array.isArray(input.tracks)||input.tracks.length>100)invalid('La lista admite hasta 100 pistas. Actualiza la sección e intenta de nuevo.');
 const previous=documents.find(doc=>doc.id===playlistId),version=previous?.version||0;
 if(input.version!==version){const error=new Error('La lista cambió en otra sesión. Vuelve a abrir Música antes de guardar.');error.status=409;throw error;}
 const deleted=deletedAssetURLs(documents),catalog=new Map([...initialTracks(),...documents.filter(doc=>doc.type==='audio').map(doc=>({id:doc.id,...doc.draft}))].filter(track=>!deleted.has(canonicalAssetURL(track.src))).map(track=>[track.id,track.src]));
 const ids=new Set();const tracks=input.tracks.map(track=>{
  if(!track||typeof track!=='object'||!catalog.has(track.id)||catalog.get(track.id)!==track.src||ids.has(track.id))invalid('Elige una grabación guardada en Música, sin repetirla.');
  ids.add(track.id);
  if(typeof track.title!=='string'||!track.title.trim()||track.title.length>240||typeof track.detail!=='string'||track.detail.length>500||typeof track.enabled!=='boolean')invalid('Cada pista necesita un título de hasta 240 caracteres y datos válidos.');
  return {id:track.id,src:track.src,title:track.title.trim(),detail:track.detail.trim(),enabled:track.enabled};
 });
 const now=new Date().toISOString(),data={title:'Música del reproductor',tracks};
 return {id:playlistId,type:'playlist',draft:data,published:structuredClone(data),version:version+1,history:previous?[{published:previous.published,version:previous.version,at:now,actor:user.name},...(previous.history||[])].slice(0,40):[],createdAt:previous?.createdAt||now,updatedAt:now,updatedBy:user.name};
}
