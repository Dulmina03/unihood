# Phase 0 — engineering bootstrap

Phase status: **in progress**, not complete. UNI-002–006 have not been started.

## UNI-001 — workspace bootstrap

Owner: M1 + M5; minimum PostGIS foundation shared with M2 as explicitly required by §9.7.
Dependencies: none. Last verified branch: `chore/uni-001-workspace-bootstrap` (initial bootstrap inspection). Per the repair request, no Git commands were run to recheck it.
Status: **bootstrap and database rollback repair verified; human Git handoff pending**.

### Delivered scope

- Private pnpm workspace with web/API/contracts/UI/config packages; development, lint, typecheck, test and build scripts.
- Next.js App Router + TypeScript + Tailwind, accessible Campus Teal development preview with no fabricated live content or dead discovery controls.
- NestJS `/health` and `/api/v1/health` liveness; strict shared Zod response schema. No write routes or authentication bypass.
- Shared identity/permission interfaces only; guarded actor adapter and broader REST contracts belong to UNI-005, final registration to Phase 7.
- Loopback-only PostGIS Compose with persistent named volume, health check and transactional extension up/down SQL. Limited extension ownership bookkeeping is included by the rollback repair below; full domain migration/seed tooling remains UNI-002.
- Contracts/UI/API baseline tests, shared lint/TypeScript tooling, PR checks for dev/main. Full CI conventions remain UNI-006.
- README, environment example, stack decisions and progress documentation. Existing specification/start instructions/reference assets preserved.

### Verification

Initial bootstrap verification on 16 November 2026 (Asia/Colombo), before the database repair recorded below:

- `pnpm install --store-dir /tmp/unihood-pnpm-store`: PASS, lockfile generated. Initial sandbox registry DNS failed; elevated registry access worked. pnpm 10.34.9 installed using a user-owned prefix, no sudo.
- `CI=true pnpm install --frozen-lockfile --offline`: PASS after preserving all downloaded packages in the normal user store; 744 packages reused. The lockfile required no resolution changes. A clean networked CI run is not yet observed.
- `pnpm lint`: PASS, zero warnings after fixing the monorepo Next root and internal link/PostCSS config.
- `pnpm typecheck`: PASS across contracts/API/web; the initial Vitest JSX config mismatch was fixed using Oxc.
- `pnpm test`: PASS, 3 suites / 8 tests (2 contracts, 1 UI, 5 real HTTP API). Initial Jest/Nest ESM mismatch fixed with the ESM VM loader. Sandbox sockets were denied (`EPERM`); the successful full run used elevated local execution. No socket mock or assertion was removed.
- `pnpm build`: PASS for contracts, NestJS and Next.js; `/` and not-found statically generated. Successful final run used elevated execution.
- Production starts: `pnpm --filter @unihood/api start` and `pnpm --filter @unihood/web start`: PASS. `curl --fail --silent --show-error http://127.0.0.1:3001/health` and the `/api/v1/health` alias: PASS with only `{status:"ok",service:"unihood-api"}`. Frontend `curl --fail --silent --show-error http://127.0.0.1:3000/ -o /tmp/unihood-home.html`: PASS; assertions checked heading, preview/no-live-data message, skip link and English language.
- `WEB_PORT=3100 API_PORT=3101 pnpm dev`: PASS. Both loopback servers started; curls to port 3101 `/health` and port 3100 `/` passed, including the rendered heading assertion. All smoke-test servers were stopped with SIGINT afterwards (shutdown exit codes are not test failures).
- `pnpm test:e2e`: exits 1 as explicitly documented: browser E2E is **NOT CONFIGURED**, pending UNI-015. Not counted as a passing test.
- Browser visual QA/screenshots: NOT RUN. Browser automation inventory returned no available browsers. No responsive visual approval claimed.
- Compose config: PASS. `pnpm db:up`: FAIL because Docker daemon sockets are absent. Extension migration/rollback/live extension checks: NOT RUN, prerequisite unavailable.
- `.env`, app-local env files, node_modules and generated app/contracts outputs: confirmed ignored with `git check-ignore`.
- New bootstrap source files: JSON manifests valid and separate whitespace scan passed. Global `git diff --check`: FAIL only on preserved, pre-existing specification whitespace described below.

Warnings retained transparently: Jest VM loader experimental warning, deprecated compatible ESLint 9/jest-dom 6 versions, and blocked optional Parcel watcher install script. See stack document. GitHub CI has been configured, not executed remotely. No paid provider or real dataset was used.

At the initial bootstrap attempt, Docker CLI 29.9.2 and Compose v5.5.1 were installed. `docker compose --env-file .env -f infra/compose.yaml config --quiet` passed. Startup failed: configured Docker Desktop socket `/home/dulmina/.docker/desktop/docker.sock` does not exist. Explicit read-only inspection of the default engine also found `/var/run/docker.sock` absent. No context switch or daemon configuration change was performed.

The original recovery commands (now verified with Docker available; see repair results below):

