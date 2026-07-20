import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DbPool } from "./pool.js";

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

async function ensureMigrationsTable(pool: DbPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(migrationsDir);
  return files.filter((f) => f.endsWith(".sql")).sort();
}

export async function migrate(pool: DbPool): Promise<string[]> {
  await ensureMigrationsTable(pool);
  const applied = await pool.query<{ id: string }>(
    "SELECT id FROM schema_migrations ORDER BY id",
  );
  const appliedSet = new Set(applied.rows.map((r) => r.id));
  const files = await listMigrationFiles();
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
      newlyApplied.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}

/** CLI: npm run db:migrate -w @jinro/backend */
async function main(): Promise<void> {
  const { loadEnv, getDatabaseUrl } = await import("../config/index.js");
  const { createPool } = await import("./pool.js");

  loadEnv();
  const pool = createPool(getDatabaseUrl());
  try {
    const applied = await migrate(pool);
    if (applied.length === 0) {
      console.log("No new migrations.");
    } else {
      console.log("Applied migrations:");
      for (const id of applied) console.log(`  - ${id}`);
    }
  } finally {
    await pool.end();
  }
}

const entry = process.argv[1];
if (
  entry &&
  path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
