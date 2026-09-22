# Focused code samples

These are short, labeled reconstructions of implemented patterns for technical discussion. They are not verbatim production files or a way to reconstruct the closed products. Validation, observability and surrounding layers are abbreviated where they do not clarify the specific decision.

For a connected end-to-end path with real PostgreSQL and integration tests, start with the [reference service](../examples/reference-service/README.md).

| Sample | Engineering question |
|---|---|
| [RBAC boundary](../backend/rbac-boundary.ts) | How is access checked for the exact space after identity is established? |
| [Recoverable outbox](../backend/recoverable-outbox.ts) | How is committed state projected into a queue with a stable job ID? |
| [Migration runner](../database/checksummed-migrations.ts) | How are applied migrations protected against edits and concurrent runs? |
| [Atomic ledger](../database/atomic-ledger.ts) | How are balance deltas, audit and idempotency committed together? |
| [PKCE session manager](../mobile/pkce-session-manager.ts) | How do secure storage and single-flight refresh interact? |
| [Realtime invalidation](../mobile/realtime-invalidation.ts) | How does reconnect preserve an authoritative API read path? |
| [Data-driven directory](../frontend/data-driven-directory.ts) | How are UI data and events separated while labels are escaped? |
| [Compose isolation](../devops/compose.yaml) | How are data services kept private and migrations gated? |
| [Reverse proxy](../devops/nginx.conf) | How are HTTP and WebSocket traffic routed? |

All paths resolve from this index and are checked by `npm run verify`.
