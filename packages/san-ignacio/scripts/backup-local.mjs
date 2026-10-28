import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';import {local,dataPath} from '../src/review/config.js';
if(!local)throw new Error('Use una exportación de PostgreSQL para el entorno alojado.');
const destination=path.join(dataPath,'backups',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(destination,{recursive:true});
const db=new DatabaseSync(path.join(dataPath,'site.sqlite'),{readOnly:true});try{await backup(db,path.join(destination,'site.sqlite'));}finally{db.close();}
const files=['site.sqlite'];
if(fs.existsSync(path.join(dataPath,'upgrade-r2.json'))){fs.copyFileSync(path.join(dataPath,'upgrade-r2.json'),path.join(destination,'upgrade-r2.json'));files.push('upgrade-r2.json');}
if(fs.existsSync(path.join(dataPath,'ACCESO-LOCAL.txt'))){fs.copyFileSync(path.join(dataPath,'ACCESO-LOCAL.txt'),path.join(destination,'ACCESO-LOCAL.txt'));files.push('ACCESO-LOCAL.txt');}
if(fs.existsSync(path.join(dataPath,'uploads'))){fs.mkdirSync(path.join(destination,'uploads'));for(const name of fs.readdirSync(path.join(dataPath,'uploads'))){if(!/^[a-z0-9.-]+$/.test(name))throw new Error('Nombre de archivo inesperado.');fs.copyFileSync(path.join(dataPath,'uploads',name),path.join(destination,'uploads',name));files.push('uploads/'+name);}}
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify({format:'san-ignacio-local-backup-v1',createdAt:new Date().toISOString(),files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(destination,file))).digest('hex')}))},null,2));console.log('Respaldo consistente de base local y archivos:',destination);
