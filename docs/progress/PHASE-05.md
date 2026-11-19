# Phase 5 — walking routes, neighborhood profiles and advanced discovery

Status: **UNI-051 implemented on a feature branch; feature verification pending human review.** No later Phase 5 issue is implemented by this record.

## UNI-051 — public campus gate → owner public boarding entrance routes

Implemented from verified `dev` `fd50dd528a124a994e4efadbb8f34ab3e795728a` on `feat/uni-051-public-pedestrian-routes`.

Scope is the public read API only:

- `GET /api/v1/routes` with strict `gateId`, `boardingId`, `timeContext` and optional wire-string `includeAlternatives` (default `true`);
- one bounded eligibility statement resolving the public gate point and the consented public boarding entrance together;
- the strict `/boardings/map` policy mirrored verbatim, including the advertisement-preview join; the weaker comparison/nearby-essentials queries are not used;
- provider invocation only after both endpoints resolve, so an ineligible or unknown pair causes zero provider calls;
- typed `NO_ROUTE`/`UNSUPPORTED_TIME_CONTEXT` HTTP 200 results and `SERVICE_UNAVAILABLE` for disabled/timeout/provider-error/invalid-response/cancellation;
- explicit public projection with synthetic provenance and no private coordinates or internals;
- `PublicRouteQuery`, `PublicRouteResponse` contracts, route validation field names, OpenAPI regeneration, unit/HTTP and real PostGIS integration tests.

No Next.js proxy or `/routes` screen, live provider, credential, migration, route table or `route_segments` change, rate limiter, verified boarding publication authority, gate-to-boarding campus rule, authentication change or shared exception-filter change is included. Tiered eligibility remains unchanged.

Rate limiting is deferred to **UNI-062**; the Next.js proxy and route card UI are deferred to the relevant UI work (UNI-054).

Local verification is recorded in [UNI-051 verification](../verification/UNI-051/README.md); implementation commit `bf5d381c3cda4c568920816a115dfca3f073370b` passed feature CI [#44602000247](https://github.com/Dulmina03/unihood/actions/runs/44602000247) all three required jobs. A pre-integration audit resolved client-disconnect handling: cancellation now ends silently through an additive `RequestCancelledException` filter guard instead of a 503 response attempt, and the implementation was re-verified locally. The issue is **not integrated into `dev`**. Current boarding publication is synthetic-only, so deployed environments return 404 for every boarding destination until a legitimate publication path exists; this is a data/product limitation, not a weakened check.

## UNI-050 — pedestrian routing provider adapter and local deterministic fixtures

Implemented from verified `dev` `93bfc98e4f05b3f5b83c74a27dcd7b0111dc09a6` on `feat/uni-050-pedestrian-routing`.

Scope is the provider boundary only:

- strict shared provider request/result contracts;
- `PedestrianRoutingProvider`, disabled provider and local fixture provider;
- exact-key deterministic lookup without nearest-neighbor interpolation;
- strict synthetic fixture validation;
- typed unavailable, cancellation, timeout, provider-error and invalid-response states;
- loopback local/test-only provider configuration;
- NestJS provider injection without a controller;
- unit, fixture-integrity, privacy-audit, timeout, abort, invalid-response and no-network tests;
- architecture and verification documentation.

No `/api/v1/routes` endpoint, `/routes` UI, route-condition report workflow, route database table, migration, seed change, live provider, production credential or publication/authorization change is included. The provider is not an authorization boundary; UNI-051 must reject `AREA_ONLY`, `HIDDEN`, unconsented and unauthorized destinations before invocation.

Local verification: lint, typecheck, workspace tests, production build, repository checks and workflow checks passed. Isolated Docker/PostGIS and browser suites were **NOT RUN** locally because this issue changes neither database schema nor web UI. Feature CI [44563407334](https://github.com/Dulmina03/unihood/actions/runs/44563407334) passed all three required jobs for exact commit `37c2171714e62f5b709efd69597cf8bc67d306fb`. Actual results remain in [UNI-050 verification](../verification/UNI-050/README.md).

## Remaining roadmap

UNI-052 provider walking access for nearby essentials, UNI-053 route segments and day/night structured observations, UNI-054 route card design without safety promises, UNI-055 transparent neighborhood comparison, and UNI-056 privacy/confidence/stale/cancellation/timeout/alternate/no-route tests remain future work.
