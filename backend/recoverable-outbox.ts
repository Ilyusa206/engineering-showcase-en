/**
 * Sanitized reconstruction based on an implemented system.
 * Not verbatim production code.
 */

interface SqlClient {
  query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

interface Queue {
  add(
    name: string,
    payload: Record<string, unknown>,
    options: { jobId: string; attempts: number; backoff: { type: "exponential"; delay: number } },
  ): Promise<void>;
}

interface OutboxRow {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

export async function acceptEvent(
  db: SqlClient,
  input: { producer: string; idempotencyKey: string; payloadHash: string; payload: unknown },
): Promise<void> {
  await db.query("BEGIN");
  try {
    const accepted = await db.query<{ id: string }>(
      `INSERT INTO accepted_events(producer, idempotency_key, payload_hash, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (producer, idempotency_key) DO NOTHING
       RETURNING id`,
      [input.producer, input.idempotencyKey, input.payloadHash, input.payload],
    );

    if (accepted.rowCount === 0) {
      const previous = await db.query<{ id: string; payload_hash: string }>(
        `SELECT id, payload_hash
           FROM accepted_events
          WHERE producer = $1 AND idempotency_key = $2`,
        [input.producer, input.idempotencyKey],
      );
      if (previous.rows[0]?.payload_hash !== input.payloadHash) {
        throw new Error("idempotency_key_reused_for_different_payload");
      }
    } else {
      await db.query(
        `INSERT INTO queue_outbox(aggregate_id, event_type, payload)
         VALUES ($1, 'event.accepted', $2)`,
        [accepted.rows[0].id, input.payload],
      );
    }

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

export async function publishBatch(db: SqlClient, queue: Queue): Promise<number> {
  await db.query("BEGIN");
  try {
    const pending = await db.query<OutboxRow>(
      `SELECT id, aggregate_id, event_type, payload
         FROM queue_outbox
        WHERE published_at IS NULL
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 100`,
    );

    let published = 0;
    for (const item of pending.rows) {
      // A deterministic job ID closes the failure window between queue.add and COMMIT.
      const jobId = `outbox-${item.id}`;
      await queue.add(item.event_type, item.payload, {
        jobId,
        attempts: 5,
        backoff: { type: "exponential", delay: 1_000 },
      });
      await db.query(
        `UPDATE queue_outbox
            SET published_at = COALESCE(published_at, NOW())
          WHERE id = $1`,
        [item.id],
      );
      published += 1;
    }
    await db.query("COMMIT");
    return published;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

// After Redis loss, reset published_at for jobs missing from the queue
// (or maintain a separate delivery ledger), then rerun publishBatch. Stable
// job IDs make the projection repeatable; durable state remains in PostgreSQL.
