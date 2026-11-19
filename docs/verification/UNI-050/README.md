# UNI-050 verification — pedestrian routing provider adapter

Date: 19 November 2026 (Asia/Colombo). Branch: `feat/uni-050-pedestrian-routing`, based on verified `dev` `93bfc98e4f05b3f5b83c74a27dcd7b0111dc09a6`.

## Scope verified

Strict synthetic provider contracts, a provider-neutral pedestrian routing interface, disabled and local deterministic fixture providers, explicit unavailable/failure states, provider execution-boundary timeout/cancellation/error normalization, loopback local/test-only fixture configuration, NestJS provider injection and strict fixture privacy/integrity validation.

No public route endpoint, route UI, route-condition reporting, route database table, migration, seed change, live external provider, production credential, publication change or authorization change is added. `public.route_segments` is untouched. The provider is not treated as an authorization boundary.

## Local results (actual)

- `pnpm lint`: PASS (`eslint . --max-warnings=0`).
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS — contracts 141, API 268, web 222 (631 workspace) plus 13 root runner tests.
- `pnpm build`: PASS — contracts, API and Next.js production builds.
- `pnpm check:repo`: PASS.
- `pnpm check:workflows`: PASS.

New coverage:

- contract acceptance/rejection for coordinates, GeoJSON geometry, metrics, provenance, duplicate option IDs, partial availability and unavailable payload hygiene;
- deterministic local fixture results for day/night and alternative limits;
- exact-key lookup with explicit `NO_ROUTE` for unknown gates/boardings;
- fixture rejection for duplicate case keys, duplicate route IDs, malformed geometry and invalid metrics;
- privacy audit for coordinates, contact/actor canaries, unsafe claims and synthetic labels;
- no-network assertion for the local provider;
- typed disabled, exception, timeout, external cancellation and malformed-response results;
- local/test loopback-only provider selection and default disabled selection;
- NestJS injection of the disabled provider by default.

The API test run emits Jest's non-failing JSON-import deprecation warning for the static fixture import. Tests pass; this is recorded rather than suppressed.

## Not run locally

- Isolated Docker/PostGIS `pnpm db:test`: **NOT RUN**. This issue adds no migration, seed, SQL, `route_segments` write or database behavior.
- Browser/component acceptance and real browser E2E: **NOT RUN**. This issue adds no UI.
- Live routing provider, real route quality, provider licensing/attribution/quota and external network behavior: **NOT RUN** and not implemented.
- Human visual/accessibility review: not applicable to this backend-only issue.

## Remote CI

Feature branch exact-commit CI will be recorded only after all required jobs pass. This section is updated with the actual run URL, full SHA and every required job result; no pending, skipped or cancelled result is treated as PASS.
