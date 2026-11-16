# UniHood

Privacy-aware boarding advertisements, owner-authorized map listings and neighborhood discovery for Sri Lankan universities. This is the **Phase 0 development foundation**, with no live inventory or public write routes. Registration and owner proof policy remain deferred to Phase 7.

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
APP_ENV=local pnpm db:seed
# One latest migration at a time; repeat is harmless when history is empty:
pnpm db:rollback
pnpm db:migrate
```

`db:migrate` applies ordered SQL with a SHA-256 ledger and transaction lock. It adopts UNI-001's existing extension ownership without resetting it. `db:rollback` reverses only the latest applied migration, atomically with its ledger row. Changed files, unknown versions or history gaps fail. PostGIS and image-provisioned topology/Tiger remain infrastructure; only a migration-owned pg_trgm can be removed, with RESTRICT. Dependencies block rollback without losing data/state. SQL migrations are trusted repository code, run on one PostgreSQL connection inside a runner-managed transaction.

Seeds require `APP_ENV=local` or `test`, non-production `NODE_ENV`, and a loopback URL. They create one clearly labeled synthetic infrastructure point at `(0,0)` in **`unihood_fixtures.samples`**, not a university, boarding or real public place. Repeated seeds do not duplicate or overwrite records; conflicts with local edits fail. Fixtures are deliberately retained across extension rollback. No product/domain tables are introduced by UNI-002.

API process liveness remains `/health` (alias `/api/v1/health`). Database readiness is `/health/ready` (alias `/api/v1/health/ready`): **200** only with database connectivity, both required extensions, bootstrap ownership state and the ordered baseline migration; otherwise **503**, with no credentials or private error details. Readiness has connection/query deadlines and `Cache-Control: no-store`. API startup never migrates or seeds automatically.

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
APP_ENV=test pnpm db:seed --test
pnpm db:rollback --test
pnpm db:migrate --test
pnpm db:test:down
```

Use the test URL from `.env.example`, adjusting its port if `POSTGRES_TEST_PORT` changes. `--test` requires an explicit test URL, never falls back to development, and rejects a target matching development even when credentials/localhost aliases differ. `db:test:down` removes **only the disposable test container**. Stopping it discards its tmpfs contents. `pnpm db:down` stops **only development**, preserving its container and named volume; `pnpm db:up` restarts it with the same data. Never delete volumes or cascade extensions to resolve migration errors.

See [database strategy and recovery](docs/architecture/database.md) for checksums, rollback ownership, configuration and CI details. Existing `.env` files are preserved: add needed settings from `.env.example` without replacing your credentials. If Docker is unavailable, start Docker Desktop/Engine and inspect its context/daemon; do not weaken socket permissions.

## Workspace and next steps

- `apps/web` — M1: Next.js App Router, Tailwind and accessible preview.
- `apps/api` — M2–M5: NestJS REST; liveness only, no identity provider or mutation routes.
- `packages/contracts` — M5 shared TypeScript/Zod contracts and identity/permission interfaces.
- `packages/ui` — M1 Campus Teal CSS tokens; full components in UNI-003.
- `packages/config` — shared TypeScript baseline.
- `infra` — local PostGIS Compose and bootstrap extensions SQL.
- `docs/design/references` — illustrative design references only; never use their synthetic photos, prices or geography as production content.

See [stack decisions](docs/architecture/stack.md), [current status](docs/progress/CURRENT_STATUS.md), and the master specification. CI runs install/lint/typecheck/test/build plus isolated database integration checks on PRs and pushes to `dev`/`main`, or manual dispatch; it does not deploy. Solo workflow: the human performs all Git operations, one branch per UNI issue, verified changes integrate into `dev` with `git merge --ff-only`; PRs are optional, no merge commits, and `main` is reserved for stable releases. Broader CI conventions remain UNI-006.
