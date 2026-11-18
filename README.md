# UniHood

Privacy-aware boarding advertisements, owner-authorized map listings and neighborhood discovery for Sri Lankan universities. This is the **Phase 1 university exploration foundation plus Phase 2 public POI layers**, with explicitly synthetic local/test inventory and no public write routes. Registration and owner proof policy remain deferred to Phase 7.

## Requirements and pnpm

Use Node **22.12+ on the 22 LTS line**, or Node 24 LTS, Docker Engine/Desktop with Compose, and pnpm **10.34.9**. Do not replace a working Node installation with Ubuntu's npm package.

Safe user-level installation when pnpm is missing:

```bash
npm install --global --prefix "$HOME/.local" pnpm@10.34.9
export PATH="$HOME/.local/bin:$PATH"
pnpm --version
```

Add that PATH entry to your shell configuration if needed. No sudo is required. The `packageManager` field pins pnpm; dependency resolution is recorded in `pnpm-lock.yaml`.

## Local setup

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://127.0.0.1:3000>. API liveness: <http://127.0.0.1:3001/health> (also `/api/v1/health`). Both processes bind to loopback. `pnpm dev` builds shared contracts before starting the apps. No cloud credentials, fonts, map tiles or paid services are needed. The web placeholder has no browse buttons until discovery exists.

The API reads root `.env` with Node's env-file support. Compose reads root `.env`; Next.js automatically reads app-local env files. For browser API/map variables, copy the `NEXT_PUBLIC_*` entries to `apps/web/.env.local` when those integrations are implemented. Set `WEB_PORT` in the launching shell to change the web port; `API_PORT` is read from root `.env`. Public environment variables must never contain secrets.

## Checks

