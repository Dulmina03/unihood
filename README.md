# UniHood

Privacy-aware boarding advertisements, owner-authorized map listings and neighborhood discovery for Sri Lankan universities. This is the **Phase 1 landing, exploration shell and university-data foundation**, with no live inventory or public write routes. Registration and owner proof policy remain deferred to Phase 7.

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

Tests cover migration file/CLI safeguards, strict health/readiness validation, the landing preview/privacy message and real Nest HTTP routing, including rejection of nonexistent write routes even with a forged role header. `pnpm db:test` separately exercises actual PostgreSQL and API readiness. `pnpm test:e2e` deliberately exits **1** with a not-configured message; browser E2E arrives in UNI-015. It is not counted as a passing check.

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

See [REST contracts/OpenAPI and synthetic actors](docs/api/contracts-and-actors.md), [product ADRs](docs/decisions/README.md), [stack decisions](docs/architecture/stack.md), [current status](docs/progress/CURRENT_STATUS.md), and the master specification. CI runs frozen install, repository/workflow validation, lint/typecheck/test/build, isolated database integration and existing component browser acceptance. It triggers on supported issue-branch and dev/main pushes, optional PRs into dev/main, or human manual dispatch; it does not deploy. Solo workflow: the human performs all Git operations, one branch per UNI issue, verified changes integrate into `dev` with `git merge --ff-only`; PRs are optional, no merge commits, and `main` is reserved for stable releases. See [contributor workflow](CONTRIBUTING.md), [CI coverage and local/remote limits](docs/contributing/ci.md), [coding conventions](docs/contributing/coding-conventions.md) and [synthetic fixture guidelines](docs/contributing/synthetic-fixtures.md).

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

Playwright starts/stops its own production server on loopback port 3180 and writes evidence under `docs/verification/UNI-003`. The port must be free. Set `PLAYWRIGHT_BROWSERS_PATH` consistently for installation and testing if using a nondefault browser cache. Chromium system dependencies may need provision on a clean machine. Browser reports/traces use `/tmp/unihood-ui-test-results`; this is component acceptance, not the pending UNI-015 full-product `pnpm test:e2e` suite. UNI-003 originally did not configure remote browser CI. UNI-006 now configures the existing component suite as a separate gate; remote execution is not claimed without an observed run. Set UI_EVIDENCE_DIR to a temporary directory to avoid replacing checked-in evidence when testing CI behavior.

## REST contract and actor baseline (UNI-005)

The API exposes generated OpenAPI at `http://127.0.0.1:3001/api/v1/openapi.json`; the [saved baseline](docs/api/openapi.json) lists only live public read routes. Shared Zod/TypeScript enums, pagination, sanitized errors and strict public boarding payload patterns are in `packages/contracts`. Boarding/contribution/claim APIs and final authentication are not implemented. Readiness keeps its existing flat 200/503 monitoring contract; other failures use the error envelope.

Synthetic actors default off. Explicit local/test configuration can select a server-side synthetic fixture for loopback-only development; deployed environments and arbitrary identity headers grant no privileges. No fixture controller ships with the API. See [configuration, permission boundaries and regeneration commands](docs/api/contracts-and-actors.md) and [verification results](docs/verification/UNI-005/README.md). Never expose the synthetic actor server through a public proxy or tunnel.

## Contributing and CI (UNI-006)

Start with [CONTRIBUTING.md](CONTRIBUTING.md), the [UNI task template](.github/ISSUE_TEMPLATE/uni-task.md), [bug report template](.github/ISSUE_TEMPLATE/bug-report.md) and optional [PR template](.github/pull_request_template.md). Human-only Git, one issue branch, optional PRs and git merge --ff-only integration into dev apply; main is stable releases only. No workflow commits, pushes, merges or deploys.

`pnpm check:repo` validates policy/template metadata and isolated Compose test storage. `pnpm check:workflows` verifies/downloads pinned actionlint (Linux x86_64, HTTPS required) and validates workflow contexts/actions. Four repository-policy regression tests join the normal test command. CI uses immutable action revisions, read-only token permissions, disabled synthetic actors, bounded jobs and temporary browser evidence. See [coverage/configuration](docs/contributing/ci.md) and [actual local verification](docs/verification/UNI-006/README.md). Configuring CI is not evidence of a remote passing run.

## University data foundation (UNI-010)

[Public university/campus/entrance APIs](docs/api/universities.md) provide bounded read-only pages and optional slug/campus filters. Run migrations and guarded seeds locally; synthetic data appears only in compatible explicit local/test environments. Deployed reads expose eligible verified data only. No real campus coordinates, map/discovery screens, boarding or registration features are added. See [verification](docs/verification/UNI-010/README.md) and [Phase 1 progress](docs/progress/PHASE-01.md).

## Editorial Explorer landing (UNI-011)

Open `/` to choose a university, campus and public entrance from the UNI-010 API; `/u/{slug}` supports direct guest/QR entry. Configure server-only API_BASE_URL in root .env (see .env.example); web dev/start now read root .env before choosing WEB_PORT, without overwriting existing values. Exported environment variables take priority. Keep API migrated/running; unavailable data shows retry/empty states, with no invented fallback.

The photographic landing uses approved Campus Teal components and explicitly synthetic inspiration cards with no live listings/prices/owner claims. Explore Map now opens the UNI-012 shell; real advertisements/essentials and account actions explain their current availability. [Landing/source documentation](docs/ui/landing.md), [photography manifest](docs/ui/landing-assets.json) and [screenshots/verification](docs/verification/UNI-011/README.md) record behavior and scope. No final registration or later map/discovery workflow is implemented.

For the real web → API → isolated PostGIS regression after building: `TEST_LANDING_WEB=1 pnpm db:test`. CI's isolated DB job enables it, preserving tmpfs storage and ownership checks. `pnpm test:ui` also runs targeted landing/QR/accessibility tests with a test-only local HTTP upstream; this is separate from UNI-015's unimplemented full-product E2E. UNI-010 integration and remote CI are human-verified SUCCESS (run #6, dev, f8e6623; all three jobs); run URL/full SHA were not supplied. UNI-011 is human-confirmed committed and merged into dev; its remote CI remains unverified without run evidence.


## Urban Map shell (UNI-012)

Open `/explore`, or use Explore selected campus from the university picker. Public campus/gate results come from UNI-010 through the existing read-only adapters. Desktop rail, tablet collapse, mobile sheet, Map/List, URL state and share/filter controls work without registration. MapLibre, live listings, distances and owner writes remain deferred. See [exploration behavior](docs/ui/explore.md) and [verification/evidence](docs/verification/UNI-012/README.md).
