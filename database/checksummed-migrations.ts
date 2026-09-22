/**
 * Sanitized reconstruction based on an implemented system.
 * Not verbatim production code.
 */

import { createHash } from "node:crypto";

interface Migration {
  filename: string;
  sql: string;
}

interface AppliedMigration {
  filename: string;
  checksum: string;
}

interface DatabaseClient {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

const lockName = "application-schema-migrations";

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function migrationPlan(
  discovered: Migration[],
  applied: AppliedMigration[],
): Array<Migration & { checksum: string }> {
  const appliedByName = new Map(applied.map((item) => [item.filename, item.checksum]));
  return discovered.map((item) => ({ ...item, checksum: checksum(item.sql) })).filter((item) => {
    const previous = appliedByName.get(item.filename);
    if (previous && previous !== item.checksum) {
      throw new Error(`Applied migration has changed: ${item.filename}`);
    }
    return !previous;
  });
}

export async function runMigrations(
  db: DatabaseClient,
  discovered: Migration[],
): Promise<string[]> {
  await db.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);
  const completed: string[] = [];

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const previous = await db.query<AppliedMigration>(
      "SELECT filename, checksum FROM schema_migrations ORDER BY filename",
    );

    for (const item of migrationPlan(discovered, previous.rows)) {
      if (/^\s*(BEGIN|COMMIT)\s*;/im.test(item.sql)) {
        throw new Error(`Migration manages its own transaction: ${item.filename}`);
      }
      await db.query("BEGIN");
      try {
        await db.query(item.sql);
        await db.query(
          "INSERT INTO schema_migrations(filename, checksum) VALUES ($1, $2)",
          [item.filename, item.checksum],
        );
        await db.query("COMMIT");
        completed.push(item.filename);
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    }
    return completed;
  } finally {
    await db.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]);
  }
}