```bash
pnpm check:repo
pnpm check:workflows
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tests cover migration file/CLI safeguards, strict health/readiness validation, the landing preview/privacy message and real Nest HTTP routing, including rejection of nonexistent write routes even with a forged role header. `pnpm db:test` separately exercises actual PostgreSQL and API readiness. `pnpm test:e2e` now runs the integrated Phase 1 guest acceptance journey against owned production Next/Nest and disposable PostGIS after build; see [prerequisites and boundaries](docs/testing/phase-1-acceptance.md). Later product-domain E2E and human accessibility/visual approval remain separate.

After building, run each in a separate terminal:

```bash
pnpm --filter @unihood/api start
pnpm --filter @unihood/web start
```

Smoke checks:

```bash
curl --fail http://127.0.0.1:3001/health
curl --fail http://127.0.0.1:3001/api/v1/health
curl --fail http://127.0.0.1:3000/
```

## PostgreSQL / PostGIS development and tests

The image is pinned by digest to the verified PostgreSQL 17 / PostGIS 3.5 build. Development keeps the existing `unihood_postgres_data` named volume; tests use separate containers, credentials, bridge and tmpfs storage. Both published services bind only to loopback.

```bash
pnpm db:up
pnpm db:migrate
# Empty-table rollback check only; populated tables intentionally refuse rollback:
pnpm db:rollback
pnpm db:migrate
APP_ENV=local pnpm db:seed
```

`db:migrate` applies ordered SQL with a SHA-256 ledger and transaction lock. It adopts UNI-001's existing extension ownership without resetting it. `db:rollback` reverses only the latest applied migration, atomically with its ledger row. Changed files, unknown versions or history gaps fail. PostGIS and image-provisioned topology/Tiger remain infrastructure; only a migration-owned pg_trgm can be removed, with RESTRICT. Dependencies block rollback without losing data/state. SQL migrations are trusted repository code, run on one PostgreSQL connection inside a runner-managed transaction.

Seeds require `APP_ENV=local` or `test`, non-production `NODE_ENV`, and a loopback URL. They retain the clearly labeled infrastructure point at `(0,0)` in **`unihood_fixtures.samples`** and now also insert two fictional universities, two campuses and three gates around `(0,0)` through UNI-010. All university fixtures carry explicit synthetic names/provenance; no real campus geography is claimed. Repeated seeds do not duplicate or overwrite records; conflicts with local edits fail. Fixtures are deliberately retained across extension rollback. UNI-002 introduced no product tables; UNI-010 now adds public university/campus/entrance tables. Their rollback locks tables and refuses populated tables rather than deleting rows. The example rollback command above therefore intentionally fails on an already populated development database; preserve data and use a reviewed forward migration.

API process liveness remains `/health` (alias `/api/v1/health`). Database readiness is `/health/ready` (alias `/api/v1/health/ready`): **200** only with database connectivity, both required extensions, bootstrap ownership state, migration records 001/002 and all three university tables; otherwise **503**, with no credentials or private error details. Readiness has connection/query deadlines and `Cache-Control: no-store`. API startup never migrates or seeds automatically.

```bash
pnpm build
pnpm db:test
```

`db:test` launches its own disposable Compose test container on a random loopback port, verifies actual tmpfs storage and no persistent mounts, tests the real API and database, then removes only that container. It can run while development and the manual test service are running. This suite does not connect to the development database. `pnpm db:test:extensions` retains the UNI-001 standalone extension regression suite (requires the development service to be running).

For a manually accessible test database:

```bash
pnpm db:test:up
export TEST_DATABASE_URL=postgresql://unihood_test:unihood_test_only@127.0.0.1:5433/unihood_test
pnpm db:migrate --test
pnpm db:rollback --test
pnpm db:migrate --test
APP_ENV=test pnpm db:seed --test
pnpm db:test:down
```

Use the test URL from `.env.example`, adjusting its port if `POSTGRES_TEST_PORT` changes. `--test` requires an explicit test URL, never falls back to development, and rejects a target matching development even when credentials/localhost aliases differ. `db:test:down` removes **only the disposable test container**. Stopping it discards its tmpfs contents. `pnpm db:down` stops **only development**, preserving its container and named volume; `pnpm db:up` restarts it with the same data. Never delete volumes or cascade extensions to resolve migration errors.

See [database strategy and recovery](docs/architecture/database.md) for checksums, rollback ownership, configuration and CI details. Existing `.env` files are preserved: add needed settings from `.env.example` without replacing your credentials. If Docker is unavailable, start Docker Desktop/Engine and inspect its context/daemon; do not weaken socket permissions.

## Workspace and next steps

- `apps/web` — M1: Next.js App Router, Tailwind and accessible preview.
- `apps/api` — M2–M5: NestJS REST; liveness/readiness and university/campus/gate reads, no final identity provider or mutation routes.
- `packages/contracts` — M5 shared TypeScript/Zod contracts and identity/permission interfaces.
- `packages/ui` — M1 reusable Campus Teal tokens and React components; synthetic demonstration at `/design-system`.
- `packages/config` — shared TypeScript baseline.
- `infra` — local PostGIS Compose, safe ordered migrations and deterministic synthetic seeds.
- `docs/design/references` — illustrative design references only; never use their synthetic photos, prices or geography as production content.

See [REST contracts/OpenAPI and synthetic actors](docs/api/contracts-and-actors.md), [product ADRs](docs/decisions/README.md), [stack decisions](docs/architecture/stack.md), [current status](docs/progress/CURRENT_STATUS.md), and the master specification. CI runs frozen install, repository/workflow validation, lint/typecheck/test/build, isolated database integration and existing component browser acceptance. It triggers on supported issue-branch and dev/main pushes, optional PRs into dev/main, or human manual dispatch; it does not deploy. Solo workflow: routine agent Git operations are explicitly authorized, one branch per UNI issue; exact-commit issue CI must pass before `git merge --ff-only` into `dev`, and dev CI must pass before continuing. PRs are optional, no merge commits, and main/releases/deployment require human approval. See AGENTS.md for escalation boundaries. See [contributor workflow](CONTRIBUTING.md), [CI coverage and local/remote limits](docs/contributing/ci.md), [coding conventions](docs/contributing/coding-conventions.md) and [synthetic fixture guidelines](docs/contributing/synthetic-fixtures.md).

## Campus Teal component library (UNI-003)

Run `pnpm --filter @unihood/web dev` and open `http://127.0.0.1:3000/design-system` (or the configured WEB_PORT). The page demonstrates reusable `@unihood/ui` primitives, synthetic photo-led cards, independent source/privacy/vacancy labels, filters, status/recovery states, modal focus and a provider-free map/list fallback. No real listing, exact location, route or publishing service is connected.

