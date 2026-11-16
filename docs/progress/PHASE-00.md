# Phase 0 — engineering bootstrap

Phase status: **in progress**, not complete. UNI-003 is merged into `dev`, explicitly confirmed by the human developer during UNI-004 preparation; no Git history was audited. UNI-004 was committed and merged into `dev`, explicitly human-confirmed before UNI-005. UNI-005 was committed and merged into dev, explicitly human-confirmed before UNI-006. UNI-006 tooling/docs are recorded below and await their own human checkpoint. Remote CI has not been observed, so Phase 0 is not declared complete. Earlier handoff entries are historical; the latest issue status supersedes them.

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

## UNI-002 — reproducible database development and test foundation

Owner: M5 infrastructure/integration, M2 database primitives. Dependency: UNI-001 verified bootstrap/rollback repair. Status: **implemented and verified locally; awaiting human Git checkpoint**.

Branch: `chore/uni-002-postgis-dev`, confirmed by reading `.git/HEAD` as a plain file. No Git command was run; integration/remote history was not audited. The user explicitly requested UNI-002 on this manually prepared issue branch. The earlier UNI-001 handoff entries are historical; no merge is inferred from code presence.

### Delivered scope

- Digest-pinned existing PostGIS image, preserved development named volume and loopback port; independent test profile with its own credentials/bridge and tmpfs DB storage. Both health checks use TCP loopback so image initialization must finish before healthy status.
- Ordered paired SQL runner with original-file SHA-256 checksums, unchanged-prefix validation, same-client transactions, shared advisory lock and atomic latest-only rollback. It adopts existing UNI-001 ownership metadata and retains its original SQL files unchanged. No domain schemas from later phases are added.
- Repeatable synthetic seed tooling with an explicit local/test environment guard, production/remote refusal, separate fixture schema, fixed UUID and visibly Synthetic (0,0) infrastructure point. Conflicting local edits and checksum drift fail without overwrite; fixtures persist across extension rollback.
- Strict health/readiness DTOs and read-only readiness endpoints. Existing liveness remains independent of DB failure. Readiness has bounded connection/query timeouts, no-store, generic 503 failures, and clean pool shutdown; no raw connection/SQL details are returned.
- Three migration file/CLI safety tests, expanded API/contracts tests, a Docker integration suite using a unique tmpfs container/random loopback port and real API, and the retained UNI-001 extension regression suite.
- CI database job and optional PR/dev/main push/manual triggers; no auto-deploy or Git mutation. README, environment example and architecture documentation updated.

### Actual verification — 16 November 2026 (Asia/Colombo)

All Docker/socket/HTTP-dependent checks used elevated tool execution where the sandbox denies local sockets. No security setting or socket permission was weakened.

- `pnpm install --frozen-lockfile --offline`: **PASS** after installing pg/types and updating the lockfile. Existing Parcel install-script warning remains; no blanket script approval was enabled.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS** across contracts/API/web.
- `pnpm test`: **PASS**, 3 Node tooling tests + 3 contract tests + 7 API HTTP tests + 1 UI test = **14 tests**. API tests include readiness 200/503 and liveness independence; nonexistent mutation routes remain rejected even with forged owner headers. Jest VM-loader experimental warning is retained.
- `pnpm build`: **PASS**, contracts/API/web production builds. No browser E2E or visual approval is claimed for this infrastructure issue.
- `docker compose --env-file .env -f infra/compose.yaml --profile test config --quiet`: **PASS**; development service and separate manual test service started healthy through `pnpm db:up` and `pnpm db:test:up`.
- Development CLI: `pnpm db:migrate` twice → `APP_ENV=local pnpm db:seed` twice → `pnpm db:rollback` twice → `pnpm db:migrate`: **PASS**. Initial migration adopted legacy ownership into the ordered ledger; subsequent rollback/re-migration retained pre-existing pg_trgm. One synthetic fixture was verified, with no duplicate/overwrite.
- Manual test CLI with explicit TEST_DATABASE_URL on port 5433: `pnpm db:migrate --test` → `APP_ENV=test pnpm db:seed --test` → `pnpm db:rollback --test` → `pnpm db:migrate --test`: **PASS**. Commands target a different PostgreSQL cluster and test database.
- `pnpm db:test`: **PASS**, seven result groups: actual tmpfs/no persistent mounts and unmigrated readiness; concurrent/repeated migration ownership; ordered up/reverse down plus all-or-nothing failure/checksum drift; seed idempotence/environment/conflict/history guards; dependency-blocked rollback preserving both ledgers/spatial data; exact legacy ownership adoption; real database pause producing redacted 503 within deadline while liveness stays 200, followed by readiness recovery. Child API and unique disposable container were cleaned up in finally.
- `pnpm db:test:extensions`: **PASS**, all four UNI-001 fresh-image/owned/pre-existing extension/data/dependency-failure result groups against an independent disposable container.
- `pnpm db:test:down` → `pnpm db:test:up`: **PASS**; direct SQL confirmed the recreated manual test DB had no previous fixture table or ordered ledger. Disposal did not affect development.
- `pnpm db:down` → `pnpm db:up`: **PASS**. A read-only snapshot comparison after restart confirmed all **6 original extension names/versions**, row counts in all **37 original tables**, and `owns_pg_trgm=false` were unchanged from `/tmp/unihood-002-before.json`. The new ordered checksum matched source files; the one synthetic fixture survived. No persistent volume/data was deleted.

