import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

export function getDatabase(connectionString?: string, schema?: any) {
  if (!db) {
    const connString = connectionString || process.env.DATABASE_URL;
    if (!connString) {
      throw new Error('DATABASE_URL is not defined');
    }
    
    // Detectar si necesita SSL (producción o sslmode=require)
    const needsSSL =
      connString.includes('sslmode=require') ||
      process.env.NODE_ENV === 'production' ||
      process.env.PGSSLMODE === 'require';
    
    pool = new Pool({
      connectionString: connString,
      ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    
    db = drizzle(pool, schema ? { schema } : undefined);
  }
  
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call getDatabase() first.');
  }
  return pool;
}

export { db };
