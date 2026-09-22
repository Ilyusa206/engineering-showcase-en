/**
 * Sanitized reconstruction based on implemented systems.
 * Integration tests use fictional fixtures only.
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";

import { buildApp } from "../src/app.js";
import { createPool } from "../src/db.js";
import { runMigrations } from "../src/migrate.js";
import { processOneEvent } from "../src/outbox.js";

describe("reference service", () => {
  let pool: Pool;
  let app: FastifyInstance;

  before(async () => {
    pool = createPool();
    await runMigrations(pool);
    assert.deepEqual(await runMigrations(pool), []);
    const history = await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations ORDER BY filename",
    );
    assert.deepEqual(history.rows.map((row) => row.filename), [
      "001_initial.sql",
      "002_demo_fixtures.sql",
    ]);
    app = buildApp(pool);
    await app.ready();
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE processed_events, outbox_events, idempotency_keys, records, memberships, spaces CASCADE",
    );
    await pool.query(
      `INSERT INTO spaces(id, name) VALUES ('space-alpha', 'Alpha'), ('space-beta', 'Beta')`,
    );
    await pool.query(
      `INSERT INTO memberships(space_id, user_id, role)
       VALUES ('space-alpha', 'user-owner', 'owner'), ('space-beta', 'user-outsider', 'owner')`,
    );
  });

  after(async () => {
    await app.close();
    await pool.end();
  });

  test("readiness queries PostgreSQL", async () => {
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ready" });
  });

  test("exact-space boundary blocks a foreign tenant", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/spaces/space-alpha/records",
      headers: { "x-user-id": "user-outsider", "idempotency-key": "attempt-1" },
      payload: { title: "Foreign record" },
    });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), { error: "space_not_found" });
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM records")).rows[0].count, 0);
  });

  test("repeating an idempotency key does not duplicate record or outbox event", async () => {
    const request = {
      method: "POST" as const,
      url: "/v1/spaces/space-alpha/records",
      headers: { "x-user-id": "user-owner", "idempotency-key": "create-1" },
      payload: { title: "Test record" },
    };
    const created = await app.inject(request);
    const repeated = await app.inject(request);

    assert.equal(created.statusCode, 201);
    assert.equal(repeated.statusCode, 200);
    assert.equal(created.json().record.id, repeated.json().record.id);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM records")).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM outbox_events")).rows[0].count, 1);

    const conflict = await app.inject({ ...request, payload: { title: "Different payload" } });
    assert.equal(conflict.statusCode, 409);
    assert.deepEqual(conflict.json(), { error: "idempotency_key_reused" });
  });

  test("concurrent requests with one key create one result", async () => {
    const request = {
      method: "POST" as const,
      url: "/v1/spaces/space-alpha/records",
      headers: { "x-user-id": "user-owner", "idempotency-key": "concurrent-1" },
      payload: { title: "Concurrent record" },
    };
    const responses = await Promise.all([app.inject(request), app.inject(request)]);

    assert.deepEqual(
      responses.map((response) => response.statusCode).sort(),
      [200, 201],
    );
    assert.equal(responses[0].json().record.id, responses[1].json().record.id);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM records")).rows[0].count, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM outbox_events")).rows[0].count, 1);
  });

  test("same key cannot be reused across spaces", async () => {
    await pool.query(
      "INSERT INTO memberships(space_id, user_id, role) VALUES ('space-beta', 'user-owner', 'owner')",
    );
    const first = await app.inject({
      method: "POST",
      url: "/v1/spaces/space-alpha/records",
      headers: { "x-user-id": "user-owner", "idempotency-key": "cross-space-1" },
      payload: { title: "Record" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/v1/spaces/space-beta/records",
      headers: { "x-user-id": "user-owner", "idempotency-key": "cross-space-1" },
      payload: { title: "Record" },
    });

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 409);
    assert.deepEqual(second.json(), { error: "idempotency_key_reused" });
  });

  test("worker processes durable event once", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/spaces/space-alpha/records",
      headers: { "x-user-id": "user-owner", "idempotency-key": "worker-1" },
      payload: { title: "Worker event" },
    });

    assert.equal(await processOneEvent(pool), true);
    assert.equal(await processOneEvent(pool), false);
    const processed = await pool.query<{
      count: number;
      job_id: string;
    }>("SELECT count(*)::int AS count, min(job_id) AS job_id FROM processed_events");
    assert.equal(processed.rows[0]?.count, 1);
    assert.match(processed.rows[0]?.job_id ?? "", /^outbox:/);
    const event = await pool.query<{ attempts: number; processed: boolean }>(
      "SELECT attempts, processed_at IS NOT NULL AS processed FROM outbox_events",
    );
    assert.deepEqual(event.rows[0], { attempts: 1, processed: true });
  });

  test("handler failure rolls back side effects and schedules retry", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/spaces/space-alpha/records",
      headers: { "x-user-id": "user-owner", "idempotency-key": "retry-1" },
      payload: { title: "Retry event" },
    });
    await processOneEvent(pool, async (client, event) => {
      await client.query(
        `INSERT INTO processed_events(outbox_id, job_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        [event.id, event.job_id, event.event_type, event.payload],
      );
      throw new Error("temporary_failure");
    });

    assert.equal((await pool.query("SELECT count(*)::int AS count FROM processed_events")).rows[0].count, 0);
    const retry = await pool.query<{ attempts: number; last_error: string; processed: boolean }>(
      "SELECT attempts, last_error, processed_at IS NOT NULL AS processed FROM outbox_events",
    );
    assert.deepEqual(retry.rows[0], {
      attempts: 1,
      last_error: "temporary_failure",
      processed: false,
    });

    // Advance the scheduled retry without slowing down the integration suite.
    await pool.query("UPDATE outbox_events SET available_at = now() - interval '1 second'");
    assert.equal(await processOneEvent(pool), true);
    const completed = await pool.query<{
      attempts: number;
      last_error: string | null;
      processed: boolean;
    }>("SELECT attempts, last_error, processed_at IS NOT NULL AS processed FROM outbox_events");
    assert.deepEqual(completed.rows[0], { attempts: 2, last_error: null, processed: true });
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM processed_events")).rows[0].count, 1);
  });
});
