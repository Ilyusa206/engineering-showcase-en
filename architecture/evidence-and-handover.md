# Evidence levels and handover

This method comes from actual product passport and handover work. Financial terms, legal strategy and internal management documents are excluded.

## Assess each dimension separately

| Dimension | Question |
|---|---|
| Implementation | Is there substantive end-to-end code? |
| Integration | Does it use the actual identity, data and adjacent systems? |
| Verification | Do checks cover critical behavior? |
| Build readiness | Can a runnable artifact be built from the exact revision? |
| Deployment evidence | Is that revision known to be installed in the target environment? |
| Runtime acceptance | Was a real user or business flow exercised there? |
| Documentation | Could another engineer safely operate and change it? |

A merge into a release branch does not prove deployment or runtime acceptance. Conversely, a working module does not disappear just because its latest revision lacks a separate acceptance record.

## Handover checklist

- Exact repositories, branches, commit SHAs and artifact hashes.
- Module inventory with explicit exclusions.
- Dependencies and open-source license inventory.
- Schema migrations and data/export boundaries.
- Staging and production deployment topology at an appropriate disclosure level.
- Build, deploy, rollback, backup and restore procedures.
- Mobile release/update process where applicable.
- Known limitations, technical debt and missing evidence.
- Objective acceptance criteria and a bounded transition/support scope.
- Transfer of access ownership without placing credentials in Git.

This makes a release assessable against an exact baseline and keeps unknown runtime facts visible until verified.
