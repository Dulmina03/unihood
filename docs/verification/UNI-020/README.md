# UNI-020 verification — public POI database foundation

Recorded 16 November 2026 (Asia/Colombo). Authorized agent branch `feat/uni-020-place-geography` from clean synchronized dev `5d38ca8e1c13d76cb4ed18ea8f0fbfd0a55cdfe4`; origin verified and fetched. The user's new autonomous workflow explicitly supersedes earlier human-only Git/checkpoint rules; AGENTS/contributor/CI/templates now reflect it. All five product ADRs and specification product requirements are unchanged.

Scope: [migration 003 and rationale](../../architecture/public-poi-database.md). No new POI HTTP/UI or boarding/registration workflow, persistent development migration/seed, private geometry, contact/owner claims or production write enablement. Existing seed tooling remains unchanged; new synthetic POI fixtures live only inside the tmpfs integration harness.

## Local checks

Executed with Node 22.23.4 / pnpm 10.34.9, actor-disabled CI/test environment where applicable:

- `pnpm install --frozen-lockfile --offline`: **PASS**, warm existing store, no lock/dependency changes.
- `pnpm check:repo`, `pnpm check:workflows`: **PASS**; official pinned actionlint 1.7.12 downloaded/checksummed. `git diff --check`: **PASS**. Local documentation link/anchor review: **PASS**, 112 checked before final result edits; final counts are recorded at commit review.
- `pnpm lint`, `pnpm typecheck`: **PASS**. `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 pnpm test`: **PASS, 229** (13 Node tooling, 22 contracts, 69 API, 125 web). The extra Node regression requires explicit pinned-image preparation before isolated E2E. Relevant existing warnings retained, no assertions disabled.
- `pnpm --filter @unihood/api build`: **PASS**. `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false NEXT_TELEMETRY_DISABLED=1 pnpm --filter @unihood/web exec next build --webpack`: **PASS**. No default local Turbopack success claimed.
- `docker compose --env-file .env -f infra/compose.yaml --profile test config --quiet` and `... pull db-test`: **PASS**, existing pinned image; no dev database service was reset/seeded/migrated.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 TEST_LANDING_WEB=1 pnpm db:test`: **PASS, 16 result groups**, exit 0. New real SQL tests cover four synthetic categories, shared building/name/coordinates without false uniqueness, Unicode/per-place aliases, actual concurrent provider-source uniqueness, FKs/restricted deletes, invalid/empty/NaN/infinite/wrong-SRID/type geometry, active-POI-only public locations, boarding links/kind transitions, index definitions, populated/dependent/atomic rollback, concurrent rollback writer, existing-table preservation and remigration. All university/extension/seed/privacy/real HTTP/SSR/outage regressions remain. An earlier no-web variant also passed 14 groups; it is not counted as the full 16-group gate.
- With the same actor-disabled environment and `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright`, `UI_EVIDENCE_DIR=/tmp/unihood-020-browser-evidence pnpm test:ui`: **PASS, all 42 existing cases**, exit 0 (3.1 minutes).
- Same environment, `UI_EVIDENCE_DIR=/tmp/unihood-020-e2e-evidence pnpm test:e2e`: **PASS, six integrated cases**, exit 0 (1.4 minutes), explicit cleanup complete. Actual Next/Nest/PostGIS directory; actual MapLibre/software WebGL with intercepted synthetic map resources. Not live-provider or real-campus verification.

Screenshots/reports stayed in temporary evidence directories; no existing source/photo/reference/CI-failure evidence was replaced. Earlier migrations, extension ownership, runtime API/UI/contracts/authorization, all five ADRs, local .env and persistent data remain unchanged. Only the new paired migration, owned harness/CI diagnostics, explicit workflow-policy updates and progress documentation are in scope. The default local Turbopack workspace build was attempted and **BLOCKED / exit 1** by the existing CSS worker port EPERM. Default CI scripts remain unchanged; the successful supported Webpack build is recorded separately, and the exact-commit remote default build remains to be observed.

## Remote baseline and required integration evidence

Observed GitHub Actions closure commit **5d38ca8e1c13d76cb4ed18ea8f0fbfd0a55cdfe4**:

- [Run #20, docs/uni-015-phase-1-closure](https://github.com/Dulmina03/unihood/actions/runs/43878135342): SUCCESS.
- [Run #21, dev](https://github.com/Dulmina03/unihood/actions/runs/43878285447): FAILURE; Workspace quality and Isolated PostGIS integration PASS; Component browser acceptance failed at the integrated E2E setup before browser cases, after all 42 component assertions passed.

Actual decoded failed job logs show `pnpm test:e2e` at 13:45:03 and generic setup failure at 13:46:04 with cleanup complete; they contain no precise stage/error. A cold Docker image download inside the 60-second launch budget is a possible cause, **not proven**. The changed workflow explicitly pulls the existing pinned db-test image with its own five-minute bound; safe launcher stage/timeout labels improve diagnosis without printing credentials/raw errors. No assertion, startup timeout or required CI job was removed or bypassed. Both independent suites remain mandatory.

UNI-020 exact full tested commit, issue-branch run/all required jobs, fast-forward integration and dev run: **NOT YET OBSERVED**. Never infer success from triggers or old runs. Each follow-up commit needs its own applicable checks; a later issue's record may cite observed predecessor integration without modifying the predecessor's already-tested commit. Unavailable remote verification blocks continuation.

## Manual checks / historical limits

No new UI is introduced; new visual/AT screenshots are not applicable to this schema issue. Existing synthetic/provider/browser boundaries remain. Phase 1 UI-01/UI-03 desktop/mobile and core human Orca smoke are confirmed; remaining manual confirmations are now explicitly [deferred to Phase 6](../../progress/PHASE-06.md), never marked PASS. UNI-013 remote CI remains separately NOT OBSERVED; #7/#8/#9 failures and earlier partial agent Orca attempt remain historical. No broad geographic/provider SLA/real field/privacy certification is inferred.
