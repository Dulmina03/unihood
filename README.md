# UniHood

Privacy-aware boarding advertisements, owner-authorized map listings and neighborhood discovery for Sri Lankan universities. This is the **UNI-001 development bootstrap**, with no live inventory or public write routes. Registration and owner proof policy remain deferred to Phase 7.

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

Tests cover strict shared liveness validation, the landing preview/privacy message and real Nest HTTP routing, including rejection of nonexistent write routes even with a forged role header. `pnpm test:e2e` deliberately exits **1** with a not-configured message; browser E2E arrives in UNI-015. It is not counted as a passing check.

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

## Local PostgreSQL / PostGIS

```bash
pnpm db:up
pnpm db:migrate
# Inspect enabled extensions:
docker compose --env-file .env -f infra/compose.yaml exec -T db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT extname FROM pg_extension ORDER BY extname"'
# Roll back only migration-owned pg_trgm, then reapply:
pnpm db:rollback
pnpm db:migrate
# Isolated regression tests, using the running db service's exact image:
pnpm db:test
pnpm db:down
```

The DB port binds only to `127.0.0.1`. `.env.example` credentials are local examples. The named volume persists across `db:down`. No reset, volume removal or extension cascade is part of migration/rollback.

The PostGIS image initializes PostGIS, topology and (in this 3.5 image) Tiger geocoder on an empty data directory. Existing volumes skip those initialization scripts on restart. These are retained infrastructure prerequisites; bootstrap rollback **never drops PostGIS** or its companion extensions, even if bootstrap had to install PostGIS on an otherwise plain database.

`db:migrate` enables required extensions and records `001_extensions` in `unihood_migrations.bootstrap_extensions`, including whether it created `pg_trgm`. `db:rollback` removes only a migration-owned `pg_trgm`, using `RESTRICT`, and removes the applied record. It retains the bookkeeping schema/table. Pre-existing extensions—including those installed by the old untracked script—are adopted without claiming ownership and remain installed after rollback. This intentionally restores migration-owned state, rather than uninstalling the infrastructure baseline. Repeated migrate/rollback calls are safe and serialize through a transaction advisory lock.

If a later index/object depends on a migration-owned `pg_trgm`, rollback fails atomically, preserving the extension, dependent objects, data and applied record. Roll back the dependent **application migration** first; do not force removal. Do not edit ownership flags to make rollback pass. An applied record with missing extensions is reported as drift; inspect that database before retrying. UNI-002 still supplies the general ordered domain migration runner, synthetic seeds and test DB tooling; this repair adds only bootstrap ownership bookkeeping.

`pnpm db:test` creates a disposable Docker container from the running Compose DB's exact image, with tmpfs storage and no network or persistent volumes. It verifies fresh initialization, repeated cycles, legacy adoption, spatial data/index preservation, and dependency failure atomicity, then removes only that disposable container. It never runs test DDL in the persistent Compose database.

If Docker reports an absent socket, start Docker Desktop/Engine, verify the selected context with `docker context show` and `docker info`, then rerun the commands. Never make the daemon socket world-writable or delete a volume to repair a migration. Existing volumes retain their data and are supported by the adoption path above.

## Workspace and next steps

- `apps/web` — M1: Next.js App Router, Tailwind and accessible preview.
- `apps/api` — M2–M5: NestJS REST; liveness only, no identity provider or mutation routes.
- `packages/contracts` — M5 shared TypeScript/Zod contracts and identity/permission interfaces.
- `packages/ui` — M1 Campus Teal CSS tokens; full components in UNI-003.
- `packages/config` — shared TypeScript baseline.
- `infra` — local PostGIS Compose and bootstrap extensions SQL.
- `docs/design/references` — illustrative design references only; never use their synthetic photos, prices or geography as production content.

See [stack decisions](docs/architecture/stack.md), [current status](docs/progress/CURRENT_STATUS.md), and the master specification. CI runs install/lint/typecheck/test/build for PRs into `dev` and `main`; it does not deploy. Human-only Git: one issue branch/PR into `dev`, releases from `dev` to `main`. Bootstrap infra/CI overlap later roadmap tasks only as explicitly required by §9.7; UNI-002 and UNI-006 remain separate issues.
