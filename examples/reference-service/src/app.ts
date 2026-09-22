/**
 * Sanitized reconstruction based on implemented systems.
 * Not verbatim production code.
 */

import Fastify, { type FastifyInstance } from "fastify";
import type { Pool } from "pg";

import { createRecord, getRecord, ServiceError } from "./service.js";

function header(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildApp(pool: Pool): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "not_ready" });
    }
  });

  app.post<{ Params: { spaceId: string }; Body: { title?: unknown } }>(
    "/v1/spaces/:spaceId/records",
    async (request, reply) => {
      const userId = header(request.headers["x-user-id"]);
      const idempotencyKey = header(request.headers["idempotency-key"]);
      if (!userId) throw new ServiceError(401, "authentication_required");
      if (!idempotencyKey) throw new ServiceError(400, "idempotency_key_required");
      if (typeof request.body?.title !== "string") {
        throw new ServiceError(400, "invalid_title");
      }
      const result = await createRecord(pool, {
        userId,
        idempotencyKey,
        spaceId: request.params.spaceId,
        title: request.body.title,
      });
      return reply.code(result.created ? 201 : 200).send(result);
    },
  );

  app.get<{ Params: { spaceId: string; recordId: string } }>(
    "/v1/spaces/:spaceId/records/:recordId",
    async (request) => {
      const userId = header(request.headers["x-user-id"]);
      if (!userId) throw new ServiceError(401, "authentication_required");
      return getRecord(pool, {
        userId,
        spaceId: request.params.spaceId,
        recordId: request.params.recordId,
      });
    },
  );

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ServiceError) {
      return reply.code(error.status).send({ error: error.code });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "internal_error" });
  });
  return app;
}