```bash
docker info
pnpm db:up
pnpm db:migrate
pnpm db:rollback
pnpm db:migrate
pnpm db:down
```

Use the README's extension inspection command to verify both `postgis` and `pg_trgm`. Normal shutdown preserves volumes. The original daemon blocker is resolved; repair verification below supersedes the initial NOT RUN database results.

`git diff --check` reported two trailing-whitespace lines in the pre-existing specification diff (lines 4 and 9); these user edits were deliberately not rewritten. New bootstrap file whitespace is checked separately.

### UNI-001 database rollback repair — verified 16 November 2026

Request: fix the failed rollback without cascading extension removal or deleting persistent data. No Git command was executed during this repair; the branch name above is retained from the initial verified checkpoint.

Inspected the running service, the exact PostGIS image initialization script, PostgreSQL entrypoint behavior, `pg_extension` and `pg_depend`. Image `postgis/postgis:17-3.5`, inspected digest/ID `sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6`, runs PostgreSQL 17.5 / PostGIS 3.5.2. The image initializes both the configured DB and `template_postgis` on empty storage. Initialized volumes skip those scripts. Topology and Tiger depend on PostGIS; Tiger also depends on fuzzystrmatch. Thus the original rollback targeted extensions it did not own.

Changed:

- `infra/db/migrations/001_extensions.up.sql`: transactionally records whether this migration created `pg_trgm`; pre-existing installations are adopted. Repeated apply retains ownership; missing required extensions under an applied record fail explicitly as drift.
- `infra/db/migrations/001_extensions.down.sql`: never drops PostGIS/topology/Tiger; only a recorded migration-owned `pg_trgm` is removable, with `RESTRICT`. Dependency failure rolls back the entire transaction, keeping the applied record. Repeated rollback with no record is safe. Bookkeeping schema/table remains.
- Both directions serialize on advisory transaction lock `(73201, 1)` with a 10-second lock timeout. No persistent application table/data is reset or removed.
- `package.json`: `psql -X` prevents psql startup overrides; `db:test` runs the new isolated Docker regression harness.
- `scripts/test-db-extensions.mjs`: uses the running Compose DB's exact image in a network-isolated container with tmpfs DB storage. It creates only disposable test objects and cleans up only that container; persistent DB/volumes are never removed.
- README, stack and current progress explain ownership, image initialization, repeatability, and recovery from dependency errors. General domain migration/seed tooling remains UNI-002.

Actual verification:

- Docker access: PASS with elevated tool execution (the sandbox denied the socket). Existing `unihood-db-1` was already running and healthy; no volume recreation or Docker context change was needed.
- Persistent DB: `pnpm db:migrate` → `pnpm db:migrate` → `pnpm db:rollback` → `pnpm db:rollback` → `pnpm db:migrate`: **all five commands PASS**. Both rollback calls completed with COMMIT.
- Before/after snapshot: extension names/versions plus exact row counts for every existing non-system table, excluding the new bookkeeping schema, compared with `cmp /tmp/unihood-db-before.txt /tmp/unihood-db-after.txt`: **PASS**, identical. Snapshot contains 6 extensions and 37 existing tables. No persistent data was deleted. The pre-existing `pg_trgm` remained version 1.6; PostGIS/topology/Tiger remained 3.5.2.
- Final persistent state: `001_extensions` applied with `owns_pg_trgm = false`; all six initial extensions retained; Compose service healthy on `127.0.0.1:5432`. It is intentionally left running/applied.
- `pnpm db:test`: **PASS** in disposable Docker storage. All four result groups passed: (1) fresh image initialization/rollback before first apply; (2) expected dependency-blocked rollback keeps the owned extension, migration state, trigram index and spatial data; (3) repeated apply/rollback/re-apply removes only an owned pg_trgm and retains PostGIS-backed data; (4) adoption of a legacy pre-existing pg_trgm preserves its dependent index/data across cycles. The expected RESTRICT failure is asserted, not suppressed or counted as successful rollback.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS** across contracts/API/web.
- `pnpm test`: **PASS**, 3 suites / 8 application/contract tests.
- `pnpm build`: **PASS**, contracts + API + web production build.
- E2E/screenshots were not rerun for this SQL/tooling repair; initial limitations above remain. No remote CI run or human merge is claimed.

The earlier Docker blocker and failed rollback are resolved by these results. The human Git checkpoint remains pending; UNI-002 has not been started.

### Privacy and scope review

No real addresses, coordinates, contacts, photos, prices or vacancies are stored. Root `.env` is ignored. Published ports bind to loopback. No role/header is accepted as authentication. UI copy explains that community recommendations are ad-only and owner locations require explicit consent. Liveness reports process health only, not DB readiness.

### Human checkpoint

No issue is marked merged or Phase 0 complete. Database migration/rollback acceptance now passes; browser visual approval and configured E2E remain outside the verified bootstrap checks, as recorded above. The human alone stages, commits, pushes and opens a PR into `dev`; see final chat checkpoint for exact paths. Stop here; UNI-002 requires a later manually created branch after merge.