Initial failures were corrected and rerun: this Docker engine reports tmpfs under HostConfig rather than Mounts, so tests additionally inspect `/proc/mounts`; Docker-internal networks did not publish the host port, so test networking uses its own bridge with loopback-only ports. The first file-parser test used an invalid trailing comment outside the legacy wrapper; its checksum fixture was corrected. Sandboxed child-process output was unavailable, so successful CLI safety tests used elevated execution. No assertions were removed to manufacture passing results.

### Scope, limitations and handoff

No real places, campus coordinates, boarding inventory, contacts, production auth decisions or public write endpoints were added. The synthetic fixture schema is not exposed by an API and is retained rather than reset during rollback. The ordered runner currently has only the required production migration 001; test-only versions 002/003 exercise the general ordering/rollback implementation. Future applied migration files are immutable. Inspect checksum/history drift instead of editing metadata to bypass it.

Remote GitHub CI is configured but **NOT RUN here**. Browser E2E remains explicitly unconfigured pending UNI-015; UI was unchanged. Broader CI/PR conventions remain UNI-006. Local checks pass; the human alone reviews, stages, commits and integrates this issue into dev with `git merge --ff-only`. PRs are optional, no merge commits, main reserved for stable releases. Do not start UNI-003 until the human completes this checkpoint and prepares its branch.

Final handoff validation: all 22 UNI-002 source/config/documentation paths passed the whitespace/JSON scan; Compose, CI and lockfile YAML parsed successfully. Final Compose validation passed and only the healthy development service remained; disposable manual/automatic test containers were absent. Branch metadata still named `chore/uni-002-postgis-dev`. No Git command was used for inspection or mutation.

## UNI-003 — Campus Teal design system

Owner: M1. Dependencies: UNI-001 workspace/shared UI baseline and approved v3.0 visual/privacy direction; runs on the existing UNI-002 foundation. Branch verified by reading `.git/HEAD`: `feat/uni-003-campus-teal-design-system`. No Git command was run and no integration/remote history was inspected. The user's explicit UNI-003 instruction supersedes stale bootstrap/current-issue text; the correct issue branch already existed.

Status: **human-confirmed merged into `dev`**. Merge confirmation was supplied by the human developer before UNI-004; no merge commit/hash/date or remote-history audit is inferred. The verification below is historical UNI-003 evidence.

### Delivered

