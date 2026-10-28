import fs from 'node:fs';import path from 'node:path';import {local,dataPath,host,port} from '../src/review/config.js';
if(!local)throw new Error('Sólo para la instancia local iniciada por su lanzador.');
const file=path.join(dataPath,'server.pid');if(!fs.existsSync(file)){console.log('No hay una instancia registrada por el lanzador.');process.exit(0);}
const pid=Number(fs.readFileSync(file,'utf8'));let health;try{const r=await fetch(`http://${host}:${port}/health`,{signal:AbortSignal.timeout(1500)});health=await r.json();}catch{console.log('El servidor local ya está detenido.');process.exit(0);}
if(health.app!=='san-ignacio-review'||health.pid!==pid)throw new Error('La instancia no coincide. No se detuvo ningún proceso.');
process.kill(pid);console.log('Servidor local detenido. Los contenidos permanecen guardados.');
