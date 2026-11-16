# University navigation API — UNI-010

Anonymous, read-only university/campus/gate data supports the later university picker. No map, boarding, discovery screen, routing, registration or administrative publishing workflow is implemented. Specification traceability: §§0.2/0.3, 5.1–5.2, 7.3–7.4, 8.5, Phase 1 UNI-010 and §13.1. The [five ADRs](../decisions/README.md) remain authoritative.

## Public routes

- `GET /api/v1/universities`: bounded university page; optional exact `slug` filter.
- `GET /api/v1/universities/{id}/campuses`: campuses under the UUID university.
- `GET /api/v1/universities/{id}/entrances`: gates under that university; optional UUID `campusId` must belong to it.

All accept optional wire-string `page` (1–9999999) and `pageSize` (1–100); defaults 1 and 20. Ordering is deterministic by name under PostgreSQL C collation, then UUID. Responses use the existing `{items, page: {page, pageSize, hasNextPage}}` contract; one extra row determines hasNextPage without an unbounded total-count query. A page beyond the end is empty. Universities and campuses are separately paginated rather than unbounded nested arrays. A slug lookup can return an empty page; path identifiers are UUIDs, not slugs. Landing/QR resolution belongs to UNI-011.

Unknown/repeated/invalid query parameters and invalid path IDs produce the existing redacted 400 VALIDATION_FAILED envelope. A missing/archived/nonpublic university or a campus outside it produces generic 404. An existing university without campuses/gates returns an empty page. Invalid configuration, missing tables and database errors/timeouts return redacted 503 SERVICE_UNAVAILABLE; liveness stays independent. All responses use no-store and server-generated request IDs. Exact deployed read behavior needs a migrated/configured database; no synthetic fallback masks outages.

The generated [OpenAPI 3.1 baseline](openapi.json) documents exactly the implemented methods, response schemas, UUID path parameters and query schemas. Export after building contracts/API:

```sh
node apps/api/dist/export-openapi.js > docs/api/openapi.json
```

The HTTP suite compares this file to live generation. Strict Zod schemas in packages/contracts validate inputs and output projections. Unknown internal fields fail serialization rather than leaking; public errors never reflect SQL, raw input, private keys or connection details.

## Sources and privacy

Every record has `provenance: {dataKind, sourceLabel, verifiedAt}`. SYNTHETIC records have null verifiedAt and database-enforced Synthetic-prefixed names. VERIFIED records require a nonblank source label and finite verification timestamp; timestamp output is UTC. The flag records a reviewed source assertion, not university endorsement, identity verification or property ownership. There is no public endpoint to set this flag; an actual data-import/review process and field verification remain future work.

Only active records with active, eligible ancestors are public. Synthetic records are returned only for compatible APP_ENV=local with NODE_ENV unset/development, or APP_ENV=test with NODE_ENV=test. Staging, production, unknown/missing APP_ENV and NODE_ENV=production exclude them at every relationship level. Verified records remain readable anonymously. Synthetic actor enablement and arbitrary user/role headers never grant authority or change these projections.

Gate coordinates are strictly public campus geometry. Queries project only university, campus and entrance fields; there is no residential/boarding/identity/contact/media join, spatial search, distance, route or private location input. A campus gate coordinate never authorizes publication of a boarding coordinate. Existing protected-write guards are unchanged; there are no university mutation routes.

## Synthetic data and operation

`infra/db/seeds/universities.synthetic.json` contains two fictional universities, two campuses and three gates with stable UUIDs. Names, source labels, city and public-area labels explicitly identify synthetic content. Country ZZ and coordinates around (0,0) are artificial test values, **not University of Moratuwa or any real campus/gate**. No real location has been verified or invented for this issue. Do not publish these fixtures as real pilot content. Future real data must have source/licensing/provenance review and validated public gate coordinates.

Use the existing `pnpm db:migrate` then `pnpm db:seed` locally with the existing guarded .env; no file is overwritten automatically. Seeding requires loopback, APP_ENV=local/test, non-production NODE_ENV and exact migration history/checksums. Both the original infrastructure fixture and university graph are inserted in one advisory-locked transaction. Fixed IDs, unique slugs and insert-then-compare prevent duplicates; concurrent seeds serialize. Any modified field, occupied slug/ID or late conflict aborts the whole seed without updating/deleting existing content. There is no reset/force option and no automatic startup migration/seed.

Migration `002_university_navigation` adds canonical UUID FKs with restricted deletes, unique slug, active-primary-per-campus uniqueness, status/provenance checks and parent/spatial indexes. Geometry(Point,4326), nonempty/valid checks and explicit latitude/longitude bounds reject bad coordinates before geography normalization can hide an error. This deliberately uses validated geometry rather than the specification's preferred geography proximity representation; no distance query is implemented. Future geographic calculations can explicitly cast validated points.

Rollback takes exclusive table locks and refuses **any populated table**, including synthetic rows; it drops only empty tables with RESTRICT in the runner's transaction. Concurrent writes cannot slip between the emptiness check and removal; external dependencies abort atomically. Extension SQL/ownership is untouched. A seeded development database therefore intentionally refuses rollback: preserve it and use a reviewed forward migration. The CLI redacts SQL exception text; this populated rollback guard reports failure code P0001 rather than dumping SQL details. Do not delete persistent rows/volumes or use CASCADE to force acceptance. Only the isolated test harness deletes its own synthetic rows in its proven disposable tmpfs database to exercise empty rollback/re-migration. See [database operations](../architecture/database.md).

## Verification boundary

`pnpm test` covers schemas, HTTP validation/projections, parameter binding, deployed fixture guards, absent writes and live/saved OpenAPI parity. `pnpm db:test` retains the original ownership/rollback/outage suite and adds real SQL constraints, concurrent/atomic seeds, parent isolation, archived filtering, deployed read policy and safe empty/populated/dependency rollback checks. [UNI-010 evidence](../verification/UNI-010/README.md) records actual execution. No UI, real campus field review, external provider or final authentication acceptance follows from these API tests.
