import fs from 'node:fs';
import path from 'node:path';
import { local, dataPath } from './config.js';

let sqlite, pool;
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
  const rows = local ? sqlite.prepare('SELECT record FROM documents').all() : (await pool.query('SELECT record FROM san_ignacio.site_documents')).rows;
  return rows.map(r => typeof r.record === 'string' ? JSON.parse(r.record) : r.record);
}
export async function getDocument(id) {
  const row = local ? sqlite.prepare('SELECT record FROM documents WHERE id=?').get(id) : (await pool.query('SELECT record FROM san_ignacio.site_documents WHERE id=$1', [id])).rows[0];
  return row ? (typeof row.record === 'string' ? JSON.parse(row.record) : row.record) : null;
}
export async function saveDocument(record, expected = 0) {
  const json = JSON.stringify(record);
  if (local) {
    if (!expected) {
      try { sqlite.prepare('INSERT INTO documents(id,record,version) VALUES(?,?,?)').run(record.id,json,record.version); }
      catch(e) { if (/UNIQUE constraint failed/.test(e.message)) { const err = new Error('Este registro ya existe. Actualice la lista.'); err.status=409; throw err; } throw e; }
    } else if (sqlite.prepare('UPDATE documents SET record=?,version=? WHERE id=? AND version=?').run(json,record.version,record.id,expected).changes !== 1) conflict();
  } else {
    if (!expected) {
      const result = await pool.query('INSERT INTO san_ignacio.site_documents(id,record,version) VALUES($1,$2::jsonb,$3) ON CONFLICT DO NOTHING RETURNING id',[record.id,json,record.version]);
      if (!result.rowCount) conflict();
    } else {
      const result = await pool.query('UPDATE san_ignacio.site_documents SET record=$1::jsonb,version=$2 WHERE id=$3 AND version=$4',[json,record.version,record.id,expected]);
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
  if (local) sqlite.prepare('INSERT INTO messages(id,record) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET record=excluded.record').run(record.id,JSON.stringify(record));
  else await pool.query('INSERT INTO san_ignacio.site_messages(id,record) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET record=EXCLUDED.record',[record.id,JSON.stringify(record)]);
  return record;
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
