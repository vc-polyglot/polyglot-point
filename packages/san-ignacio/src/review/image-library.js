import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const imageCollections=['photograph','material'];
export const assetId=url=>'asset-'+crypto.createHash('sha256').update(url).digest('hex').slice(0,32);
export function imageCatalog(root,documents){
 const files=fs.readdirSync(path.join(root,'assets/images')).filter(file=>/\.(jpe?g|png|webp)$/i.test(file)),names=new Set(files),items=new Map();
 for(const file of files){if(/-640\.[^.]+$/i.test(file)&&names.has(file.replace('-640.','-1280.')))continue;const url='/assets/images/'+file;items.set(url,{url,thumb:names.has(file.replace('-1280.','-640.'))?'/assets/images/'+file.replace('-1280.','-640.'):url,title:file.replace(/\.[^.]+$/,'').replace(/-1280$/,'').replaceAll('-',' '),alt:'',collection:'photograph',recordId:assetId(url),version:0});}
 for(const doc of documents.filter(doc=>doc.type!=='media'))for(const data of [doc.published,doc.draft]){
  const photos=[...(data?.photos||[]),...(data?.image?[{image:data.image,alt:data.alt||data.title}]:[])];
  for(const photo of photos){if(!photo.image)continue;const existing=items.get(photo.image);items.set(photo.image,{url:photo.image,thumb:photo.image,title:photo.alt||data.title||'Imagen del archivo',collection:'photograph',recordId:assetId(photo.image),version:0,...existing,alt:photo.alt||existing?.alt||''});}
 }
 for(const doc of documents.filter(doc=>doc.type==='media'&&!doc.archived)){
  const image=doc.draft;if(!image?.url)continue;items.set(image.url,{...items.get(image.url),...image,collection:imageCollections.includes(image.collection)?image.collection:'photograph',recordId:doc.id,version:doc.version});
 }
 return [...items.values()].filter(image=>typeof image.url==='string'&&(/^(?:\/assets\/images\/|\/uploads\/)/.test(image.url)||/^https:\/\//.test(image.url))).map(image=>({...image,alt:image.alt||image.title}));
}
