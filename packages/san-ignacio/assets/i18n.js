import {catalog} from './i18n-catalog.js?v=2';
export const languages=['es','en','fr'];
export const normalizeLanguage=value=>languages.includes(value)?value:'es';
export const languageOf=(doc=globalThis.document)=>normalizeLanguage(doc?.documentElement?.lang);
const reverse=new Map();for(const [source,translations]of Object.entries(catalog))for(const text of Object.values(translations))if(text!==source)reverse.set(text,source);
export function translateText(value,language='es'){
 const text=String(value??''),lang=normalizeLanguage(language);if(lang==='es')return reverse.get(text)||text;
 const core=text.trim(),source=catalog[core]?core:(reverse.get(core)||core);let translated=catalog[source]?.[lang];
 const recurse=text=>translateText(text,lang),pick=(en,fr)=>lang==='en'?en:fr;let match;
 if(!translated){
  if((match=source.match(/^(.*?) · San Ignacio de Loyola( · Polanco)?$/)))translated=recurse(match[1])+' · San Ignacio de Loyola'+(match[2]||'');
  else if((match=source.match(/^(.*?) ↗$/)))translated=recurse(match[1])+' ↗';
  else if((match=source.match(/^(\d+) fotografías del templo y su comunidad\.$/)))translated=pick(`${match[1]} photographs of the church and its community.`,`${match[1]} photographies de l’église et de sa communauté.`);
  else if((match=source.match(/^Fotografía (\d+) del archivo de San Ignacio de Loyola$/)))translated=pick(`Photograph ${match[1]} from the San Ignacio de Loyola archive`,`Photographie ${match[1]} des archives de San Ignacio de Loyola`);
  else if((match=source.match(/^Ampliar: (.*)$/)))translated=pick('Enlarge: ','Agrandir : ')+recurse(match[1]);
  else if((match=source.match(/^Ampliar fotografía (\d+) de (.*)$/)))translated=pick(`Enlarge photograph ${match[1]} of `,`Agrandir la photographie ${match[1]} de `)+recurse(match[2]);
  else if((match=source.match(/^Ampliar fotografía de (.*)$/)))translated=pick('Enlarge photograph of ','Agrandir la photographie de ')+recurse(match[1]);
  else if((match=source.match(/^Más fotografías de (.*)$/)))translated=pick('More photographs of ','Autres photographies de ')+recurse(match[1]);
  else if((match=source.match(/^Ampliar imagen (\d+) de (.*)$/)))translated=pick(`Enlarge image ${match[1]} of `,`Agrandir l’image ${match[1]} de `)+match[2];
  else if((match=source.match(/^Ampliar imagen de (.*)$/)))translated=pick('Enlarge image of ','Agrandir l’image de ')+match[1];
  else if((match=source.match(/^(\d+) de (\d+)( · (.*))?$/)))translated=pick(`${match[1]} of ${match[2]}`,`${match[1]} sur ${match[2]}`)+(match[4]?' · '+recurse(match[4]):'');
  else if((match=source.match(/^Pista (\d+) de (\d+): (.*)$/)))translated=pick(`Track ${match[1]} of ${match[2]}: `,`Piste ${match[1]} sur ${match[2]} : `)+match[3];
  else if((match=source.match(/^Actividad (\d+) de (\d+): (.*)$/)))translated=pick(`Activity ${match[1]} of ${match[2]}: `,`Activité ${match[1]} sur ${match[2]} : `)+match[3];
  else if((match=source.match(/^Cargando (.*)…$/i)))translated=pick('Loading ','Chargement de ')+recurse(match[1])+'…';
  else if((match=source.match(/^(.+) · Ciudad de México$/)))translated=recurse(match[1])+pick(' · Mexico City',' · Mexico');
 }
 if(!translated)return text;
 return text.slice(0,text.length-text.trimStart().length)+translated+text.slice(text.trimEnd().length);
}
export const ui=(text,doc=globalThis.document)=>translateText(text,languageOf(doc));
const originals=new WeakMap(),attributes=new WeakMap();
export function applyPersistentLanguage(root,language){
 if(!root?.ownerDocument?.createTreeWalker)return;
 const skip='[data-original-spanish],[data-music-title],[data-music-track],[data-music-toggle],[data-music-state],[data-music-status]';
 const walker=root.ownerDocument.createTreeWalker(root,4);let node;
 while((node=walker.nextNode())){if(node.parentElement?.closest(skip))continue;if(!originals.has(node))originals.set(node,node.data);node.data=translateText(originals.get(node),language);}
 for(const element of [root,...root.querySelectorAll('*')]){if(element.closest(skip))continue;let saved=attributes.get(element);if(!saved){saved={};for(const attr of ['aria-label','aria-roledescription','title','alt'])if(element.hasAttribute(attr))saved[attr]=element.getAttribute(attr);attributes.set(element,saved);}for(const [attr,text]of Object.entries(saved))element.setAttribute(attr,translateText(text,language));}
}
