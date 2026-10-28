import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';import {local,root} from '../src/review/config.js';
if(!local)throw new Error('Sólo para recuperación en una carpeta local nueva.');
const source=path.resolve(process.argv[2]||'');const destination=path.resolve(process.argv[3]||path.join(root,'.local','restored-'+Date.now()));
const localRoot=path.resolve(root,'.local')+path.sep;if(!destination.startsWith(localRoot)||fs.existsSync(destination))throw new Error('El destino debe ser una carpeta nueva dentro de .local; nunca se sobrescribe la instancia actual.');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));if(manifest.format!=='san-ignacio-local-backup-v1')throw new Error('Formato de respaldo no reconocido.');
if(!manifest.files.some(f=>f.file==='site.sqlite'))throw new Error('Falta la base de datos.');
for(const f of manifest.files){if(!/^(site\.sqlite|upgrade-r2\.json|ACCESO-LOCAL\.txt|uploads\/[a-z0-9.-]+)$/.test(f.file))throw new Error('Ruta inesperada en el respaldo.');const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(source,f.file))).digest('hex');if(digest!==f.sha256)throw new Error('La integridad del respaldo no coincide.');}
fs.mkdirSync(destination,{recursive:true});for(const f of manifest.files){const target=path.join(destination,f.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,f.file),target);}
const db=new DatabaseSync(path.join(destination,'site.sqlite'),{readOnly:true});const documents=db.prepare('SELECT count(*) AS total FROM documents').get().total;const integrity=db.prepare('PRAGMA integrity_check').get();db.close();console.log(JSON.stringify({destination,documents,integrity}));
