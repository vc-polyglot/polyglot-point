import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const db = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  options: "-c search_path=san_ignacio,public",
  max: 10,
  idleTimeoutMillis: 30_000
});

db.on("error", (error) => {
  console.error("[postgres] error inesperado", error);
});

export async function withTransaction(callback) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

