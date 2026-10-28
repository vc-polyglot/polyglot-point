import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {root,local,dataPath,host,port} from '../src/review/config.js';
if(!local)throw new Error('Este lanzador sólo controla la copia local.');
const url=`http://${host}:${port}`;
async function health(){try{const r=await fetch(url+'/health',{signal:AbortSignal.timeout(800)});return r.ok?await r.json():null;}catch{return null;}}
let current=await health();
if(current&&current.app!=='san-ignacio-review')throw new Error('El puerto está ocupado por otra aplicación. No se modificó ese proceso.');
if(!current){fs.mkdirSync(dataPath,{recursive:true});const log=fs.openSync(path.join(dataPath,'server.log'),'a');const child=spawn(process.execPath,[path.join(root,'src/server.js')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);fs.writeFileSync(path.join(dataPath,'server.pid'),String(child.pid));for(let i=0;i<50;i++){await new Promise(resolve=>setTimeout(resolve,100));current=await health();if(current?.app==='san-ignacio-review')break;}if(!current)throw new Error('No se pudo iniciar. Revisa .local/server.log.');}
console.log('Sitio local:',url+'/');console.log('Consola:',url+'/admin');console.log('Credenciales:',path.join(dataPath,'ACCESO-LOCAL.txt'));console.log('Abre esas direcciones en tu navegador. Puedes cerrar esta ventana; el servidor sigue activo.');
