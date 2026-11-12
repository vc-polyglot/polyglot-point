import fs from 'node:fs';
import {renderPage,routes} from '../src/review/pages.js';
import {withEditorialDefaults,withAlbumDefaults} from '../src/review/editorial-defaults.js';
import {translateText} from '../assets/i18n.js';
import {catalog} from '../assets/i18n-catalog.js';
const records=JSON.parse(fs.readFileSync(new URL('../src/db/reference-content.json',import.meta.url),'utf8')).records;
const docs=withEditorialDefaults(records).map(withAlbumDefaults).filter(doc=>doc.published&&!doc.archived&&!['notice','event'].includes(doc.type)).map(doc=>({id:doc.id,type:doc.type,...doc.published}));
const decode=text=>text.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const invariant=text=>/^[/#]|https?:|@|^©|^San Ignacio(?: de Loyola)?(?:\.| · \d+)?$|^de Loyola$|^Trio super |^Sonata trío|^Meditación III$|^(?:INEA|Facebook(?: ↗)?|A\. M\. D\. G\.|Fomento Cultural, A\.C\.|ES|EN|FR)$|, S\.J\.$/.test(text)||!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text)||/^[\d\s:·.]+h$/.test(text)||['Arturo Vallín López','Adriana Arriaga Morales','Víctor Contreras','Ignacio Ortíz Perea','Rogelio Solís Colín'].includes(text);
const strings=new Set();
for(const data of [docs,[]])for(const path of Object.keys(routes)){
 const html=renderPage(path,data).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 for(const match of html.matchAll(/>([^<>]+)</g)){const value=decode(match[1]).trim();if(value)strings.add(value);}
 for(const match of html.matchAll(/(?:aria-label|aria-roledescription|title|alt|data-label)="([^"]+)"/g))strings.add(decode(match[1]).trim());
}
const missing=[...strings].filter(text=>!catalog[text]&&!invariant(text)&&translateText(text,'en')===text&&translateText(text,'fr')===text);
if(missing.length){console.error('Faltan traducciones institucionales:',JSON.stringify(missing,null,2));process.exitCode=1;}
else console.log(`${strings.size} textos y etiquetas institucionales revisados; ES, EN y FR cubiertos. Nombres propios y archivos originales conservados.`);
