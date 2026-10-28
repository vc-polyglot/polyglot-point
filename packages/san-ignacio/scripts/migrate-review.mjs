import 'dotenv/config';import fs from 'node:fs';import pg from 'pg';
import {migrateHostedContent,recoverHostedCollections} from '../src/review/deploy-migration.js';
if(process.env.LOCAL_REVIEW_MODE==='1')throw new Error('Esta migración es para PostgreSQL. La revisión local se prepara con npm run local:init.');
if(!process.env.DATABASE_URL)throw new Error('Falta DATABASE_URL.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:undefined,connectionTimeoutMillis:15000});
try{await client.connect();const references=JSON.parse(fs.readFileSync(new URL('../src/db/reference-content.json',import.meta.url),'utf8')).records;const result=await migrateHostedContent(client,references);console.log('Preparación editorial:',JSON.stringify(result));const recovered=await recoverHostedCollections(client,references);console.log('Recuperación de Nosotros y Galería:',JSON.stringify(recovered));console.log('Tablas y cuentas anteriores conservadas.');}finally{await client.end();}