- Reusable typed React UI package, standalone typecheck, preserved Campus Teal palette plus semantic/spacing/type/motion/radius tokens; scoped styles and icons. Self-hosted Fraunces/Manrope; photo-led editorial layout based on all four existing visual references.
- Responsive site header, native search, toggle chips, accessible field/error/help, buttons, source/privacy/vacancy badges, cards/grid, notices, skeleton/empty/retry, responsive image/failure state, native modal with explicit keyboard wrapping/focus restoration, map rail/layers/owner-public preview and unavailable-provider/list alternative.
- `/design-system` noindex demonstration, all listings/fees/vacancies synthetic and fixed to a visible sample clock. Functional local filters/save/visibility/validation/recovery; no public write service, no fabricated geography/routing, and no production auth/registration decisions. Existing home preview shares the header/fonts and links to the library; final discovery pages are not implemented.
- Discriminated public display types and conservative runtime presentation: community official-field claims ignored, hidden locality omitted, unverified/unconsented/private/community map previews excluded, invalid price hidden and stale vacancy downgraded. **Client presentation is not a serializer/auth boundary**: callers must remove private fields before passing props. No coordinates/contact data exists in demo DTOs.
- Unit/component/contrast tests and dedicated Playwright/axe component acceptance; 12 screenshot artifacts with exact 390×844 and 1440×900 hero captures plus full-page/map/modal/error evidence. Documentation: `docs/ui/design-tokens.md`, `screen-index.md`, `assets.md`, verification README/JSON, stack and root README.

### Actual verification — 16 November 2026 (Asia/Colombo)

