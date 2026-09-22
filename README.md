# Engineering portfolio — Ilya

[**Russian version → engineering-showcase**](https://github.com/Ilyusa206/engineering-showcase)

I work as a systems administrator and build application software across backend, web, mobile, and operations. My work includes data and authorization models, realtime workflows, deployment, networking, storage, backup, and recovery. I consider **Full-stack**, **Backend**, **DevOps / Platform**, and **System / Infrastructure** roles separately; each calls for a different part of this portfolio.

## Run something first

[**Reference service — Fastify, PostgreSQL, integration tests**](examples/reference-service/README.md)

This small, standalone reconstruction exercises checksum migrations, authorization for the exact space requested, sequential and concurrent idempotency, a transactional outbox, worker retries and rollback, and database-backed readiness. It runs against real PostgreSQL:

```bash
cd examples/reference-service
docker compose --profile test run --rm test
```

The same tests run in [GitHub Actions](.github/workflows/validate.yml). The code establishes an authorization boundary after a test principal is supplied; it does **not** implement OIDC authentication.

## Start with these cases

| Case | Evidence and maturity |
|---|---|
| [Internal employee platform](cases/bic-hub/README.md) | Node.js, React, React Native, OIDC/RBAC, Socket.IO, migrations and delivery. The accepted production core is distinguished from later revisions. |
| [Commercial asynchronous service](cases/amorie/README.md) | Payment verification, PostgreSQL as durable state, BullMQ/FFmpeg workers and restart recovery. The live telephony integration has not passed provider acceptance. |
| [Multi-tenant finance and inventory](cases/monedo/README.md) | Fastify/Prisma, exact-space permissions, atomic operations, WebSocket invalidation and security tests. Released baseline: alpha. |
| [Infrastructure and disaster recovery](cases/infrastructure/README.md) | Proxmox, TrueNAS/iSCSI, network segmentation, an isolated restore drill and a real storage incident with explicit diagnostic limits. |

Each case states my contribution, project maturity, engineering decisions, public artifacts and what the public evidence cannot prove.

## More to inspect

- [Focused code samples](code-samples/README.md): RBAC, migrations, ledger, mobile sessions, realtime invalidation and Compose isolation.
- [Isolated VM restore runbook](infrastructure/backup-restore-runbook.md) and [storage incident analysis](infrastructure/incident-analysis.md).
- [WordPress migration pilot](cases/web-platform/README.md), [commercial web UI](cases/commercial-web/README.md) and [LiveKit LAN prototype](cases/realtime-meetings/README.md).

## Why the examples are reconstructed

The source applications and infrastructure records are private. Public examples preserve implemented engineering patterns in a new domain, with identities, endpoints, topology, business logic and data removed. They are clearly marked **sanitized reconstructions**, never presented as verbatim production code. See the [publication policy](SECURITY.md), [source map](SOURCE-MAP.md), [evidence by technology](STACK.md) and [background](ABOUT.md).
