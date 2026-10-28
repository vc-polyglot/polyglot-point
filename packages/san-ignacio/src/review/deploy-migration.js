import fs from 'node:fs';import crypto from 'node:crypto';
import {legacyTables,buildDeploymentPlan} from './deploy-plan.js';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const deploymentMigration='editorial-review-20261028-v1';
// The caller supplies one dedicated PostgreSQL client. Existing schemas and rows
// are never updated or deleted. A failed import rolls back its backup and writes.
export async function migrateHostedContent(client,references){
 await client.query('BEGIN');
 try{
  await client.query("SELECT pg_advisory_xact_lock(hashtext('san-ignacio-editorial-upgrade'))");
  await client.query(fs.readFileSync(new URL('../db/review-migration.sql',import.meta.url),'utf8'));
  await client.query('CREATE TABLE IF NOT EXISTS san_ignacio.site_migration_backups (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), checksum TEXT NOT NULL, snapshot JSONB NOT NULL, imported_count INTEGER NOT NULL DEFAULT 0)');
  const previous=await client.query('SELECT id,checksum,imported_count FROM san_ignacio.site_migration_backups WHERE id=$1',[deploymentMigration]);
  if(previous.rowCount){await client.query('COMMIT');return {alreadyApplied:true,imported:previous.rows[0].imported_count};}
  const tables={};
  for(const table of legacyTables){const exists=await client.query('SELECT to_regclass($1) AS name',['san_ignacio.'+table]);if(!exists.rows[0].name)continue;await client.query(`LOCK TABLE san_ignacio.${table} IN SHARE MODE`);tables[table]=(await client.query(`SELECT * FROM san_ignacio.${table}`)).rows;}
  const existing=(await client.query('SELECT id,record,version FROM san_ignacio.site_documents ORDER BY id')).rows;
  const existingMessages=(await client.query('SELECT id,record FROM san_ignacio.site_messages ORDER BY id')).rows;
  const snapshot={format:'san-ignacio-pre-upgrade-v1',createdAt:new Date().toISOString(),legacyTables:tables,editorialDocuments:existing,editorialMessages:existingMessages};
  const json=JSON.stringify(snapshot),checksum=crypto.createHash('sha256').update(JSON.stringify(canonical(JSON.parse(json)))).digest('hex');
  await client.query('INSERT INTO san_ignacio.site_migration_backups(id,checksum,snapshot) VALUES($1,$2,$3::jsonb)',[deploymentMigration,checksum,json]);
  let imported=0;
  if(!existing.length){const plan=buildDeploymentPlan(tables,references,snapshot.createdAt);for(const doc of plan.documents){await client.query('INSERT INTO san_ignacio.site_documents(id,record,version) VALUES($1,$2::jsonb,$3)',[doc.id,JSON.stringify(doc),doc.version]);imported++;}for(const message of plan.messages)await client.query('INSERT INTO san_ignacio.site_messages(id,record) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[message.id,JSON.stringify(message)]);}
  // Read the stored JSON back and verify its contents before committing.
  const stored=(await client.query('SELECT snapshot FROM san_ignacio.site_migration_backups WHERE id=$1',[deploymentMigration])).rows[0].snapshot;
  if(crypto.createHash('sha256').update(JSON.stringify(canonical(stored))).digest('hex')!==checksum)throw new Error('El respaldo previo no coincide; se cancela la migración.');
  await client.query('UPDATE san_ignacio.site_migration_backups SET imported_count=$2 WHERE id=$1',[deploymentMigration,imported]);
  await client.query('COMMIT');return {alreadyApplied:false,imported,legacyCounts:Object.fromEntries(Object.entries(tables).map(([key,value])=>[key,value.length])),checksum};
 }catch(error){await client.query('ROLLBACK');throw error;}
}
