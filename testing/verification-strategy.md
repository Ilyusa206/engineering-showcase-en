# Verification strategy

A passing unit test does not establish that migrations, containers, mobile artifacts or deployed workflows behave correctly. Each layer answers a different question.

| Layer | What it establishes | Example |
|---|---|---|
| Static | Syntax, types and configuration shape | TypeScript typecheck, Expo config validation |
| Unit | Local invariants and transitions | Permission matrix, state machine, token refresh |
| Integration | Database and adapter behavior | Migrations, row locks, payment verification |
| End-to-end | Multi-component user scenario | Multi-user isolation, CRM browser workflow |
| Build | Reproducible runnable artifact | Backend/frontend images, Android export |
| Runtime acceptance | Actual behavior in the target environment | OIDC login, WebSocket path, notifications |
| Recovery | Failure and restore path | Redis job reconciliation, isolated VM restore |

## Scenarios worth running

- Apply migrations to a clean database and repeat the migration command.
- Exercise two authorized users and an outsider to catch tenant and IDOR failures.
- Retry invitations, webhooks and idempotency keys, including concurrent requests.
- Restart a worker with pending work and reconstruct its queue from durable records.
- Test mobile offline/online transitions, background/foreground, token refresh and socket reconnect together.
- Set observable rollback triggers before a production change.
- Tie runtime acceptance to a commit and artifact checksum.

## Evidence boundary

Five distinct states are **implemented in source**, **automatically checked**, **buildable**, **deployed**, and **accepted in the target runtime**. This repository identifies which state a claim has reached instead of treating them as interchangeable.
