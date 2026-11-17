# Public POI duplicate review — UNI-024

Implements specification §3.6, §6.1 steps 1–4 and §7.2 contributing-actor `POST /api/v1/duplicates/check`, exact §10 UNI-024. Depends on [UNI-023 matcher](../architecture/poi-duplicate-matching.md) and all [five ADRs](../decisions/README.md). This is a preflight and review choice, **not** UNI-025 transactional/idempotent submit or UNI-026 proposal creation. It never changes a canonical record, contribution, source, fee, vacancy, visibility, ownership or database schema.

## Wire contract and authorization

- JSON request: strict `{kind:"POI", name, category, location:{lat,lng}}`. Shared `DuplicateCheckInputSchema` retains bounded Unicode-aware names, category code and geographic validation. Source IDs, building membership, radius/limit tuning, private contacts, boarding geometry and unknown fields are rejected. Nothing is submitted as a boarding pin.
- 200 response: shared `DuplicateCheckResultSchema`, the bounded public-only matcher result plus `checkOnly:true`. Includes canonical public ID/name/category, advisory ranking/signals, `requiresReview:true`, `hasMore` and `incomplete`. No coordinates, precise distances, private evidence, provider identifiers, owner claims or probability assertions. Empty is not clearance to create. Truncated checks explicitly require further review.
- Global `RequirePermission({action:'suggest'})` requires the existing contributing actor. Guests, disabled/unknown actors, forged identity headers, forwarded/cross-site requests and all staging/production/unknown environments fail closed. Server-side flags never enable staging/production authority. No final auth provider is chosen.
- Local simulator budgets: shared fixed window of 20 attempts/minute per process (including schema-invalid authorized requests), at most three active matching calls. No spoofable IP key/unbounded identity map. This intentionally conservative loopback mechanism is **not a distributed production abuse system**. Before final auth exposure, implement actor-aware distributed limits and deployment review. 429 preserves no result and asks the UI to wait one minute.
- 400 strict validation; 401/403 actor denial; 429 budget; 503 unavailable matcher/DB/invalid projection; unexpected errors remain sanitized. Responses use no-store and existing generated request IDs/ErrorResponse. Default JSON parsing remains size-bounded. No user text, reason or private exception is logged/reflected by the added code.
- [Generated OpenAPI baseline](openapi.json) lists the actual POST body/result/errors and explicitly annotates the contributing-actor boundary. No fake bearer/header authorization scheme or production registration is advertised. Runtime refinements remain stricter than plain JSON Schema.

## Browser workflow and local setup

Open `/explore`, choose public essentials, then **Review possible public place duplicates**, or go directly to `/places/check-duplicates`. The Campus Teal review form accepts only a public business entrance; it does not collect device GPS. Results explain ambiguity/shared businesses and offer **Suggest update**, an inspect link to the existing public record, **Continue as a distinct public place with a reason**, or **Cancel review**. A 15–500 character reason describes a business distinction; never provide a private address/contact or ownership claim. This review step cannot validate real-world evidence or certify free text safe for future publication; it does not transmit the reason. UNI-025/026 must validate content and recheck server-side before any eventual submission.

**Prepare review choice** confirms only an in-memory selection. No correction has been sent and no new place is created. Inspecting a record navigates away without sending a choice. Reload clears all inputs/choices. Editing name/category/coordinates cancels an in-flight request and invalidates old candidates/choice/reason. Cancellation restores keyboard focus. Failure allows explicit retry and preserves public exploration. Candidate heading receives focus on successful checks; accessible names/status/error announcements and native fieldset/radios are provided. No draft, reason, snapshot, coordinate or candidate is stored or placed in a share URL.

After the normal `.env`, Docker, migration and synthetic seed setup in [README](../../README.md), run from repository root:

```sh
APP_ENV=local NODE_ENV=development API_HOST=127.0.0.1 WEB_PORT=3000 \
ENABLE_SYNTHETIC_ACTORS=true SYNTHETIC_ACTOR=contributor pnpm dev
```

Use `http://127.0.0.1:3000/places/check-duplicates` (not a LAN address). API defaults to loopback port 3001; if changed, set server-only `API_BASE_URL=http://127.0.0.1:<API_PORT>/api/v1`. The web server passes only the validated public loopback endpoint to the browser, never DATABASE_URL or credentials. `WEB_PORT` must match the browser origin on the API too. No `.env` rewrite is required; command-local exports override existing values.

Example explicitly synthetic input: **Synthetic Demo Pharmacy**, category **Pharmacy**, latitude **0.0003**, longitude **0.0005**. Those are existing fictional fixtures near `(0,0)`, not real businesses/campus coordinates or destinations to visit. Migrate normally; do not reset a volume, drop data or change extension ownership.

The browser calls the loopback API **directly** with credentials omitted. A Next proxy must not promote arbitrary public requests into loopback synthetic actors. CORS is scoped solely to this API path, HTTP loopback origins with the configured WEB_PORT, and environments where the existing synthetic adapter is eligible. No wildcard or credentialed CORS. Arbitrary origin/identity headers never grant authority. A compatible server environment may show the form while actor flags are disabled; the API denies with 401. If local CORS is disabled with those flags, the browser cannot read that response and shows the generic unavailable/retry state; enable only the explicit local command above to use the simulator. Outside explicit local/test environments or with an invalid/credentialed API URL, the form is unavailable and public browsing remains usable.

## Verification and limits

[Actual results and screenshots](../verification/UNI-024/README.md). Browser tests use an explicitly synthetic upstream and cannot prove authorization or PostgreSQL scoring. Separate HTTP tests exercise permission/rate/concurrency/failure boundaries; the owning tmpfs Docker harness starts a real configured loopback contributor API against actual PostGIS fixtures. Guest E2E remains actor-disabled. No persistent development writes, provider/license change, private boarding matching or automatic merge is introduced. Manual AT/visual approval and real-world candidate calibration are not inferred from axe or synthetic tests; Phase 6 carry-over remains visible.
