# Public POI database foundation — UNI-020

Specification §§5.1–5.5, 6.1, 8.5 and §10 UNI-020; M2 ownership. This migration provides storage for subsequent UNI-021 public query APIs, not an import, publication, duplicate-scoring or boarding workflow. The five ADRs and existing production write guards are unchanged.

## Schema and identities

Migration `003_public_poi_foundation` adds `poi_categories`, `buildings`, `places`, `public_place_locations`, `place_source_refs` and `place_aliases`. Canonical identities are UUIDs; category codes are bounded lowercase lookup keys with labels, without prematurely hard-coding an international taxonomy. Category rows will be inserted by reviewed data tooling; this migration inserts no live or synthetic inventory into persistent databases.

A POI requires an existing category; a building is optional and can host many independent places. Names and coordinates are intentionally not unique and never cause an automatic merge. Status/provenance/timestamps are constrained; SYNTHETIC place names have a Synthetic prefix and null verification timestamp. VERIFIED metadata requires a source and finite verification timestamp, not a claim of owner authority. Future writers maintain updated_at explicitly; no publishing endpoint is introduced here.

Aliases preserve original Unicode text plus a separately supplied normalized matching key, unique per place rather than globally. Normalization/scoring belongs to UNI-023; this migration does not claim to implement it. Imported source references require provider/license metadata and have a partial unique `(provider, external_id)` index for non-null external IDs. Null external IDs do not assert a provider identity. Provider/version/license metadata does not authorize scraping or establish external-service consent. Canonical merge links are restricted foreign keys with self-link/status checks; no merge routine, automatic transfer or destructive fuzzy deduplication is introduced. Cycle detection/reversal/audit belongs to the later controlled merge workflow, not arbitrary public writes.

## Public geometry and privacy

Both optional public building points and required public POI entrance points use `geometry(Point,4326)` with nonempty, valid and explicit longitude/latitude bounds. This follows UNI-010's validated geometry strategy: geography's coordinate normalization must not hide invalid input. GiST indexes support spatial filtering; later metric searches can use an explicitly reviewed geography cast/index. No distance computation, proximity sorting or routing exists in this issue.

Public locations use a composite foreign key to an **ACTIVE POI**. BOARDING geometry is categorically rejected, and a POI with a published point cannot be changed to a boarding/archived/merged row until its public-location row is removed transactionally. BOARDING places cannot link to public buildings at this stage, preventing indirect residential-coordinate inference. Future authorized PUBLIC_MAP boarding support requires a separate reviewed migration enforcing owner consent/authority; no early permissive shortcut. Private boarding fields, contacts, evidence and official prices/vacancies are absent.

GiST indexes cover building/public entrance geometry; GIN pg_trgm indexes cover normalized place names/aliases; category/status, building, merge-target and source-place indexes support future bounded reads. No public serializer or read route is added in UNI-020; UNI-021 must filter publication/provenance and use strict shared contracts before exposing POIs. Existing university APIs/MapLibre/favourites and protected-write interfaces are unchanged.

## Migration and data preservation

Use the existing locked, checksummed, transactional `pnpm db:migrate` runner. Earlier migration files and extension ownership remain immutable. Down migration locks all six new tables, refuses any populated table (including categories), then drops empty objects in dependency order with RESTRICT. It never deletes rows, cascades extensions or deletes persistent storage. External dependent objects abort the whole down transaction; populated rollback requires a reviewed forward migration instead of a reset.

At UNI-020, `pnpm db:seed` remained university/infrastructure-only; [UNI-021](../api/places.md) subsequently adds four guarded synthetic POIs/categories/public points without changing this migration; no new real campus/business coordinates are invented. Synthetic pharmacy/restaurant/clinic/hardware, shared-building/alias/source fixtures near (0,0) are generated exclusively inside `pnpm db:test`'s proven disposable database and removed only there for rollback testing. This is not a public data import or deterministic development POI seed command.

See [UNI-020 verification](../verification/UNI-020/README.md) for actual command results, constraints/concurrency/rollback coverage and limits. Persistent development migrations were not run as part of verification; the existing database/data remain intact.

## UNI-023 metric candidate index

Paired migration `004_public_poi_geography_index` adds only a GiST expression index on `public_place_locations.entrance_geo::geography` for metre-based candidate queries. It does not rewrite old migration 003, stored names, rows, consent or extension ownership. The new down migration drops only its index and safely succeeds with populated POIs; the older 003 populated-table guard still refuses data deletion. Apply in order with `pnpm db:migrate`; never reset persistent storage. Transactional creation may take a write lock, so production scheduling is a separate reviewed operation. [Matching policy, limits and fixture coverage](poi-duplicate-matching.md).

UNI-025 migration 005 adds [private pending intent/idempotency storage and exact source collision guards](poi-submission-transactions.md). Canonical source rows remain intact; public POI projections exclude pending storage. Populated rollback refuses rather than deleting pending history.