- [Tokens and usage](docs/ui/design-tokens.md)
- [Component/route index and privacy contract](docs/ui/screen-index.md)
- [Assets and licensing](docs/ui/assets.md)
- [Screenshots and verification](docs/verification/UNI-003/README.md)

`pnpm test` includes component/presentation/contrast tests. Browser acceptance is separate:

```sh
pnpm --filter @unihood/web exec playwright install chromium
pnpm build
pnpm test:ui
```

Playwright starts/stops its own production server on loopback port 3180 and writes evidence under `docs/verification/UNI-003`. The port must be free. Set `PLAYWRIGHT_BROWSERS_PATH` consistently for installation and testing if using a nondefault browser cache. Chromium system dependencies may need provision on a clean machine. Browser reports/traces use `/tmp/unihood-ui-test-results`; this is component acceptance, separate from the integrated UNI-015 `pnpm test:e2e` Phase 1 guest journey. UNI-003 originally did not configure remote browser CI. UNI-006 now configures the existing component suite as a separate gate; remote execution is not claimed without an observed run. Set UI_EVIDENCE_DIR to a temporary directory to avoid replacing checked-in evidence when testing CI behavior.

## REST contract and actor baseline (UNI-005)

The API exposes generated OpenAPI at `http://127.0.0.1:3001/api/v1/openapi.json`; the [saved baseline](docs/api/openapi.json) lists live public read routes and the guarded public-POI duplicate preflight. Shared Zod/TypeScript enums, pagination, sanitized errors and strict public boarding payload patterns are in `packages/contracts`. Boarding/contribution/claim APIs and final authentication are not implemented. Readiness keeps its existing flat 200/503 monitoring contract; other failures use the error envelope.

Synthetic actors default off. Explicit local/test configuration can select a server-side synthetic fixture for loopback-only development; deployed environments and arbitrary identity headers grant no privileges. No fixture controller ships with the API. See [configuration, permission boundaries and regeneration commands](docs/api/contracts-and-actors.md) and [verification results](docs/verification/UNI-005/README.md). Never expose the synthetic actor server through a public proxy or tunnel.

## Contributing and CI (UNI-006)

Start with [CONTRIBUTING.md](CONTRIBUTING.md), the [UNI task template](.github/ISSUE_TEMPLATE/uni-task.md), [bug report template](.github/ISSUE_TEMPLATE/bug-report.md) and optional [PR template](.github/pull_request_template.md). Authorized autonomous Git, one issue branch, mandatory exact-commit issue/dev CI, optional PRs and git merge --ff-only integration into dev apply; main is stable releases only. No workflow commits, pushes, merges or deploys.

`pnpm check:repo` validates policy/template metadata and isolated Compose test storage. `pnpm check:workflows` verifies/downloads pinned actionlint (Linux x86_64, HTTPS required) and validates workflow contexts/actions. Four repository-policy regression tests join the normal test command. CI uses immutable action revisions, read-only token permissions, disabled synthetic actors, bounded jobs and temporary browser evidence. See [coverage/configuration](docs/contributing/ci.md) and [actual local verification](docs/verification/UNI-006/README.md). Configuring CI is not evidence of a remote passing run.

## University data foundation (UNI-010)

[Public university/campus/entrance APIs](docs/api/universities.md) provide bounded read-only pages and optional slug/campus filters. Run migrations and guarded seeds locally; synthetic data appears only in compatible explicit local/test environments. Deployed reads expose eligible verified data only. No real campus coordinates, map/discovery screens, boarding or registration features are added. See [verification](docs/verification/UNI-010/README.md) and [Phase 1 progress](docs/progress/PHASE-01.md).

## Editorial Explorer landing (UNI-011)

Open `/` to choose a university, campus and public entrance from the UNI-010 API; `/u/{slug}` supports direct guest/QR entry. Configure server-only API_BASE_URL in root .env (see .env.example); web dev/start now read root .env before choosing WEB_PORT, without overwriting existing values. Exported environment variables take priority. Keep API migrated/running; unavailable data shows retry/empty states, with no invented fallback.

