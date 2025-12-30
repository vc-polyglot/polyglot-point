import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const needsSSL =
  connectionString.includes("sslmode=require") ||
  process.env.NODE_ENV === "production" ||
  process.env.PGSSLMODE === "require";

export const pool = new Pool({
  connectionString,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });

// Auto-crear tablas si no existen
async function ensureTables() {
  try {
    console.log("[db] Verificando estructura de la base de datos...");
    
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log("[db] Creando tabla 'users'...");
      
      await db.execute(sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          google_id VARCHAR(255),
          apple_id VARCHAR(255),
          name VARCHAR(255),
          avatar_url TEXT,
          plan_type VARCHAR(50) NOT NULL DEFAULT 'freemium',
          messages_bank INTEGER NOT NULL DEFAULT 20,
          messages_used_this_period INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      
      await db.execute(sql`CREATE UNIQUE INDEX users_email_unique ON users (email)`);
      await db.execute(sql`CREATE UNIQUE INDEX users_google_id_unique ON users (google_id)`);
      await db.execute(sql`CREATE UNIQUE INDEX users_apple_id_unique ON users (apple_id)`);
      
      console.log("[db] Tabla 'users' creada con índices");
    } else {
      console.log("[db] Tabla 'users' ya existe");
    }
    
  } catch (error) {
    console.error("[db] Error al verificar/crear tablas:", error.message);
  }
}

if (process.env.NODE_ENV !== "test") {
  ensureTables();
}