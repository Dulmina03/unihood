# Public POI category layers — UNI-021

Anonymous read-only foundation, specification §10 UNI-021 and §§5.2/5.4/7.3/8.5; all five ADRs remain unchanged. No new contribution, boarding, detail/nearby-distance, duplicate-scoring or registration workflow.

## REST contract

- `GET /api/v1/places`: required `bbox=west,south,east,north` decimal degrees. Longitude −180..180, latitude −90..90, increasing bounds, maximum width/height one degree. Antimeridian-wrap boxes, exponent/NaN/infinite/empty/duplicate/unknown fields are rejected with redacted 400. This is a public spatial window, never a boarding origin or a promised walking radius.
- Optional `category` is an exact bounded lowercase code, `q` is trimmed literal name/alias text (1–100 characters), `sort=name|newest`, `page=1..10000`, `pageSize=1..100`; defaults name/1/20. Wildcards are escaped, values are SQL parameters. Stable ties use UUID; name ordering uses PostgreSQL C collation. OFFSET is bounded below one million, one extra row supplies hasNextPage; there is no unbounded total-count query. This is literal search, not UNI-023 fuzzy matching.
- `GET /api/v1/place-categories?bbox=...`: distinct categories of currently eligible public POIs in the same bounded window, ordered by code. At most 100 rows; page metadata explicitly indicates more rather than silently asserting completeness. The UI reports this metadata limit. An unknown category/filter or beyond-end page returns an empty public result, not invented inventory.

Both routes return strict shared Zod pages and no-store/request-ID headers. Public POI fields: canonical UUID, literal kind POI, name, category code/label, explicit public entrance coordinate, source provenance and nullable lastConfirmedAt. No contact/identity, building links, aliases/fingerprints, internal source IDs, boarding payload, route or distance is serialized. Active POIs with an explicit public-location row are eligible; archived/pending/merged/unlisted records and all BOARDING records are excluded. Synthetic data is included only under the existing compatible local/test environment policy; staging/production/missing/unknown environments exclude it. VERIFIED source assertions do not imply property ownership or endorsement.

Unavailable DB/migration results give sanitized 503; malformed internal DTOs fail closed rather than leaking unknown fields. No mutation controller exists. Arbitrary actor/owner headers grant no authority. The updated OpenAPI generator marks required query fields (bbox) accurately; saved baseline is generated from implemented controllers, not speculative endpoints.

## Exploration and sharing

`/explore` → choose a public entrance → Essentials. It requests a bounded ±0.01-degree window around that already-public gate (clamped at legal coordinate edges, no antimeridian wrap). No GPS, private boarding coordinate, distance estimate or proximity ordering is used. Category/name/sort/20-row pages are functional; the map shows only that current page, with the same strict points as its list. Layer switching clears incompatible public POI selection; changing an entrance resets POI page/selection. A selected place absent from the current filtered page has an explicit clear-selection state, not an invented fallback coordinate.

Additional validated URL fields: poiCategory, poiSort=name|newest, poiPage=1..10000 and canonical place UUID. They round-trip with existing university/campus/entrance/category/q/view state. Reload/Back/Forward/share restore state; no new sensitive favourite snapshot is stored. Guest favourites remain public-gate-only from UNI-014; POI detail/nearby service cards belong to UNI-022. Basic public name/category selection preview is used here without future workflow controls.

Next same-origin `/api/places` and `/api/place-categories` adapters validate query/output, pagination/category/bounds, use the fixed configured upstream, refuse redirects and forward no incoming cookies/auth/identity headers. Error text is generic. Client reads abort on change/unmount, ignore stale completion and time out with retry; map failure preserves the list, desktop rail/tablet collapse/mobile sheet and existing Map/List controls.

## Local synthetic data

After updating code, use existing `pnpm db:up`, `pnpm db:migrate`, `APP_ENV=local pnpm db:seed`, then `APP_ENV=local NODE_ENV=development pnpm dev`. Preserve existing .env and extension ownership; never delete a volume or use rollback to reset seeded data. MAP_PROVIDER=openfreemap/MAP_STYLE=liberty is the existing explicit live-map opt-in, subject to [provider documentation](../ui/maps.md); disabled retains usable lists.

The guarded seed now inserts four labeled fictional POIs (pharmacy, restaurant, clinic, hardware), four reference categories and public points around (0,0) from `infra/db/seeds/places.synthetic.json`. These are not Sri Lankan businesses/campuses or verified availability/medicine stock. Names/source labels explicitly say synthetic; nothing is imported from a live provider. Existing fixed-ID/transaction/lock/checksum guards retain local edits and refuse conflicts without overwriting data; repeat seeds retain original timestamps. Applied migration 003 is not edited. Populated POI/category rollback deliberately refuses; use a reviewed forward migration.

[UNI-021 verification](../verification/UNI-021/README.md) distinguishes real Nest/PostGIS reads from synthetic HTTP browser fixtures and mocked MapLibre resources. This feature does not verify real provider coverage, real-world POIs, human screen-reader/device usability or launch readiness.
