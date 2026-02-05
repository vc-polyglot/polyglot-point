import { getDatabase, getPool } from '@platform/core/database';
import * as schema from '../shared/schema';

// Inicializar la base de datos con el schema de Polyglot Point
const db = getDatabase(process.env.DATABASE_URL, schema);

// Re-exportar para mantener compatibilidad con imports existentes
export { db, getPool };
export const pool = getPool();
export type Database = typeof db;
