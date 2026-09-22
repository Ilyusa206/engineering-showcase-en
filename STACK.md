# Technology and evidence

This is a map to implemented work, not a list of every technology I have encountered. Private-case descriptions are paired with public artifacts where an implementation detail can be inspected.

| Area | Implemented technologies and practices | Best starting point |
|---|---|---|
| Backend | Node.js, TypeScript, Express, Fastify, Zod | [Runnable service](examples/reference-service/README.md), [BIC Hub](cases/bic-hub/README.md), [Amorie](cases/amorie/README.md) |
| Web | React, Next.js, Vite | [BIC Hub](cases/bic-hub/README.md), [Amorie](cases/amorie/README.md) |
| Mobile | React Native, Expo, Expo Router, TanStack Query, SecureStore | [BIC Hub](cases/bic-hub/README.md), [Monedo](cases/monedo/README.md), [session sample](mobile/pkce-session-manager.ts) |
| Data | PostgreSQL, SQL, Prisma, constraints, migrations | [Runnable migrations](examples/reference-service/migrations/001_initial.sql), [Monedo](cases/monedo/README.md) |
| Queues and cache | Redis, BullMQ, recovery and deterministic job IDs | [Amorie](cases/amorie/README.md), [outbox sample](backend/recoverable-outbox.ts) |
| Realtime | Socket.IO, WebSocket, delivery/read and presence events | [BIC Hub](cases/bic-hub/README.md), [invalidation sample](mobile/realtime-invalidation.ts) |
| Identity | Keycloak, OIDC, OAuth 2.0/PKCE, JWT and refresh rotation | [BIC Hub](cases/bic-hub/README.md), [mobile session sample](mobile/pkce-session-manager.ts) |
| Authorization | RBAC, resource membership, tenant isolation | [Reference service](examples/reference-service/README.md), [Monedo](cases/monedo/README.md) |
| Delivery | Docker Compose, Nginx, GitHub Actions, health and migration gates | [CI](.github/workflows/validate.yml), [Compose sample](devops/compose.yaml) |
| Infrastructure | Linux, Proxmox VE/PBS, TrueNAS, iSCSI, VLAN, VPN | [Infrastructure case](cases/infrastructure/README.md) |
| Recovery | Backup verification, isolated restore, dependency-aware DR | [Restore runbook](infrastructure/backup-restore-runbook.md) |
| Web platforms | Nginx, PHP, MariaDB, WordPress migration | [Migration pilot](cases/web-platform/README.md) |

## Executable evidence

The [reference service](examples/reference-service/README.md) brings Fastify, PostgreSQL migrations, exact-space authorization, idempotency, an outbox, worker retries and integration tests into one runnable path. It represents patterns from several implemented systems in a deliberately new domain.

## Maturity boundaries

- LiveKit/WebRTC: tested LAN technical prototype, with external A/V acceptance still open.
- Amorie: operational order/payment flow and implemented asynchronous subsystem; live telephony remains off pending external-provider acceptance.
- Monedo: released alpha baseline plus later feature work, not a mature production deployment.
- WordPress platform: working pilot; final cutover remains a separate step.
- Infrastructure diagrams: generic labels only, with actual sites, addresses, inventory and capacities omitted.
