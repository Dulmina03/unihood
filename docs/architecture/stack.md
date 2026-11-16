# UNI-001 stack baseline

Product privacy/authority/governance decisions are indexed in [the UNI-004 ADRs](../decisions/README.md). Stack entries below retain their historical issue context; they do not select final registration policy.

Recorded 16 November 2026 (Asia/Colombo). Scope: M1 application shell and M5 workspace, with the minimum M2 infrastructure required by §9.7.

## Runtime choices

- Observed Node 22.23.4, npm 10.9.9, Corepack 0.36.0, Git 2.53.0, Docker CLI 29.9.2, Compose v5.5.1.
- pnpm 10.34.9, explicitly pinned in `packageManager`; user-level install, no sudo or Git generator actions.
- Next.js 16.4.6 App Router and React 19.3.1: registry stable tags checked during bootstrap. Tailwind 4 through its PostCSS plugin. System Georgia/Arial fonts keep bootstrap offline and avoid choosing a final multilingual font prematurely.
- NestJS 12.5.0: registry stable tag checked; Node 22.12+ supports its ESM dependencies through Node's require(esm) interoperability. CommonJS application emit retains straightforward decorator metadata and ts-node development.
- TypeScript 5.9.x selected deliberately as the established compatible compiler for ts-jest/tooling rather than registry-latest 7.0.2; reassess in a separate upgrade. ESLint 9 + typescript-eslint 8 retain shared Next-compatible lint tooling.
- Zod 4: strict DTO schemas; built CommonJS contracts consumed by Nest. Root development/typecheck/test scripts build contracts first; recursive builds follow workspace dependency order.
- Vitest 5 + Testing Library/jsdom for UI/contracts; Jest 30.5.2, ts-jest 29.4.15 and Supertest 7.3.2 for HTTP integration. Jest uses its ESM VM loader (`--experimental-vm-modules`) and ts-jest ESM emit for Nest 12 on Node 22; application builds remain CommonJS. Browser E2E is an explicit failing placeholder pending UNI-015.
- PostGIS image `postgis/postgis:17-3.5`, PostgreSQL 17 named-volume storage. Transactional extension SQL with limited ownership bookkeeping; a general ordered migration runner, synthetic seeding and domain test DB tooling still belong to UNI-002. `/health` and `/api/v1/health` are liveness, not database readiness.

Exact installed transitive versions are recorded in the lockfile. Do not infer a tested version from a semver range alone.

