# Public boarding advertisement previews — UNI-031

`GET /api/v1/boardings` and `GET /api/v1/boardings/:id` are guest-readable, no-store, bounded read endpoints. The ID is the canonical property UUID, not an advertisement revision or private location. Missing/ineligible/archived/disputed/merged properties have the same generic 404; errors contain no submitted values, SQL or private content. No boarding mutation, contact, map or nearby endpoint is implemented here. Anonymous/header-selected writes remain unavailable.

This development slice publishes **curated synthetic local/test previews only**, separately stored from unreviewed titles/descriptions, private location/building relationships and media. Production/staging exclude synthetic previews through the existing repository environment policy. There is no real accommodation inventory, verified owner, official rent, confirmed vacancy or public destination. `ownerVerified:true` is the inherited owner-variant contract shape for the guarded synthetic fixture state, not a new identity assertion; the UI says “Owner-posted · synthetic authority only.” Do not ingest real data into this preview path.

## Filters and responses

List accepts optional single-valued `q` (trimmed 1–120 characters), `publisherKind` (`OWNER_OFFICIAL` / `COMMUNITY_RECOMMENDATION`), `visibility` (`AREA_ONLY` / `HIDDEN`), `sort` (`newest` / `title`), `page` and `pageSize`. Defaults are newest, page 1, page size 12; limits and strict rejection are inherited from the shared pagination contract. Search uses only curated public title/locality, with SQL wildcard characters escaped. Unknown/repeated fields, spatial filters, distance sorting, PUBLIC_MAP and forged authority fields are rejected. One extra row determines `hasNextPage`; no unbounded or private-derived total is exposed. Order ties use canonical ID. Detail has no query parameters.

Each item is `{listing, summary, updatedAt}`. `listing` narrows the UNI-030 variants to synthetic AREA_ONLY/HIDDEN only, with canonical `id`, separate `listingId`, source/privacy badges and explicit SYNTHETIC provenance. Summary and timestamp come only from the curated preview, not raw entities. Price is null, vacancy UNKNOWN, entrance/distance/route null, hidden locality null. Strict validation and current-clock normalization run before serialization. OpenAPI documents only implemented GETs and exact shared contracts.

Eligibility rechecks ACTIVE canonical BOARDING, no merge, current PUBLISHED revision, synthetic data, matching property/revision/preview visibility and current consented area label. Owner-style fixtures additionally require LOCAL_TEST_AUTHORIZED metadata. Revocation/status/source mismatch suppresses the entire stale preview on the next no-store read. This is not final owner authorization, content moderation, revocation-cache infrastructure or comprehensive UNI-039 acceptance. No query joins private tables or raw descriptions/inventory.

## Safe local demonstration

After the normal local database setup, run:

```sh
pnpm db:migrate
APP_ENV=local pnpm db:seed:boardings
pnpm dev
```

Open `/advertisements`. Four fixed fictional previews demonstrate owner/community and area/hidden combinations. The optional command requires loopback PostgreSQL, APP_ENV local/test and non-production NODE_ENV; it checks the exact migration ledger/checksums and uses one advisory-locked transaction. Repeated seeds verify existing values; conflicts abort without overwriting local edits. Normal `db:seed` remains unchanged. No persistent developer database was migrated/seeded during agent verification; tests use uniquely owned tmpfs targets. A populated migration 008 rollback refuses; preserve previews and use a reviewed forward migration rather than deleting them to roll back.

## Remaining boundaries

PUBLIC_MAP rendering/eligibility belongs to UNI-033/034. Actual owner publication, pricing, vacancy and media/contact/audit workflows remain UNI-032–037 and final authorization remains Phase 7. The curated preview table has no application writer: SQL shape checks cannot certify arbitrary text safe. Future real-data publication requires its own reviewed content/consent/authorization pipeline and migration; never copy raw entity fields or treat this table name as approval. No boarding save/comparison, fake gallery, request-location form, directions, reviews or unsupported price/room filters are offered in this slice.

[Architecture](../architecture/boarding-privacy.md), [UI behavior](../ui/boarding-advertisements.md), [verification](../verification/UNI-031/README.md).
