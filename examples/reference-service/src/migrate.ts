/**
 * Sanitized reconstruction based on implemented systems.
 * Not verbatim production code.
 */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Pool } from "pg";

import { createPool } from "./db.js";

const migrationDirectory = resolve(import.meta.dirname, "../migrations");
const lockName = "showcase-reference-service-migrations";

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export async function runMigrations(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  const appliedNow: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const previous = await client.query<{ filename: string; checksum: string }>(
      "SELECT filename, checksum FROM schema_migrations ORDER BY filename",
    );
    const applied = new Map(previous.rows.map((row) => [row.filename, row.checksum]));
    const filenames = (await readdir(migrationDirectory))
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of filenames) {
      const sql = await readFile(resolve(migrationDirectory, filename), "utf8");
      const currentChecksum = checksum(sql);
      const oldChecksum = applied.get(filename);
      if (oldChecksum && oldChecksum !== currentChecksum) {
        throw new Error(`Applied migration has changed: ${filename}`);
      }
      if (oldChecksum) continue;

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations(filename, checksum) VALUES ($1, $2)",
          [filename, currentChecksum],
        );
        await client.query("COMMIT");
        appliedNow.push(filename);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return appliedNow;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]);
    client.release();
  }
}

async function main(): Promise<void> {
  const pool = createPool();
  try {
    const applied = await runMigrations(pool);
    console.log(applied.length ? `Applied migrations: ${applied.join(", ")}` : "No new migrations");
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