## Official compatibility references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): Node 20.9 minimum; the project uses the stricter Nest-compatible Node baseline.
- [NestJS version compatibility](https://docs.nestjs.com/faq/versions): Nest 12 requires Node 20.19+ or 22.12+ on Node 22.
- [pnpm installation](https://pnpm.io/installation): user-level installation and Node compatibility guidance.

## Boundaries

No provider, signup fields, owner-proof method, domain schema or local actor adapter is selected in UNI-001. Shared auth interfaces establish the seam only; UNI-005 implements the guarded adapter. No protected write routes exist. Community recommendations remain ad-only; exact location publication and official pricing/vacancy remain owner-scoped. No real locations, contacts or inventory are seeded.

The approved palette lives in `packages/ui/src/tokens.css`. UNI-003 adds the Editorial Explorer + Urban Map components using `docs/design/references/`; UNI-011 onward builds the actual discovery experience. Generated reference content is illustrative only.

## Verified dependency details and caveats

Installed Tailwind 4.3.5, Zod 4.6.7, Vitest 5.1.0, jsdom 27.4.0, Testing Library React 16.3.3, jest-dom 6.10.0, ESLint 9.39.5, and typescript-eslint 8.72.2. Vitest 5 uses Oxc configuration for JSX. The web package is ESM to keep its tooling config compatible with Vite's native config loader.

The registry marks ESLint 9.39.5 and jest-dom 6.10.0 deprecated. They are the compatible major lines selected for this tested baseline; review supported replacements with the UNI-006 tooling work. pnpm blocks the optional `@parcel/watcher` install script by default; tests, builds and development all worked with the packaged native binaries. No blanket script approval was enabled. Jest's VM loader emits Node's expected experimental warning.

pnpm was installed at `~/.local/bin/pnpm`; the dependency store was preserved at its standard `~/.local/share/pnpm/store` location. No temporary store path is committed. App scaffolds were authored directly, without a generator performing Git initialization. Next.js generated `apps/web/AGENTS.md` during the verified development run; it points future changes to the installed version's docs. `next-env.d.ts`, output directories and local environment files are ignored.

## UNI-001 extension rollback repair — 16 November 2026

The running `postgis/postgis:17-3.5` image has PostgreSQL 17.5 and PostGIS 3.5.2. Inspected image ID/repository digest: `sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6`. This records the inspected image, without repointing the existing persistent volume to another version.

Runtime evidence: `/docker-entrypoint-initdb.d/10_postgis.sh` installs PostGIS/topology and the legacy Tiger stack into both `template_postgis` and the configured database. `/usr/local/bin/docker-entrypoint.sh` runs init scripts only when the data directory is empty. Restarting an initialized volume does not repair or replace its extensions. Catalog dependencies show topology → PostGIS, Tiger → PostGIS and Tiger → fuzzystrmatch. The old down migration incorrectly treated image-provisioned PostGIS as application-owned.

Decision: retain PostGIS as infrastructure; only remove a `pg_trgm` introduced by this migration. A dedicated `unihood_migrations.bootstrap_extensions` row records ownership and application state, in the same transaction as extension DDL. Existing installations from either the image or old untracked bootstrap are conservatively adopted. Both directions use the same advisory transaction lock `(73201, 1)` with a 10-second lock timeout. Repeated apply preserves ownership; repeated rollback without a record preserves extensions. Missing extensions under an applied record raise an explicit drift error.

Rollback uses `RESTRICT` and atomically keeps the applied record when dependent objects block removal. No cascade, data reset, volume deletion or image reinitialization is used. The bookkeeping table/schema remains after rollback. This is a narrow bootstrap repair, not the full UNI-002 migration engine. Future domain migrations must be rolled back before their prerequisite extension; their runner must integrate this ownership state rather than infer ownership again.

Regression command: `pnpm db:test`. It uses the actual Compose service's image in a network-isolated tmpfs container, tests owned/adopted extensions and real geometry/trigram-dependent objects, then removes its disposable container only. The persistent DB is exercised separately through the documented scripts and left applied/running.

## UNI-002 database foundation — 16 November 2026

The ordered migration/seed runner and separate test service are now implemented; the earlier UNI-001 limitations above are historical. See [database strategy](database.md) for current commands and recovery. PostgreSQL driver `pg` 8.23.1 and matching `@types/pg` 8.23.1 were verified against the registry, installed and locked. No major database upgrade or development volume replacement occurred; Compose now pins the previously verified image digest. SQL 001 files remain unchanged and their legacy ownership state is adopted transactionally.

Database-aware API readiness is separate from existing liveness; no public write or authentication route is introduced. Fixtures live only in a labeled synthetic schema. Standard and Docker checks are recorded in PHASE-00.md. CI now includes Docker integration and dev/main push triggers to support the human-only fast-forward workflow; remote CI results are not claimed.

## UNI-003 UI foundation — 16 November 2026

The reusable React source package now exports typed UI components plus scoped semantic styles. Next explicitly transpiles `@unihood/ui`; the package separately typechecks. Locally bundled Fraunces/Manrope (Fontsource 5.3.0) replace the bootstrap-only Georgia/Arial typography while retaining system fallbacks. The approved palette is unchanged. See [design tokens](../ui/design-tokens.md), [component/route index](../ui/screen-index.md) and [asset provenance](../ui/assets.md).

A standalone `/design-system` route demonstrates the foundations without implementing Phase 1 discovery or connecting a map provider. Display DTOs are not authorization/serialization boundaries. Private data must be omitted before reaching client props; map previews additionally reject ineligible listings. Production publishing remains disabled. English scaffolding does not imply completed Sinhala/Tamil support.

Playwright 1.65.1 and axe-core Playwright 4.14.0 are locked dev dependencies. `pnpm test:ui` targets the production build using a local server and the two requested viewports. This is component acceptance/evidence, separate from the deliberately pending UNI-015 `test:e2e` product suite. No Git, API/schema/extension or persistent-data changes are made by the UI workflow.

## UNI-005 REST and actor seam — 16 November 2026

Shared enums, strict REST schemas, public boarding projections, bounded pagination, sanitized generic errors, a provider-neutral guarded synthetic adapter and global protected-action boundary are implemented. No dependency upgrade/provider choice or domain schema/workflow was added. Native Zod JSON Schema generation and Nest route metadata produce an OpenAPI 3.1 document for five live GET paths; saved/live parity and official-schema validation are recorded in the evidence. Existing readiness retains its separate flat monitoring contract. See [API contracts and synthetic actor configuration](../api/contracts-and-actors.md).

The actor uses explicit local/test opt-in plus loopback host/socket/request checks; private issuance records prevent client ActorContext/membership fabrication. Production-like configurations grant nothing. This is deliberately not final authentication, property verification, consent publication or a public actor-selection endpoint. UNI-004's commit/merge into dev is human-confirmed; no Git operation/history audit was performed.
