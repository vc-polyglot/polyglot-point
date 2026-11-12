import fs from 'node:fs';
import path from 'node:path';
import { local, dataPath } from './config.js';
import {AsyncLocalStorage} from 'node:async_hooks';
import {assertNoDeletedReferences} from './asset-state.js';

let sqlite, pool;
const transactionContext=new AsyncLocalStorage();let localQueue=Promise.resolve();
const connection=()=>transactionContext.getStore()?.client||pool;
export async function documentTransaction(callback){
 if(transactionContext.getStore())return callback();
 if(local){let unlock;const previous=localQueue;localQueue=new Promise(resolve=>{unlock=resolve;});await previous;
  try{sqlite.exec('BEGIN IMMEDIATE');try{const result=await transactionContext.run({local:true},callback);sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}finally{unlock();}
 }
 const client=await pool.connect();try{await client.query('BEGIN');await client.query('LOCK TABLE san_ignacio.site_documents IN SHARE ROW EXCLUSIVE MODE');const result=await transactionContext.run({client},callback);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function openStore() {
  if (local) {
    const { DatabaseSync } = await import('node:sqlite');
    fs.mkdirSync(dataPath, { recursive: true });
    sqlite = new DatabaseSync(path.join(dataPath, 'site.sqlite'));
    sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, record TEXT NOT NULL, version INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS local_users(email TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL);`);
  } else {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      options: '-c search_path=san_ignacio,public', max: 8 });
    // The migration is explicit: never change the production schema on startup.
    await pool.query('SELECT id FROM san_ignacio.site_documents LIMIT 0');
  }
}
export async function allDocuments() {
  const rows = local ? sqlite.prepare('SELECT record FROM documents').all() : (await connection().query('SELECT record FROM san_ignacio.site_documents')).rows;
  return rows.map(r => typeof r.record === 'string' ? JSON.parse(r.record) : r.record);
}
export async function getDocument(id) {
  const row = local ? sqlite.prepare('SELECT record FROM documents WHERE id=?').get(id) : (await connection().query('SELECT record FROM san_ignacio.site_documents WHERE id=$1', [id])).rows[0];
  return row ? (typeof row.record === 'string' ? JSON.parse(row.record) : row.record) : null;
}
export async function saveDocument(record, expected = 0) {
  if(!transactionContext.getStore())return documentTransaction(()=>saveDocument(record,expected));
  assertNoDeletedReferences(record,await allDocuments());
  const json = JSON.stringify(record);
  if (local) {
    if (!expected) {
      try { sqlite.prepare('INSERT INTO documents(id,record,version) VALUES(?,?,?)').run(record.id,json,record.version); }
      catch(e) { if (/UNIQUE constraint failed/.test(e.message)) { const err = new Error('Este registro ya existe. Actualice la lista.'); err.status=409; throw err; } throw e; }
    } else if (sqlite.prepare('UPDATE documents SET record=?,version=? WHERE id=? AND version=?').run(json,record.version,record.id,expected).changes !== 1) conflict();
  } else {
    if (!expected) {
      const result = await connection().query('INSERT INTO san_ignacio.site_documents(id,record,version) VALUES($1,$2::jsonb,$3) ON CONFLICT DO NOTHING RETURNING id',[record.id,json,record.version]);
      if (!result.rowCount) conflict();
    } else {
      const result = await connection().query('UPDATE san_ignacio.site_documents SET record=$1::jsonb,version=$2 WHERE id=$3 AND version=$4',[json,record.version,record.id,expected]);
      if (!result.rowCount) conflict();
    }
  }
  return record;
}
function conflict() { const error = new Error('Otra persona guardó una versión más reciente. Copie sus cambios y recargue antes de guardar.'); error.status=409; throw error; }
export async function messages() {
  const rows = local ? sqlite.prepare('SELECT record FROM messages ORDER BY id DESC').all() : (await pool.query('SELECT record FROM san_ignacio.site_messages ORDER BY id DESC')).rows;
  return rows.map(r => typeof r.record === 'string' ? JSON.parse(r.record) : r.record);
}
export async function saveMessage(record) {
  if(local&&!transactionContext.getStore())return documentTransaction(()=>saveMessage(record));
  if (local) sqlite.prepare('INSERT INTO messages(id,record) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record').run(record.id,JSON.stringify(record));
  else await pool.query('INSERT INTO san_ignacio.site_messages(id,record) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET record=EXCLUDED.record',[record.id,JSON.stringify(record)]);
  return record;
}
export async function updateMessageStatus(id,status) {
  if(local&&!transactionContext.getStore())return documentTransaction(()=>updateMessageStatus(id,status));
  const now=new Date().toISOString();
  const row=local?sqlite.prepare("UPDATE messages SET record=json_set(record,'$.status',?,'$.updatedAt',?) WHERE id=? RETURNING record").get(status,now,id):(await pool.query("UPDATE san_ignacio.site_messages SET record=jsonb_set(jsonb_set(record,'{status}',to_jsonb($1::text)),'{updatedAt}',to_jsonb($2::text)) WHERE id=$3 RETURNING record",[status,now,id])).rows[0];
  return row?(typeof row.record==='string'?JSON.parse(row.record):row.record):null;
}
export async function deleteMessage(id) {
  if(local&&!transactionContext.getStore())return documentTransaction(()=>deleteMessage(id));
  if(local)return sqlite.prepare('DELETE FROM messages WHERE id=?').run(id).changes===1;
  return (await pool.query('DELETE FROM san_ignacio.site_messages WHERE id=$1',[id])).rowCount===1;
}
export async function findUser(email) {
  if (local) return sqlite.prepare('SELECT * FROM local_users WHERE email=?').get(email);
  return (await pool.query('SELECT name,email,password_hash,role FROM users WHERE lower(email)=$1 AND active=TRUE',[email])).rows[0];
}
export async function addLocalUser(user) {
  if (!local) throw new Error('Sólo para la copia de revisión local.');
  sqlite.prepare('INSERT INTO local_users(email,name,password_hash,role) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').run(user.email,user.name,user.password_hash,'admin');
}
export async function pingStore() { if (local) return !!sqlite.prepare('SELECT 1 AS ok').get().ok; return !!(await pool.query('SELECT 1 AS ok')).rows[0].ok; }
export async function closeStore() { if (sqlite) sqlite.close(); if(pool) await pool.end(); }
