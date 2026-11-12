import crypto from 'node:crypto';
export function canonicalAssetURL(value){
 if(typeof value!=='string')return '';
 if(value.startsWith('/'))return value.split(/[?#]/)[0].replace(/-640(\.(?:jpg|jpeg|png|webp))$/i,'-1280$1');
 try{const url=new URL(value);if(['iglesiasanignaciopolanco.mx','www.iglesiasanignaciopolanco.mx'].includes(url.hostname))return canonicalAssetURL(url.pathname);if(url.hostname==='res.cloudinary.com'){const parts=url.pathname.split('/').filter(Boolean),folder=parts.indexOf('san-ignacio');if(['image','video'].includes(parts[1])&&parts[2]==='upload'&&folder>=3)return 'cloudinary:'+parts[0]+':'+parts[1]+':'+parts.slice(folder).join('/').replace(/\.[^.\/]+$/,'');}url.search='';url.hash='';return url.href;}catch{return value;}
}
export const assetDeletionId=url=>'deleted-asset-'+crypto.createHash('sha256').update(canonicalAssetURL(url)).digest('hex').slice(0,40);
export const deletedAssetURLs=documents=>new Set(documents.filter(doc=>doc.type==='asset-deletion'&&doc.deletedAt).map(doc=>canonicalAssetURL(doc.draft.url)));
export function assetReferences(data){
 const found=new Set();function visit(value,key){if(typeof value==='string'&&['image','cover','src','url'].includes(key))found.add(canonicalAssetURL(value));else if(Array.isArray(value))value.forEach(item=>visit(item,key));else if(value&&typeof value==='object')for(const [name,item]of Object.entries(value))visit(item,name);}visit(data,'');return found;
}
export function assertNoDeletedReferences(record,documents){
 if(record.type==='asset-deletion')return;
 const deleted=deletedAssetURLs(documents);if([...assetReferences({draft:record.draft,published:record.published})].some(url=>deleted.has(url))){const error=new Error('La publicación contiene un archivo borrado. Actualiza sus imágenes o su lista de música antes de guardar.');error.status=409;throw error;}
}
export function withoutDeletedAssets(data,deleted){
 const clean={...data};for(const key of ['image','cover','url'])if(deleted.has(canonicalAssetURL(clean[key])))clean[key]='';
 if(Array.isArray(clean.photos))clean.photos=clean.photos.filter(photo=>!deleted.has(canonicalAssetURL(photo.image)));
 if(Array.isArray(clean.tracks))clean.tracks=clean.tracks.filter(track=>!deleted.has(canonicalAssetURL(track.src)));
 return clean;
}
