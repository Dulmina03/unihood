# Synthetic owner inventory and official LKR fees — UNI-035

[Specification](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#phase-3--boardings-advertisements-privacy-and-vacancy-m3m1m2), [property authority ADR](../decisions/0003-property-specific-owner-authority.md), [OpenAPI](openapi.json), [verification](../verification/UNI-035/README.md).

Only the existing, separately installed fictional owner property A is editable through issued loopback local/test actors. No real ownership proof, account or production writer is implemented. Students and unrelated owners cannot set official fees. Map publication/consent is independent: HIDDEN and AREA_ONLY owners can share unit capacities and fees without exposing residence geometry. Deployment environments deny synthetic reads and writes.

- Public `GET /api/v1/boardings/:id/units` accepts page/pageSize only and returns strict bounded current public unit facts. No geometry, owner identity, free-text labels, internal actor history, proximity or raw available-bed count is queried or returned. Capacity is never vacancy; availability is UNKNOWN.
- Protected `GET /api/v1/owner/boardings/:boardingId/inventory` loads curated units, property inventory revision, unit versions and the latest 20 fee revisions per unit.
- Protected `GET /api/v1/owner/boardings/:boardingId/units/:unitId/prices` pages through complete retained fee history, including scheduled revisions. It requires management of the exact property and unit.
- Protected `POST /api/v1/owner/boardings/:boardingId/units` uses expectedInventoryRevision, a closed synthetic room template and integer capacity. PATCH `.../units/:unitId` uses expectedRevision. No availability input, arbitrary label or address is accepted.
- Canonical protected `POST /api/v1/boardings/:id/prices` requires property management AND official-price permission. Input includes unitId, expectedPriceRevision, currency LKR, period MONTH, basis ROOM/BED, integer rentMinor/depositMinor, utility/meal terms, effectiveAt and reason. One LKR is 100 minor units; decimal UI input is parsed without floating rounding. Null deposit means not shared; zero means explicitly zero. No guessed rent or payment workflow.

Writes lock the property and unit, verify current eligibility, and append price revisions atomically with the version increment. Stale replay/concurrent writes return 409. The first price reason must be INITIAL; later revisions use CORRECTION/FEE_CHANGE. Public current price selects the latest effective date not after database current time, breaking ties by revision. Scheduled fees remain owner-visible but do not prematurely become public current fees. History is append-only through these APIs; this is not a claim of immutable storage against database administrators.

Migration 010 adds paired ordered SQL and preserves all existing unit rows and migrations 001–009. Existing units gain no curated public template automatically. Rollback refuses populated pricing or changed inventory/version metadata and dependency conflicts, preserving data without CASCADE or extension changes.

## Local synthetic demonstration

Follow existing [local actor setup](contracts-and-actors.md) and [optional owner fixture preparation](boarding-map.md). After reviewing the new migration, run `pnpm db:migrate`; the optional initial owner fixture uses `APP_ENV=local pnpm db:seed:boardings --owner-demo`. Never reset an existing property to satisfy a seed conflict. Start the explicit local owner-a loopback API and web using the existing environment configuration. Do not commit `.env`.

Visit `/owner`, then Rooms & capacities. Load inventory, add a fictional room with declared capacity, and optionally edit its capacity. Fees & history requires deliberate unit selection. Enter fictional monthly LKR rent, optional deposit, per-room/per-bed basis, utility/meal disclosure and Asia/Colombo effective date. Saving reloads server facts; ambiguous errors clear editable data and require a deliberate reload before retry. Earlier history pages remain reachable. Public room facts at `/boardings/00000000-0000-4000-8000-000000000001/rooms` show current effective fees and UNKNOWN availability. No inventory/history draft is persisted in browser storage. Other property IDs are not granted authority by visiting these URLs.

All fixture facts are synthetic. No real listing, room offer, verified ownership, confirmed vacancy, coordinate or distance is asserted. Vacancy confirmation/expiry is UNI-036; media/contact, fuller boarding comparison and final authentication remain later issues.
