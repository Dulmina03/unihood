# Structured reports, takedown and appeals (UNI-044)

Protected synthetic local/test flow. No anonymous production mutation, public allegation, ownership transfer, official fact edit or general admin dashboard is introduced. Final authentication and the restricted M5 operator workflow remain deferred.

## Policy

- Normal reports need an authenticated, authorized contributing actor. Deployed/staging/unknown actors fail closed.
- Urgent unauthenticated privacy exposure uses the documented exceptional-support relay `privacy-support@unihood.example` (reserved documentation address; final contact is a launch obligation), never an API authentication bypass.
- Canonical severity is `P0`/`P1`/`P2`, separate from `SubmissionRisk`.
- Reporters and affected property managers may appeal without seeing reporter identities. Appeal decisions are restricted to the explicit `synthetic:operator` fixture until M5 exists.
- Only obvious private-data exposure (`PRIVATE_DATA_EXPOSED`) on a public boarding or quarantined media target and `INAPPROPRIATE_MEDIA` on media automatically suppress. Wrong fee/vacancy, stale data, duplicates, fake ownership, harassment and ordinary negative reviews are held; they do not change official records or delete legitimate feedback.
- Suppression is reversible, audited, hides the affected public listing/private media and increments `public_projection_revisions('reports')` for public derivative/cache invalidation.
- Route-information reports require an existing eligible synthetic `public.route_segments` row; otherwise they are unavailable.
- Reporter identity, evidence, private coordinates and sensitive metadata never appear in public responses, logs or errors.

## Endpoints

| Method | Path | Actor | Result |
| --- | --- | --- | --- |
| POST | `/api/v1/reports` | contributor/owner | `ReportReceipt`: P0/P1/P2 severity, held/suppressed status, protected reporter, never publishing |
| GET | `/api/v1/reports/{reportId}` | reporter, affected owner or synthetic operator | redacted `ReportStatusView`; no reporter identity, evidence, ciphertext or operator notes |
| POST | `/api/v1/reports/{reportId}/appeal` | reporter or affected owner | encrypted private appeal receipt (`OPEN`), one per actor/report |
| POST | `/api/v1/reports/{reportId}/operator` | `synthetic:operator` only | reversible `RESTORE_PUBLIC`/`DISMISS_REPORT` or `DECIDE_APPEAL` with audit |

Idempotency uses actor + request key + payload hash. Replaying an unchanged request returns the same protected receipt; changed intent returns `409`. The shared simulator rate limit returns `429`. Evidence requires `REPORT_ENCRYPTION_KEY_HEX`; without it writes fail `503`.

## States and effects

- Report status: `HELD`, `SUPPRESSED`, `ESCALATED`, `RESOLVED`, `DISMISSED`.
- Public effect: `NONE`, `LISTING_HIDDEN`, `MEDIA_BLOCKED`.
- Appeal status: `OPEN`, `GRANTED`, `DENIED`.
- Severity is `P0` for private-data exposure/fake ownership/harassment, `P1` for inappropriate media/wrong fee/vacancy/stale/closure, `P2` for duplicates/negative reviews/route/other.

Actor-scoped `/api/v1/contributions?kind=REPORT` returns only `id`, state, type, severity and creation time; no evidence, reporter identity or target geometry.

## UI

UI-28 `/report?type=BOARDING|POI|MEDIA|ROUTE_SEGMENT&id=<public-ID>` renders privacy guidance, the urgent relay, a structured form, an actual-change preview, unchanged-request retry, protected receipt, status refresh, appeal form and synthetic-only unavailable state. Invalid or extra query fields do not select a target. `/contributions` adds `REPORT` rows with bounded fields only.

Retention, notification, SLA, final operator staffing and M5 restricted access remain later decisions. See [verification](../verification/UNI-044/README.md).
