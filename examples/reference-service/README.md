# Runnable backend reference service

This standalone service combines patterns from implemented private systems in a deliberately new, minimal domain. It is **a sanitized reconstruction**, not a product component or verbatim production source.

## What you can verify

| Path | Implementation | Integration evidence |
|---|---|---|
| Repeatable migrations | PostgreSQL checksum history, advisory lock and one transaction per migration | Runner invoked twice; recorded filenames checked |
| Tenant boundary | Active membership for the exact requested `spaceId`; inaccessible space returns `404` | Outsider mutation creates no record |
| Idempotency | `actor + key` serialized; hash includes payload and `spaceId` | Sequential and concurrent retries create one record/event; changed payload or space returns `409` |
| Transactional outbox | Record, idempotency record and event commit together | Row counts checked after retries |
| Durable work | `FOR UPDATE SKIP LOCKED`, stable job ID, bounded backoff and savepoint rollback | Processing, failed handler, rolled-back side effects and successful retry checked |
| Readiness | Liveness separate from a PostgreSQL-backed readiness query | `/health/ready` integration test |

```mermaid
flowchart TD
    C["HTTP client"] --> A["Fastify API"]
    A --> P["Exact-space permission"]
    P --> T["PostgreSQL transaction"]
    T --> R["Record + idempotency key"]
    T --> O["Outbox event"]
    W["Durable worker"] --> O
    W --> E["Processed event"]
```

The path is implemented in `src/app.ts`, `src/service.ts` and `src/outbox.ts`; migrations are in `migrations/` and assertions are in `test/`.

## Run with Docker Compose

Requires Docker and the Compose plugin. From **this directory**:

```bash
docker compose --profile test run --rm test
docker compose up --build -d
curl -fsS http://127.0.0.1:4100/health/ready
```

Create a record in `space-alpha`:

```bash
curl -fsS -X POST http://127.0.0.1:4100/v1/spaces/space-alpha/records \
  -H 'content-type: application/json' \
  -H 'x-user-id: user-owner' \
  -H 'idempotency-key: demo-1' \
  -d '{"title":"Example record"}'
```

Repeat this request to receive the same `record.id`. Substitute `user-outsider` to receive `404`: that user belongs only to `space-beta`. Inspect the worker's result and remove the disposable data:

```bash
docker compose exec postgres psql -U showcase -d showcase -c \
  "SELECT job_id, event_type, processed_at IS NOT NULL AS processed FROM outbox_events;"
docker compose down -v
```

## Run against an available PostgreSQL instance

```bash
npm ci
DATABASE_URL=postgresql://showcase:showcase@127.0.0.1:5432/showcase npm run migrate
DATABASE_URL=postgresql://showcase:showcase@127.0.0.1:5432/showcase npm run migrate
DATABASE_URL=postgresql://showcase:showcase@127.0.0.1:5432/showcase npm test
```

[CI](../../.github/workflows/validate.yml) runs typecheck, build, the repeated migration, PostgreSQL tests, Compose validation and a production dependency audit.

## Provenance and scope

- BIC Hub: ordered migrations, checksum/advisory-lock contract and deployment checks.
- Monedo: exact-space permission boundary, multi-user/IDOR checks and atomic mutations.
- Amorie and notification foundation: durable database state, recoverable work, retry and deterministic job identity.

`x-user-id` is **test authentication** that supplies a principal. The service demonstrates authorization *after* principal establishment; it does not implement OIDC or validate real identity tokens. Redis/BullMQ, realtime and UI are represented by separate case descriptions and focused samples, not by this executable service.
