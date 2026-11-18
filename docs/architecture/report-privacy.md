# Confidential report storage and takedown

UNI-044 keeps confidential case data in `unihood_private` and exposes only redacted receipts/status. `report_cases` stores target references, canonical P0/P1/P2 severity, held/suppressed/escalated/resolved/dismissed status and AES-256-GCM ciphertext for minimal evidence context. `report_appeals` encrypts the appellant reason separately. Neither table grants any public read; `REVOKE ALL` is applied and the API has no evidence-returning endpoint.

## Encryption

Evidence uses `REPORT_ENCRYPTION_KEY_HEX`, a 32-byte hex key, a random 12-byte nonce and a 16-byte authentication tag. AAD binds the case or appeal identifier so ciphertext cannot be substituted between records. Missing or malformed configuration fails new report/appeal writes with `503` before database access. The key is not logged, placed in DTOs, OpenAPI or history. Rotation/retention are not implemented; changing the key would not migrate existing ciphertext.

## Suppression and invalidation

Only obvious `PRIVATE_DATA_EXPOSED` on a current synthetic boarding or quarantined media and `INAPPROPRIATE_MEDIA` on media create a `report_suppressions` row. Boarding suppression sets the non-identifying `public.listings.public_suppressed` flag consumed by the public boarding query; media suppression is enforced by the private owner-media list/content queries. Suppression is reversible and audited. Every apply/restore increments `unihood_private.public_projection_revisions('reports')`; this monotonic revision is the invalidation contract for public report-derived projections. This repository has no persistent public cache/derivative service, so the counter plus no-store reads is the implemented boundary.

No suppression changes official prices, vacancy, ownership, contact, publication status or legitimate reviews. Restoration is a state transition, not a destructive delete.

## Appeals and operators

Reporters and affected property managers may open one private appeal per case. Decisions are restricted to the explicit `synthetic:operator` local/test fixture; production/staging, guest and unrelated-actor actions fail closed. No general admin dashboard, M5 restricted access, automatic ownership transfer, force-merge or notification system is added. Reporter identity never appears in status, history, notices, errors or audit-facing responses. Audit rows store only fixed redacted detail labels and synthetic actor references.

Retention periods, notification mechanics, final operator staffing and the exceptional-support relay implementation remain deferred decisions. `privacy-support@unihood.example` is a reserved documentation address, not a real service.
