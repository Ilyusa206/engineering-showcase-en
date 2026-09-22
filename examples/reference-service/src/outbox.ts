/**
 * Sanitized reconstruction based on implemented systems.
 * Not verbatim production code.
 */

import type { Pool, PoolClient } from "pg";

interface OutboxEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  job_id: string;
}

export type EventHandler = (client: PoolClient, event: OutboxEvent) => Promise<void>;

const defaultHandler: EventHandler = async (client, event) => {
  await client.query(
    `INSERT INTO processed_events(outbox_id, job_id, event_type, payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (outbox_id) DO NOTHING`,
    [event.id, event.job_id, event.event_type, event.payload],
  );
};

export async function processOneEvent(
  pool: Pool,
  handler: EventHandler = defaultHandler,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const claimed = await client.query<OutboxEvent>(
      `SELECT id, event_type, payload, job_id
        FROM outbox_events
        WHERE processed_at IS NULL AND available_at <= now()
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED`,
    );
    const event = claimed.rows[0];
    if (!event) {
      await client.query("COMMIT");
      return false;
    }

    await client.query("SAVEPOINT event_processing");
    try {
      await handler(client, event);
      await client.query(
        `UPDATE outbox_events
            SET processed_at = now(), attempts = attempts + 1, last_error = NULL
          WHERE id = $1`,
        [event.id],
      );
      await client.query("RELEASE SAVEPOINT event_processing");
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT event_processing");
      await client.query(
        `UPDATE outbox_events
            SET attempts = attempts + 1,
                last_error = $2,
                available_at = now() + interval '1 second' * LEAST(60, power(2, attempts))
          WHERE id = $1`,
        [event.id, error instanceof Error ? error.message.slice(0, 500) : "unknown_error"],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
