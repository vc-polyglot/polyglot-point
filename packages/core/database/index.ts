import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

let db: ReturnType<typeof drizzle> | null = null;

export function getDatabase(connectionString?: string) {
  if (!db) {
    const connString = connectionString || process.env.DATABASE_URL;
    if (!connString) {
      throw new Error('DATABASE_URL is not defined');
    }
    const client = postgres(connString);
    db = drizzle(client);
  }
  return db;
}

export { db };
