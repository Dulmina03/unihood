# UNI-051 verification — public pedestrian routes

Branch `feat/uni-051-public-pedestrian-routes`, created from verified `dev` `fd50dd528a124a994e4efadbb8f34ab3e795728a`. This issue is **not integrated into `dev`**; the record below covers the feature branch only.

## Scope implemented

`GET /api/v1/routes` resolves one eligible public campus gate and one eligible owner-selected `PUBLIC_MAP` boarding entrance in a single bounded statement, then calls the existing UNI-050 provider only when both endpoints are eligible. Provider-domain absence (`NO_ROUTE`, `UNSUPPORTED_TIME_CONTEXT`) is a typed HTTP 200 result; disabled, timeout, provider error and invalid response map to the existing redacted `SERVICE_UNAVAILABLE` envelope, while cancellation (client disconnect or provider-reported) ends silently with no response attempt through an additive `RequestCancelledException` guard in the shared filter. No proxy/UI, live provider, migration, route table, rate limiter, verified boarding authority or campus-affinity inference is included.

## Local commands actually run (19 November 2026, Asia/Colombo)

| Command | Result |
|---|---|
| `pnpm --filter @unihood/contracts build` | PASS |
| `pnpm --filter @unihood/contracts test` | PASS — 26 files, **147 tests** (was 141) |
| `pnpm --filter @unihood/api test -- pedestrian-routes` | PASS — **18 tests** |
| `pnpm --filter @unihood/api test` | PASS — 34 suites, **286 tests** (was 268) |
| `pnpm lint` | PASS (`eslint . --max-warnings=0`) |
| `pnpm typecheck` | PASS (contracts, ui, api, web) |
| `pnpm test` | PASS — workspace **655** (contracts 147 / API 286 / web 222) plus **13** root runner tests = 668 |
| `pnpm build` | PASS (supported Webpack web build, API/contracts build) |
| `pnpm check:repo` | PASS |
| `pnpm check:workflows` | PASS (actionlint 1.7.12, checksum verified) |
| `pnpm db:test` (isolated tmpfs PostGIS) | PASS — all groups, including **UNI-051** |

The OpenAPI baseline was regenerated with `node apps/api/dist/export-openapi.js > docs/api/openapi.json` and is byte-identical to live generation; the API suite's parity assertion passed. The only changes were the new `/api/v1/routes` path, `RoutePublicQuery`, `PublicRouteResponse`, and the extended `ErrorDetail.field` enum.

## Coverage added

- Contracts: strict public query (required UUIDs, `DAY`/`NIGHT`, wire-string boolean, unknown/extra rejection), one-to-three option bounds, provenance equality, unavailable hygiene (no metrics/geometry/source version) and rejection of coordinates, private metadata and safety claims.
- API: fixture parity for the approved `DAY` (two options), `includeAlternatives=false` (one), `NIGHT` (one) and `NO_ROUTE` cases; single-statement SQL predicate audit (no `unihood_private`, `exact_geo`, `address_enc`, `ST_Distance`); zero provider calls for every denial and validation failure; identical generic 404 body across denial causes; deployed synthetic-exclusion flag; 503 mapping for disabled/timeout/exception/invalid response; pre-cancelled and provider-cancelled requests end silently through `RequestCancelledException` with no response attempt and no provider call on pre-cancel; `Cache-Control: no-store`.
- PostGIS: real seeded gate and consented boarding entrance resolution, fixture provider parity through a loopback `ROUTING_PROVIDER=local-fixture` API, hidden revocation and preview-visibility denial, disabled-provider 503 through the main harness, deployed `includeSynthetic=false` denial with a counting provider proving zero invocation, and a private verification point canary never appearing in any response.
- Existing privacy regression `boarding-privacy-matrix` updated because `/routes` now exists: it still proves client coordinates are rejected and no private schema or coordinate leaks.

## Database/PostGIS detail

Docker Desktop was started locally for this run and the isolated `pnpm db:test` suite passed, printing `PASS: UNI-051 real PostGIS gate/entrance resolution, provider fixture parity, generic denial with zero provider calls and no private geometry`.

## Not run locally

- Browser/Playwright suite: **NOT RUN** — this issue changes no web/UI code; feature CI covers it.
- Live routing provider, provider licensing/quota and external network behavior: not implemented by design.

## Known limitation recorded

Current boarding publication is synthetic-only, so deployed environments return 404 for every boarding destination until a legitimate publication path exists (Phase 7). This is a data/product limitation, not a weakened eligibility check.

## Feature CI

Implementation commit `bf5d381c3cda4c568920816a115dfca3f073370b` passed feature CI [44602000247](https://github.com/Dulmina03/unihood/actions/runs/44602000247), all three required jobs for the exact commit:

- `Workspace quality` — `check:repo`, `check:workflows`, lint, typecheck, tests and build.
- `Isolated PostGIS integration` — isolated tmpfs database, API and landing regression, including the new routing group.
- `Component browser acceptance` — synthetic component suite and Phase 1 guest E2E against isolated PostGIS.

The branch is **not merged into `dev`** and no `dev`/`main` CI is claimed for this issue.

## Pre-integration audit follow-up (19 November 2026)

A read-only audit of `5b22b48` found one discrepancy against the approved disconnect semantics: a client disconnect and a provider `CANCELLED` result both produced a 503 response attempt (`pedestrian-routes.service.ts:114-116`, plus the controller's 503 description). Resolution, approved before integration:

- `apps/api/src/http/request-cancelled.exception.ts` is a marker exception; `ApiExceptionFilter` returns before reading the request or response, so no status, header or body is written.
- The service raises it for a pre-aborted signal, a provider `CANCELLED` result, and an exception thrown while the signal is already aborted. Disabled, timeout, provider error and invalid response still return the redacted 503.
- Controller, route docs, OpenAPI description and the API spec were updated; the spec now also proves the filter makes no response calls for cancellation.

The audit re-confirmed no UNI-050 provider/config changes, one bounded statement, byte-equivalent `boarding-map` eligibility predicates, entrance-only public geometry, no private schema reference, and `no-store` on success and error paths.

### Re-verification after the audit fix (19 November 2026)

| Command | Result |
|---|---|
| `pnpm --filter @unihood/api test -- pedestrian-routes` | PASS — **20 tests** (was 18) |
| `pnpm --filter @unihood/contracts test` | PASS — 26 files, 147 tests |
| `pnpm --filter @unihood/api test` | PASS — 34 suites, **288 tests** (was 286) |
| `pnpm lint` | PASS (`eslint . --max-warnings=0`) |
| `pnpm typecheck` | PASS (contracts, ui, api, web) |
| `pnpm test` | PASS — workspace **657** (contracts 147 / API 288 / web 222) plus **13** root runner tests = 670 |
| `pnpm build` | PASS |
| `pnpm check:repo` | PASS |
| `pnpm check:workflows` | PASS (actionlint 1.7.12, checksum verified) |
| `pnpm db:test` (isolated tmpfs PostGIS) | PASS — all groups, including UNI-051 |

`node apps/api/dist/export-openapi.js` after the build is byte-identical to the committed `docs/api/openapi.json`, so the updated 503 description matches live generation.
