import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// SSL solo cuando aplica (Railway/Supabase suelen requerirlo)
const needsSSL =
  connectionString.includes("sslmode=require") ||
  process.env.NODE_ENV === "production" ||
  process.env.PGSSLMODE === "require";

export const pool = new Pool({
  connectionString,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });