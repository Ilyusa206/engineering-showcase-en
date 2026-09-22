# Publication and security policy

This portfolio draws on private production, internal, commercial and personal systems. Public artifacts show the decisions without exposing the source environments or customers.

## What appears here

1. **Architecture descriptions** for product boundaries, operations and topology that cannot be reproduced safely as code.
2. **Sanitized reconstructions**: small new examples with changed names, identifiers, schemas and domain logic. Each source file is marked; it is not a verbatim production excerpt.
3. **Previously public snippets** only after a separate review for personal or customer data.

## Excluded material

- Secrets, tokens, credentials, private keys, cookies or `.env` contents.
- Private addresses and URLs, real hostnames, exact inventory or sensitive topology.
- Staff and customer records, order/payment records and personal data.
- Transaction prices, valuations, legal positions and negotiation material.
- Complete proprietary modules, database dumps, backup archives and configuration exports.

## Reconstruction labels

Focused samples begin with **“Sanitized reconstruction based on an implemented system. Not verbatim production code.”** The combined reference service uses **“Sanitized reconstruction based on implemented systems.”** Reconstructed behavior must still be traceable to implemented patterns; changing the subject matter does not justify adding unsupported capabilities.

## Automated gates and manual review

`npm run verify` checks relative Markdown links, case headings, nonempty Mermaid blocks, untranslated Cyrillic text, reconstruction labels and standalone TypeScript sample loading. It also scans SQL, Dockerfiles, fixtures and test sources for private IP ranges, common internal hostname suffixes, email addresses, non-allowlisted URL hosts, credential/JWT signatures and forbidden file types such as `.env`, private keys, dumps and archives. CI builds and runs the reference service against PostgreSQL and runs a high-severity production dependency audit.

The fixed PostgreSQL credentials in the example Compose file are for a disposable local test environment only. They are not production credentials. Automated scans complement a manual inspection of names, identifiers, domain details, diagrams and the entire public Git history. If a secret is exposed after publication, removing the current file does not remove it from history; assess exposure and rotate it.
