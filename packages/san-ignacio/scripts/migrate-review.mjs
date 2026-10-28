import fs from 'node:fs';
import { local,root } from '../src/review/config.js';
if(local) throw new Error('La revisión local se prepara con npm run local:init.');
const {db}=await import('../src/lib/db.js');
try{await db.query(fs.readFileSync(root+'/src/db/review-migration.sql','utf8'));console.log('Migración aditiva completada. No se modificaron las tablas anteriores.');}finally{await db.end();}
