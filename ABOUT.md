# About Ilya

My formal role is systems administrator. I also design and implement application projects: APIs, web and mobile clients, databases, integrations, delivery and production operations. The common thread is owning the boundary between a working feature and a system another engineer can deploy, operate and recover.

## Engineering approach

- Keep durable business state in PostgreSQL or another deliberately chosen system of record. Treat queues and caches as recoverable projections.
- Enforce authorization on the server for the exact tenant and resource requested.
- Make retryable operations idempotent and state transitions explicit.
- Distinguish implemented, tested, buildable, deployed and accepted in the runtime environment. Each is a separate claim.
- Set success criteria, stop conditions and rollback triggers before a production change.
- Test a restore path rather than counting backup jobs as proof of recovery.
- Record unknown RPO/RTO, deployment state and acceptance gaps as unknowns.

## Role-specific paths

| Role | Where to start |
|---|---|
| Full-stack | [Employee platform](cases/bic-hub/README.md), [Amorie](cases/amorie/README.md), [Monedo](cases/monedo/README.md) |
| Backend | [Reference service](examples/reference-service/README.md), [Amorie](cases/amorie/README.md), [Monedo](cases/monedo/README.md) |
| DevOps / Platform | [CI](.github/workflows/validate.yml), [Compose isolation](devops/compose.yaml), [migration pilot](cases/web-platform/README.md) |
| System / Infrastructure | [Infrastructure case](cases/infrastructure/README.md), [restore runbook](infrastructure/backup-restore-runbook.md), [incident analysis](infrastructure/incident-analysis.md) |

These paths are alternatives for different positions, rather than one universal job title. GitHub: [Ilyusa206](https://github.com/Ilyusa206).
