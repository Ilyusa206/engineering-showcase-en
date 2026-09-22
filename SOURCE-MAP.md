# Public artifacts and source traceability

Private repositories are the factual sources, not dependencies needed to inspect this portfolio. The public artifacts stand on their own and omit operationally sensitive details.

| Public artifact | Implemented pattern | Canonical private source | Publication boundary |
|---|---|---|---|
| [Employee platform](cases/bic-hub/README.md) | Modular backend, identity, realtime, web/mobile delivery and migrations | `bic-hub`; limited evidence-level methodology from `bic-hub-transaction` | No source modules, employee records, internal endpoints, topology or transaction documents |
| [Amorie](cases/amorie/README.md) | Payment verification, durable work, queues and recovery | `Amorie` | No provider secrets, orders, user data or commercial details |
| [Monedo](cases/monedo/README.md) | Exact-space authorization, finance/inventory transactions, mobile invalidation | `family-finance` | No user finances, deployment values or complete domain logic |
| [Infrastructure / DR](cases/infrastructure/README.md) | Network/storage boundaries, isolated restore and incident diagnosis | `BIC-Infrastructure-Docs` | No private IPs, hosts, locations, VM IDs, capacities or exact topology |
| [WordPress pilot](cases/web-platform/README.md) | Isolated reference clone, clean target and planned cutover | `webstaging` | No domains, hosting accounts, credentials, DNS records or client content |
| [Commercial web UI](cases/commercial-web/README.md) | Responsive embedded components and data-driven rendering | `vetclinic-site` | No staff names, assets, private media URLs or complete delivered code |
| [LAN meetings prototype](cases/realtime-meetings/README.md) | LiveKit provider boundary, trusted presence and LAN transport testing | Implemented working branch of `bic-meetings` | No internal DNS, VM identity or site-specific network exposure |
| [Reference service](examples/reference-service/README.md) | Real PostgreSQL migrations, exact-space permissions, idempotency, transactional outbox and recoverable work | `bic-hub`, `family-finance`, `Amorie`, notification foundation in `bic-notifications` | A new standalone domain; no original schemas, endpoints, business logic or provider configuration |
| [Focused samples](code-samples/README.md) | Interview-sized implementations of the patterns above | Repositories mapped above | No proprietary naming or product-complete logic |

The [sample index](code-samples/README.md) points to the actual files in `backend/`, `database/`, `mobile/`, `frontend/` and `devops/`.

## Reviewed sources without a separate case

- `bic-notifications`: substantial foundation, but the live transport is intentionally disabled; no production deployment claim. Its recoverable outbox pattern informs a labeled reconstruction.
- `Forge`: an implemented MVP in a feature branch, but a weaker independent proof than the application cases above.
- `bic-cloud-theme`: substantial Nextcloud theming work, peripheral to the selected application and infrastructure tracks.
- `freelance-workspace`: work organization and positioning, not a distinct engineering implementation.

The `bic-hub-transaction` source contributes only product decomposition, evidence levels, handover and scope thinking. Prices, valuations, legal strategy, negotiations and internal management documents are excluded.