The photographic landing uses approved Campus Teal components and explicitly synthetic inspiration cards with no live listings/prices/owner claims. Explore Map now opens the UNI-012 shell; real advertisements/essentials and account actions explain their current availability. [Landing/source documentation](docs/ui/landing.md), [photography manifest](docs/ui/landing-assets.json) and [screenshots/verification](docs/verification/UNI-011/README.md) record behavior and scope. Final registration and live boarding discovery remain deferred; the UNI-013 map integration is described below.

For the real web → API → isolated PostGIS regression after building: `TEST_LANDING_WEB=1 pnpm db:test`. CI's isolated DB job enables it, preserving tmpfs storage and ownership checks. `pnpm test:ui` also runs targeted landing/QR/accessibility tests with a test-only local HTTP upstream; this is separate from UNI-015's integrated Phase 1 guest E2E. UNI-010 integration and remote CI are human-verified SUCCESS (run #6, dev, f8e6623; all three jobs); run URL/full SHA were not supplied. UNI-011 is human-confirmed committed and merged into dev; remote runs #7/#8 are now verified failed at the browser job’s web build, with the same missing contracts prerequisite as UNI-012 run #9; see [CI repair evidence](docs/verification/UNI-012/ci-repair.md).


## Urban Map shell (UNI-012)

Open `/explore`, or use Explore selected campus from the university picker. Public campus/gate results come from UNI-010 through the existing read-only adapters. Desktop rail, tablet collapse, mobile sheet, Map/List, URL state and share/filter controls work without registration. MapLibre, live listings, distances and owner writes remain deferred. See [exploration behavior](docs/ui/explore.md) and [verification/evidence](docs/verification/UNI-012/README.md).


## Configurable map (UNI-013)

Set `MAP_PROVIDER=openfreemap` and `MAP_STYLE=liberty` (or `bright`) to enable the credential-free map, then restart web. Disabled/missing config preserves the usable list. No private keys or arbitrary style URLs are accepted. See [map setup, provider terms, licensing and privacy](docs/ui/maps.md) and [actual verification](docs/verification/UNI-013/README.md). Synthetic gates are not real campuses; basemap features are not verified boarding inventory.

UNI-012 was human-confirmed committed, fast-forward merged and pushed to dev. Its repaired remote CI passed Workspace quality, Isolated PostGIS integration and Component browser acceptance at short commit **99eeef1**. Run number/URL/full SHA were not supplied; failed runs #7/#8/#9 remain historical evidence.

UNI-014 adds [guest favourites](docs/ui/favourites.md) at `/saved`, using only browser localStorage and current public gate reads. No account, sync or new environment setting is required. Existing private data and map-provider boundaries remain unchanged. Verification: [UNI-014](docs/verification/UNI-014/README.md).

UNI-015 adds `pnpm test:e2e`: a complete guest QR → selection → exploration → preview → favourite → Saved → reopen/share journey against owned production Next/Nest and disposable tmpfs PostGIS. Build contracts, API and web first. See [acceptance commands and manual gates](docs/testing/phase-1-acceptance.md) and [actual verification](docs/verification/UNI-015/README.md). Existing `pnpm test:ui` regressions remain separate. Real screen-reader completion and human UI-01/UI-03 visual approval are not implied by automated passes. UNI-014 merge/push and run #14 SUCCESS at short commit 9eefe89 are human-confirmed; run URL/full SHA unspecified. UNI-013 remote CI remains unverified.


## Public Essentials layer (UNI-021)

After guarded migrations/seeds, choose a university/campus/public entrance in `/explore`, then Essentials for bounded category/name/sort/page results and synchronized public map markers. Four fictional POIs near (0,0) demonstrate services without claiming real Sri Lankan listings or distances. Public reads exclude all boardings and deployed synthetic fixtures. See [API/UI/seeds](docs/api/places.md) and [verification](docs/verification/UNI-021/README.md). Existing guest favourites remain gate-only. No POI detail/nearby/contribution/registration workflow is included here.


Public service details (UNI-022): choose an entrance in Explore → Essentials → **Details for …**, or open a canonical `/places/<public-poi-uuid>` guest link. Cards/preview/detail show source and confirmation uncertainty; detail adds record-update dates in Asia/Colombo and canonical sharing. Synthetic fixtures are not destinations to visit. Hours/contact/walking routes remain unavailable; no private boarding origin is used. See [public POI contracts and navigation](docs/api/places.md).

UNI-023 adds an internal, read-only public POI duplicate-candidate foundation with Unicode-preserving normalization and PostGIS/trigram evidence. It does not yet add the UNI-024 warning API/UI or contribution writes. Apply the additive geography index with the existing `pnpm db:migrate` workflow; preserve your .env and persistent volume. `pnpm db:test` exercises the engine on isolated fictional data. Scores require review and never merge places. See [matching design and unfinished scenarios](docs/architecture/poi-duplicate-matching.md).

UNI-024 adds [public POI duplicate review](docs/api/duplicates.md) at `/places/check-duplicates` and contributing-actor `POST /api/v1/duplicates/check`. Explicit loopback local/test simulation only; deployed access remains denied. Review update-existing/distinct-with-reason choices without sending, storing, creating or merging anything. Final transactional checks and actual proposals remain UNI-025/026. Local setup, synthetic input and limits are documented in the linked guide.

UNI-025 adds an internal [pending public POI transaction foundation](docs/architecture/poi-submission-transactions.md): actor-scoped idempotency, canonical/pending final rechecks, exact source collision guards and held synthetic intents. Apply ordered migration 005 without resetting data. No new public submit route/wizard/publication is added; these remain UNI-026. [Actual verification](docs/verification/UNI-025/README.md).

UNI-026 adds the guarded synthetic [public-place proposal demonstration](docs/api/poi-proposals.md) at `/contribute/place`: category/name/source/entrance draft, duplicate review and a private held receipt. Nothing is published. Enable the explicit loopback local/test contributor simulator only; production and staging remain denied.

UNI-027 documents the [provider/license register and controlled public-POI import strategy](docs/architecture/poi-provider-import-strategy.md). It adds no importer or real data; public Nominatim harvesting, tile scraping and unauthorized boarding geometry remain excluded.

UNI-030 establishes the [boarding/property privacy foundation](docs/architecture/boarding-privacy.md): distinct canonical property, unit, listing revision and private media/location storage, plus strict public response contracts. Boarding feed, publication and upload APIs remain later issues; no real residences or owner claims are seeded.

UNI-031 adds the [synthetic boarding advertisement feed/detail preview](docs/api/boarding-advertisements.md). After normal local setup/migrations, optionally run `APP_ENV=local pnpm db:seed:boardings` and open `/advertisements`; this is fictional data, with no real owner, inventory or destination. It does not enable production publication or expose private boarding data.

UNI-032 adds the [synthetic local owner draft wizard](docs/ui/owner-wizard.md) at `/owner`: existing-ad search, basic details, privacy choices, media acknowledgement and property-scoped checked browser-session drafts. Nothing is published or written to the database; final authorization, uploads, fees/vacancy and public map publication remain deferred.

UNI-033 adds [server-enforced visibility projections and an unpublished synthetic owner preview](docs/api/boarding-visibility.md). Private modes never include a point; public preview requires the existing property-scoped map capability and explicit fictional-entrance/copy acknowledgements. No real residence or map publication is enabled.

UNI-034 connects [owner-consented synthetic public boarding entrances](docs/api/boarding-map.md) to Explore. The optional `APP_ENV=local pnpm db:seed:boardings --owner-demo` installs one closed HIDDEN fixture after migrations; `/owner/map` can change only that fixture using the existing explicit loopback owner-a adapter. Public mode requires deliberate fictional-entrance selection and consent; hiding/area-only deletes its public point and preserves canonical/history data. This never publishes real property or enables production writes.

UNI-035 adds guarded synthetic [room inventory and official LKR fee history](docs/api/boarding-inventory.md), with public current room facts and no vacancy or location inference. [Actual verification](docs/verification/UNI-035/README.md).

UNI-036 adds guarded synthetic [per-unit availability confirmation and expiry](docs/api/boarding-vacancy.md), with server timestamps, retained history and automatic UNKNOWN for stale facts. [Actual verification](docs/verification/UNI-036/README.md).

UNI-040 adds the [contribution hub and synthetic-only boarding recommendation demo](docs/api/boarding-recommendations.md) at `/contribute` and `/contribute/boarding`. Recommendations remain private and held; they never create a public pin, official fee/vacancy or owner authority. Use only the documented loopback contributor simulator and fictional inputs. [Verification](docs/verification/UNI-040/README.md).
