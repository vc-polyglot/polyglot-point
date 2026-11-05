import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sourcePath=process.argv[2];
if(!sourcePath)throw new Error('Uso: node scripts/import-history-dossier.mjs ruta-del-dossier.md');
const source=fs.readFileSync(sourcePath,'utf8').replaceAll('\r\n','\n');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const titles={
 'HIST-010':'Patrimonio ignaciano: las pinturas de Miguel Cabrera y las esculturas',
 'HIST-012':'Las criptas',
 'HIST-014':'Cierre del P. José Ortuño Jayme, S.J.',
 'HIST-016':'Presentación / Instituto Patria',
 'HIST-018':'Reflexión sobre la obra',
 'HIST-029':'Placa conmemorativa del atrio',
 'HIST-030':'Está hecha de amor'
};
const authors={
 'HIST-014':'R.P. José Ortuño Jayme, S.J., Capellán',
 'HIST-015':'P. José Ortuño Jayme, S.J.; créditos colectivos',
 'HIST-017':'P. Rodolfo Mendoza, S.J. — Encargado de la obra y primer capellán de la Iglesia',
 'HIST-022':'Carta de Marcelino Hernández Rodríguez y texto del Comité Guadalupano firmado por Tito Tsutsumi',
 'HIST-030':'El Capellán, Rodolfo Mendoza, S.J.'
};
const notes={
 'HIST-007':['La invitación que acompaña este artículo no cuenta con una transcripción legible.'],
 'HIST-013':['«En la actualidad» se refiere al tiempo de la revista. Esta fuente sitúa en 1962 la llegada de las Congregaciones Marianas desde la Iglesia Votiva; HIST-021 ofrece otra fecha y procedencia. Se conservan ambas versiones.'],
 'HIST-017':['La secuencia de las Memorias y algunos signos de puntuación permanecen pendientes de cotejo. Se conservan las variantes Valdéz y Valdez del testimonio.', 'El benefactor del Cristo permanece sin nombre en este testimonio. HIST-009 identifica al señor José Mata; no se ha incorporado ese nombre a estas Memorias.'],
 'HIST-018':['Esta redacción se conserva como pieza independiente. No sustituye el cierre de las Memorias del P. Rodolfo Mendoza.'],
 'HIST-019':['Se conserva el nombre del P. Sergio Gómez Vargas sin añadir siglas no identificadas en la transcripción.'],
 'HIST-020':['«Siguen presentes» corresponde al momento de la revista; no es un directorio actual.'],
 'HIST-021':['Esta fuente menciona 1967 y la antigua iglesia de San Francisco; HIST-013 menciona 1962 y la Iglesia Votiva. No se ha resuelto la diferencia entre los testimonios.'],
 'HIST-022':['La línea señalada como «lectura dudosa» permanece sin confirmar. Se conservan los nombres y cargos tal como aparecen en la transcripción.'],
 'HIST-023':['La función de los nombres que acompañan al texto permanece pendiente de cotejo. Se conserva una sola transcripción de Música.'],
 'HIST-024':['Esta relación corresponde al momento de edición de la revista y no constituye una lista de capellanes hasta el presente.'],
 'HIST-025':['El nombre complementario se conserva sin atribuirle una autoría que la transcripción no confirma.'],
 'HIST-027':['Los servicios y programas descritos corresponden al momento de la revista; no son información pastoral vigente.'],
 'HIST-029':['La inscripción se conserva en versales, sin añadir acentos o signos ausentes de la transcripción.'],
 'HIST-030':['El encabezado «Está hecha de amor» es un título editorial tomado del comienzo del texto. Se conservan íntegros los versos, la firma y la fecha.']
};
const starts=[...source.matchAll(/^### (HIST-\d{3}) — (.+)$/gm)];
const documents=starts.map((match,index)=>{
 const id=match[1];
 const raw=source.slice(match.index+match[0].length,starts[index+1]?.index??source.length).split(/^## /m)[0];
 const metadata=Object.fromEntries([...raw.matchAll(/^- \*\*([^*]+?):\*\* (.+)$/gm)].map(m=>[m[1],m[2]]));
 const markers=[...raw.matchAll(/^\*\*([^*\n]+?)\*\*([^\n]*)$/gm)];
 const segments=[];
 for(let i=0;i<markers.length;i++){
  const marker=markers[i];
  if(!/^(?:texto original|texto introductorio|inscripción en placa|texto visible|leyenda del escudo|pie visible|nombres\/pies)/i.test(marker[1]))continue;
  const text=(marker[2].trim()+'\n'+raw.slice(marker.index+marker[0].length,markers[i+1]?.index??raw.length)).replace(/\n---\s*$/,'').trim();
  if(text)segments.push({kind:id==='HIST-030'?'verse':/^Inscripción/i.test(marker[1])?'inscription':/^(?:texto original|texto introductorio)/i.test(marker[1])?'text':'supplement',text});
 }
 if(!segments.length)throw new Error('Falta transcripción: '+id);
 return {id,magazine:Number(metadata.Revista?.[0]),title:titles[id]||metadata['Título impreso']||match[2],editorialTitle:!!titles[id],author:authors[id]||null,printedPage:null,tags:(metadata['Etiquetas editoriales']||'').split(',').map(s=>s.trim()),segments,notes:notes[id]||[]};
});
if(documents.length!==31||new Set(documents.map(d=>d.id)).size!==31)throw new Error('Se esperaban exactamente 31 documentos distintos.');
if(documents.some(d=>!([1,2].includes(d.magazine))||/fotograf|IMG-\d|WhatsApp/i.test(JSON.stringify(d))))throw new Error('Revisar metadatos y referencias excluidas de la edición textual.');
const chronologySource=source.split('## 6. ÍNDICE CRONOLÓGICO')[1].split('## 7.')[0];
const chronology=chronologySource.split('\n').filter(line=>/^\| \*\*/.test(line)).map(line=>{
 const cells=line.split('|').slice(1,-1).map(s=>s.trim());
 return {date:cells[0].replaceAll('**',''),event:cells[1].replaceAll('**',''),documents:[...cells[2].matchAll(/HIST-\d{3}/g)].map(m=>m[0])};
});
const themes=[
 {id:'origenes',title:'Orígenes y construcción',documents:['HIST-002','HIST-003','HIST-004','HIST-005','HIST-006','HIST-007','HIST-008','HIST-016','HIST-017','HIST-029']},
 {id:'arte',title:'Arquitectura y arte sacro',documents:['HIST-008','HIST-009','HIST-010','HIST-017','HIST-029']},
 {id:'obras',title:'Salones y criptas',documents:['HIST-011','HIST-012','HIST-028']},
 {id:'comunidad',title:'Vida de la comunidad',documents:['HIST-013','HIST-021','HIST-022','HIST-025','HIST-026','HIST-027','HIST-028']},
 {id:'musica',title:'Música y órgano',documents:['HIST-023']},
 {id:'memorias',title:'Memorias, personas y legado',documents:['HIST-001','HIST-014','HIST-015','HIST-017','HIST-018','HIST-019','HIST-020','HIST-024','HIST-030','HIST-031']}
];
for(const item of [...chronology,...themes])for(const id of item.documents)if(!documents.some(d=>d.id===id))throw new Error('Enlace sin destino: '+id);
const data={source:'SAN_IGNACIO_REVISTAS_DOSSIER_CODEX.md',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),verification:'Transcripciones de trabajo; cotejo documental final pendiente.',documents,chronology,themes};
fs.mkdirSync(path.join(root,'src/review/data'),{recursive:true});
fs.writeFileSync(path.join(root,'src/review/data/history-dossier.json'),JSON.stringify(data,null,2)+'\n');
console.log(`${documents.length} documentos y ${chronology.length} hitos incorporados sin modificar las transcripciones.`);
