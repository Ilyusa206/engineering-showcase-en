/**
 * Sanitized reconstruction based on implemented systems.
 * Not verbatim production code.
 */

import { createHash, randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { inTransaction } from "./db.js";

type Access = "read" | "write";
type Role = "viewer" | "member" | "editor" | "admin" | "owner";

const accessByRole: Record<Role, ReadonlySet<Access>> = {
  viewer: new Set(["read"]),
  member: new Set(["read", "write"]),
  editor: new Set(["read", "write"]),
  admin: new Set(["read", "write"]),
  owner: new Set(["read", "write"]),
};

export class ServiceError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409,
    readonly code: string,
  ) {
    super(code);
  }
}

async function requireSpaceAccess(
  client: PoolClient,
  userId: string,
  spaceId: string,
  required: Access,
): Promise<void> {
  const result = await client.query<{ role: Role }>(
    `SELECT role
       FROM memberships
      WHERE space_id = $1 AND user_id = $2 AND active = true`,
    [spaceId, userId],
  );
  const role = result.rows[0]?.role;
  // Return 404 for inaccessible spaces rather than exposing their existence.
  if (!role || !accessByRole[role].has(required)) {
    throw new ServiceError(404, "space_not_found");
  }
}

function requestHash(input: { spaceId: string; title: string }): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export interface RecordView {
  id: string;
  spaceId: string;
  title: string;
  createdBy: string;
}

function mapRecord(row: {
  id: string;
  space_id: string;
  title: string;
  created_by: string;
}): RecordView {
  return {
    id: row.id,
    spaceId: row.space_id,
    title: row.title,
    createdBy: row.created_by,
  };
}

export async function createRecord(
  pool: Pool,
  input: { userId: string; spaceId: string; title: string; idempotencyKey: string },
): Promise<{ record: RecordView; created: boolean }> {
  const title = input.title.trim();
  if (!title || title.length > 200) throw new ServiceError(400, "invalid_title");
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) {
    throw new ServiceError(400, "invalid_idempotency_key");
  }
  const hash = requestHash({ spaceId: input.spaceId, title });

  return inTransaction(pool, async (client) => {
    await requireSpaceAccess(client, input.userId, input.spaceId, "write");

    // Serialize the same actor/key before checking and inserting the idempotency record.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `${input.userId}:${input.idempotencyKey}`,
    ]);
    const previous = await client.query<{
      request_hash: string;
      resource_id: string;
    }>(
      `SELECT request_hash, resource_id
         FROM idempotency_keys
        WHERE actor_id = $1 AND key = $2`,
      [input.userId, input.idempotencyKey],
    );

    if (previous.rows[0]) {
      if (previous.rows[0].request_hash !== hash) {
        throw new ServiceError(409, "idempotency_key_reused");
      }
      const existing = await client.query<{
        id: string;
        space_id: string;
        title: string;
        created_by: string;
      }>("SELECT id, space_id, title, created_by FROM records WHERE id = $1", [
        previous.rows[0].resource_id,
      ]);
      return { record: mapRecord(existing.rows[0]!), created: false };
    }

    const recordId = randomUUID();
    const recordResult = await client.query<{
      id: string;
      space_id: string;
      title: string;
      created_by: string;
    }>(
      `INSERT INTO records(id, space_id, title, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, space_id, title, created_by`,
      [recordId, input.spaceId, title, input.userId],
    );
    await client.query(
      `INSERT INTO idempotency_keys(actor_id, key, request_hash, resource_id)
       VALUES ($1, $2, $3, $4)`,
      [input.userId, input.idempotencyKey, hash, recordId],
    );

    const eventId = randomUUID();
    await client.query(
      `INSERT INTO outbox_events(id, aggregate_id, event_type, payload, job_id)
       VALUES ($1, $2, 'record.created', $3, $4)`,
      [
        eventId,
        recordId,
        JSON.stringify({ recordId, spaceId: input.spaceId }),
        `outbox:${eventId}`,
      ],
    );
    return { record: mapRecord(recordResult.rows[0]!), created: true };
  });
}

export async function getRecord(
  pool: Pool,
  input: { userId: string; spaceId: string; recordId: string },
): Promise<RecordView> {
  return inTransaction(pool, async (client) => {
    await requireSpaceAccess(client, input.userId, input.spaceId, "read");
    const result = await client.query<{
      id: string;
      space_id: string;
      title: string;
      created_by: string;
    }>(
      `SELECT id, space_id, title, created_by
         FROM records
        WHERE id = $1 AND space_id = $2`,
      [input.recordId, input.spaceId],
    );
    if (!result.rows[0]) throw new ServiceError(404, "record_not_found");
    return mapRecord(result.rows[0]);
  });
}
