import pg from "pg";
import { getDatabaseUrl } from "../config/index.js";

const { Pool } = pg;

export type DbPool = pg.Pool;

let pool: DbPool | null = null;

export function createPool(databaseUrl = getDatabaseUrl()): DbPool {
  return new Pool({ connectionString: databaseUrl });
}

/** プロセス全体で共有する Pool。未作成なら作る。 */
export function getPool(databaseUrl = getDatabaseUrl()): DbPool {
  if (!pool) {
    pool = createPool(databaseUrl);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}