- `pnpm install --frozen-lockfile --offline`: **PASS**.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS**, contracts/UI/API/web; UI now checks independently of Next's DOM libraries.
- `pnpm test`: **PASS**, **23 tests**: Node tooling 3, contracts 3, API 7, web 10. Existing Jest VM-module experimental warning remains.
- `pnpm build`: **PASS**, production contracts/API/web including static `/design-system`.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright pnpm test:ui`: **PASS**, **8 browser tests** across requested mobile/desktop sizes; axe A/AA tags through WCAG 2.2 report zero violations for page and open modal. Mobile/tablet navigation, focus trap/restore, validation, filters, saved/loading/empty/error/retry, map layers/exclusion/list fallback pass. No horizontal overflow at 320/390/768/1440px. Screenshots generated and visually inspected; reference differences documented. No remote font/image runtime resource needed.

Failures found and fixed are recorded in [verification evidence](../verification/UNI-003/README.md). In particular, the approved teal on mint fails small-text AA (4.26:1); the overline uses navy instead, without changing approved tokens. Native dialog focus wrapping and centering were verified after correction. Token tests run in Node; React component tests run in jsdom. No assertions/rules were disabled to get a pass.

### Limits and human checkpoint

This completes UNI-003 foundations, not Phase 0 or Phase 1 screens. Full product E2E remains UNI-015's explicit placeholder; `pnpm test:e2e` was **NOT RUN**. Human screen-reader/translated language/cross-browser review and remote CI were **NOT RUN**; zero axe violations is not a full WCAG certification. Docker regression was **NOT RERUN** for UI-only changes; no database initialization, migration, seed, extension ownership or persistent data was modified. Existing database evidence above remains historical.

At the original UNI-003 handoff, human review/staging/commit/push and fast-forward-only integration into `dev` were pending. The human has now explicitly confirmed that merge, and the UNI-004 issue branch has been prepared. That resolves the former stop-before-UNI-004 checkpoint. No Git command or independent history inspection was performed by the assistant; earlier test results are retained without rerunning them here.

Final evidence validation: both page audit JSON files contain zero violations and zero incomplete rules. The 12 PNGs include exact 390×844 and 1440×900 viewport dimensions; package/config JSON and UI/documentation whitespace scans pass. Final production browser run: 8/8 PASS (20.0s). Branch metadata still names `feat/uni-003-campus-teal-design-system`; no Git command was used.

## UNI-004 — product decision records

Owner: Phase 0 documentation spanning M1–M5 responsibilities. Sequential prerequisites: UNI-001 workspace, UNI-002 database foundation and UNI-003 UI foundation. The human developer explicitly confirmed UNI-003 merged into `dev`; the assistant has not independently inspected Git history. Branch confirmed from `.git/HEAD`: `docs/uni-004-product-decisions`.

Status: **human-confirmed committed and merged into `dev`** before UNI-005. No Git history, merge hash or merge date was independently verified. The verification below remains historical UNI-004 evidence.

### Delivered scope

- [Decision index](../decisions/README.md) and five ADRs: location visibility/consent; student advertisement-only contributions; property-specific owner authority; automation-first governance with exceptional escalation; final-phase registration deferral.
- Each ADR records an existing v3.0 decision, context/rationale, alternatives, consequences, privacy/security boundaries, explicitly deferred questions, links to specification sections and future test obligations. They do not claim runtime enforcement or final authentication policy.
- Index clarifies HIDDEN's separately authorized generic-city exception and the authoritative Phase 7 registration schedule despite older Phase 8 wording. No master specification or AGENTS.md requirement was rewritten. The user's solo human-only fast-forward Git workflow remains in effect.
- Root README and stack documentation link the ADR index. README workspace descriptions now reflect existing API readiness and UNI-003 shared UI components. Progress records distinguish human-confirmed UNI-003 integration from historical verification and UNI-004's pending human checkpoint.

### Verification

Actual checks on 16 November 2026 (Asia/Colombo):

- `python3 /tmp/unihood-004-verify.py`: **PASS** for all 11 changed/new Markdown documents, local file/heading links (including specification references), five ADR structures/metadata, policy coverage probes, newline/whitespace and current issue/merge/stop consistency. A manual policy review checked the actual requirements, rather than treating keyword presence as semantic proof.
- Pre/post SHA-256 source comparison: **PASS**, exactly 11 documentation paths changed/new; no existing file deletion or runtime/config/dependency/specification/AGENTS change. The 97-file baseline excludes dependency/Git/build output and existing ignored TypeScript caches. Tests/build refresh generated artifacts only.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS**, contracts/UI/API/web.
- `pnpm test`: **PASS**, **23 existing tests** (Node tooling 3, contracts 3, API 7, web 10). Existing Jest VM-module experimental warning remains. No prose-mirroring tests or runtime implementation were added.
- `pnpm build`: **PASS**, contracts/API/web production build, existing static `/`, `/design-system` and not-found routes.
- Browser/component/product E2E, screenshots, Docker integration/migration/rollback and remote CI: **NOT RUN for this documentation-only issue**. Existing earlier issue results remain historical; future auth/privacy E2E obligations in ADRs are not implemented or executed by writing them.

See [UNI-004 verification](../verification/UNI-004/README.md) for exact link counts, scope and manual consistency review, corrected checker cache handling, and the explicit actor-header clarification. The temporary checker/manifest are session artifacts under `/tmp`; no runtime/test tool was added. No Git command was used. Human confirmation resolves the former UNI-003 merge checkpoint; it does not assert a merge hash or independent history audit.

### Scope and checkpoint

No runtime/authentication, API/contracts, schema/migration, dependency, environment, UI or persistent data change is authorized by this issue. No Git operation is performed. At the original UNI-004 handoff, human review/staging/commit/push and fast-forward integration were required. The human has now confirmed commit/merge into `dev`, and the separate UNI-005 branch is prepared. This resolves that earlier stop-before-UNI-005 gate; no Git command was performed by the assistant. UNI-005 has its own checkpoint below.

## UNI-005 — REST contracts and guarded actor abstraction

Owner: M5 contract/authorization foundation with M1–M4 consumers. Dependencies: existing UNI-001–003 workspace/API/database/UI foundations and UNI-004 product ADRs. The human explicitly confirmed UNI-004 committed and merged into dev. Branch metadata is `feat/uni-005-api-contracts`; no Git command/history audit was performed.

Status: **human-confirmed committed and merged into dev** before UNI-006. No merge hash/date or independent history audit is claimed; results below remain historical UNI-005 evidence.

### Delivered

- Eight shared Zod/TypeScript enum families; strict UUID/query/pagination/error contracts and five owner/community visibility-safe boarding projections. Unknown/nested private fields fail validation, community cannot impersonate owner fields or exact map publication, and serialization helper downgrades stale/future confirmations. These are future API contract foundations, not a live boarding service or free-text privacy detector.
- Existing identity interfaces retained. Provider-neutral Nest tokens bind to a guarded SyntheticActors adapter: explicit opt-in, compatible local/test environments, loopback binding/socket/Host/Origin checks, no forwarded proxy identity. Server-only synthetic fixture choice; no actor-selector endpoint/header or final identity provider. Private issuance records prevent forged/cloned/mutated memberships from creating grants. Property A capability never grants property B; action permissions are separate.
- Global protected-action boundary denies mutations without explicit metadata/grants and keeps ordinary public reads open. Synthetic flags and arbitrary identity headers do not authorize deployed writes. Test-module-only fixture controllers verify real HTTP denial without shipping domain writes.
- Sanitized generic API exception envelopes, server-generated request IDs and reusable argument validation pipe. Legacy readiness flat 200/503 contract is preserved as an explicit monitoring compatibility boundary; no database strategy change.
- Generated OpenAPI 3.1 from live Nest route/response metadata and native Zod JSON Schema; exporter/saved baseline include five actual GET paths and 18 components. No proposed domain workflow is falsely advertised. Live/export parity and missing-contract metadata checks protect documentation accuracy.
- API/configuration documentation, `.env.example` defaults off, stack/README navigation and progress updates. Existing `.env` is preserved. UNI-004 merge is recorded as human-confirmed rather than inferred from source presence.

### Acceptance verification

Actual checks on 16 November 2026 (Asia/Colombo):

- `pnpm install --frozen-lockfile --offline`: **PASS**, unchanged dependencies/lockfile.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS**, contracts/UI/API/web.
- `pnpm test`: **PASS**, **77 tests**: Node tooling 3, contracts 17, API unit/HTTP 47, web 10. Existing Jest VM-module experimental warning remains.
- `pnpm build`: **PASS**, production contracts/API/web, existing static frontend routes.
- `node apps/api/dist/export-openapi.js > docs/api/openapi.json`: **PASS**, five live GET paths/18 components. Standard HTTP tests establish exact saved/live parity, route existence, schema ref resolution and failure on missing operation contract metadata.
- `python3 /tmp/unihood-005-smoke.py`: **PASS**, official OpenAPI 3.1 schema/component checks and actual built production-mode API responses with synthetic flags deliberately set. Health/OpenAPI reads work; readiness retains redacted flat 503 with an unconfigured database; generic errors validate; domain writes stay absent despite forged headers. The smoke child server is stopped. Separate test-only guarded handlers verify actual unauthorized/forbidden denial, not merely nonexistent routes.
- `pnpm db:test`: **PASS**, all seven disposable Docker result groups, including real DB outage/redacted readiness 503/liveness 200/recovery and existing migration/extension ownership safety. No development volume, data or extension ownership was modified.
- Browser/component/product E2E, screenshots, separate legacy extension regression and remote CI: **NOT RUN for UNI-005**. UI and migration SQL are unchanged; no full-domain workflow/auth readiness is claimed.

See [UNI-005 verification](../verification/UNI-005/README.md) for coverage/limits and [API boundaries](../api/contracts-and-actors.md) for explicit configuration. Validation refinements beyond JSON Schema and the separate readiness monitoring protocol are documented. No final authentication policy, real identity data, hidden-location inference service or domain mutation route was introduced. No Git command was performed.

### Limits and checkpoint

No final authentication, owner proof/delegation/recovery, domain CRUD/claim/contribution workflow, private contact/media pipeline, provider selection or persistent database change is implemented. Future free-text/media moderation, real consent/authorization evidence, cache revocation and full discovery E2E remain their owning issues. Public boardings are contract schemas only; tests do not prove those future surfaces exist or enforce all privacy obligations. All Git actions belong to the human; suggested commit `feat(api): add typed contracts and actor abstraction`. The original stop-before-UNI-006 gate is now resolved by the human-confirmed UNI-005 commit/merge and prepared UNI-006 branch. The human-only fast-forward workflow remains in effect for every later issue.

Final UNI-005 handoff review: seven changed Markdown files and 43 local links/anchors, TypeScript/documentation whitespace, evidence JSON, regenerated OpenAPI parity and safe example defaults PASS. Test-only fixture controllers are absent from compiled production JavaScript. A historical input-hash comparison confirms 49 protected infrastructure/UI/dependency/environment/specification files unchanged; no Git diff/history audit is claimed. Branch metadata remains `feat/uni-005-api-contracts`. That final UNI-005 handoff was historical; the human has since confirmed commit/merge, permitting the separately prepared UNI-006 issue.

## UNI-006 — CI quality gates and contributor conventions

Owner: M5 tooling/integration; existing module tests retained. Dependencies: UNI-001 workspace/commands, UNI-002 isolated DB, UNI-003 component/browser suite, UNI-004 ADRs and UNI-005 shared contracts/actor/OpenAPI tests. UNI-005 commit/merge into dev was explicitly confirmed by the human. Current branch metadata: chore/uni-006-ci. No Git command or history audit was performed.

Status: **implemented and locally verified; awaiting the human Git checkpoint**. Remote CI is NOT RUN/NOT OBSERVED here. Phase 0 is not declared complete before remote and human gates.

### Delivered

- Existing workspace and isolated PostGIS jobs strengthened; separate existing component-browser acceptance job. Supported issue-branch pushes now run before optional-PR solo integration, with dev/main pushes, PR targets and manual dispatch retained.
- Immutable official action revisions, explicit tested Node/pnpm/runner, lockfile-keyed store caching, contents-read-only token/no persisted checkout credentials, synthetic actors off, bounded jobs and cancellation of superseded runs. No deploy/commit/push/PR creation/merge automation or secrets-dependent gate.
- Checksum-pinned actionlint workflow validation, locked YAML development parser and repository/template/security policy checker. Four regression tests reject weakened permissions/triggers, mutable actions, unsafe shell interpolation, masked failures, actor overrides and duplicate YAML keys.
- UNI issue and sanitized bug templates, optional PR template, [human fast-forward workflow](../../CONTRIBUTING.md), [CI coverage](../contributing/ci.md), [coding conventions](../contributing/coding-conventions.md) and [synthetic fixture rules](../contributing/synthetic-fixtures.md). No signup/provider/owner-proof decision changed.
- CI browser evidence uses temporary storage through a test-only UI_EVIDENCE_DIR option; default local behavior remains compatible and existing screenshot references need not be overwritten. No runtime UI/API/domain/database changes.

### Verification

Actual local results on 16 November 2026 (Asia/Colombo):

- `pnpm install --frozen-lockfile --offline`, `pnpm check:repo`, `pnpm check:workflows`, `bash -n scripts/check-workflows.sh`: **PASS**. Actionlint 1.7.12 checksum verified; its initial runner.temp job-env error was fixed by moving paths to step env. No validation rule disabled. ShellCheck absent: **NOT RUN**.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: **PASS**.
- `pnpm test`: **PASS, 81 tests** (Node 7, contracts 17, API 47, web 10), including a successful CI-environment rerun. A restricted-sandbox rerun hit spawnSync EPERM in the unchanged DB CLI test; rerun with subprocess access passed without changing assertions. Existing Jest VM-module warning retained.
- Compose test-profile config validation: **PASS**. `pnpm db:test` with CI actors disabled/test environment: **PASS, seven isolated Docker result groups**, including migration/rollback/checksum/ownership/seed safety and real API outage/recovery. Persistent development data and extension ownership preserved.
- `pnpm test:ui` with CI environment and browser/evidence paths in /tmp: **PASS, eight Chromium tests**, 390×844 and 1440×900 plus intermediate-width checks. Twelve screenshots/two axe JSON reports checked in temporary storage; zero axe violations. Existing browser/system dependencies used; fresh-runner browser installation was **NOT RUN locally**. Checked-in UNI-003 evidence unchanged.
- Read-only pre-edit content comparison and documentation review: **PASS**, exactly 20 intended files, no deletions; protected runtime/API/contracts/DB/environment/specification inputs unchanged; local links/anchors and changed-file whitespace valid.

Remote GitHub Actions execution, hosted browser dependency installation, remote required-check/settings review, full product E2E, cross-browser/human screen-reader and separate legacy extension suite: **NOT RUN/NOT OBSERVED for UNI-006**. See the evidence for exact commands and coverage limits. Local checks do not execute hosted actions, dispatch events, modify branch protections or prove remote CI passed.

### Human checkpoint and limits

See [UNI-006 evidence](../verification/UNI-006/README.md). The human reviews/stages/commits/pushes and integrates into dev with git merge --ff-only; PR optional, no merge commit, main stable releases only. Suggested commit: `chore(ci): add quality gates and PR template`. Stop before UNI-007 or any next issue; UNI-007 is not listed in the specification, and no next task is begun. UNI-010 is merely the next listed task, not permission to proceed.
