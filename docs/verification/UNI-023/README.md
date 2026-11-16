# UNI-023 verification — public POI normalization and candidate scoring

Recorded 17 November 2026 (Asia/Colombo). Human-created branch `feat/uni-023-duplicate-matcher` from clean synchronized dev ecf7a80155d34cf935a7c8ce19d6223ecffbb309, after independently verified UNI-022 issue #28/dev #29 all-three-job SUCCESS. No agent Git mutations. [Scope, algorithm, privacy and deferred matrix](../../architecture/poi-duplicate-matching.md).

Local verification complete with the recorded default-build limitation; human Git checkpoint pending. No current issue remote commit/push/CI/integration is claimed. New migration 004 is index-only; previous migrations, extension ownership, persistent development data and five ADRs are unchanged. No new UI/REST/write endpoint/authentication or UNI-024 work. Pending contributions, private boarding matching, image/contact evidence, calibration and transactional submit protection remain explicitly unfinished future work, not a claimed complete §6.3 pass.

## Executed local checks

Environment: Node 22.23.4, pnpm 10.34.9. Runtime/test commands use `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1`; browser gates additionally use `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright` and UI_EVIDENCE_DIR=/tmp/unihood-023-browser or /tmp/unihood-023-e2e. Docker adds TEST_LANDING_WEB=1. No persistent development migrate/seed/reset was run.

- `pnpm install --frozen-lockfile --offline`, `pnpm check:repo`, `pnpm check:workflows` (actionlint 1.7.12 checksum verified), Compose test-profile config, script syntax, lint and typecheck: PASS. No dependency/lock/environment change.
- Standalone full `pnpm test`: PASS **282 tests**, exit 0: 13 Node, 45 contracts, 86 API and 138 web. Includes unchanged live/exported OpenAPI equality; there is no new API route or public OpenAPI matching schema. All existing web assertions remain enabled.
- API build PASS. Default `pnpm build` attempted: BLOCKED/exit 1 by the same local Turbopack CSS worker process/port bind EPERM. Supported `pnpm --filter @unihood/web exec next build --webpack`: PASS, exit 0. No default local pass or new hosted pass claimed.
- Final `TEST_LANDING_WEB=1 pnpm db:test`: PASS **18 groups**, exit 0. Real ST_DWithin/geography and pg_trgm, exact-source geometry drift, aliases/legacy normalization, same-building/category ambiguity, separate towns, production synthetic exclusion and synthetically VERIFIED branch, unpublished/boarding/hidden-building exclusion, date-line/pole/49–51m cases, actual independent read-only concurrent connections, dense/alias truncation and stable results. Existing university, readiness/outage, source uniqueness, migration order/atomicity/ownership and populated rollback regressions remain passing.
- Migration 004's index is usable by EXPLAIN with a test-local planner setting, drops/recreates safely with populated rows unchanged, repeats migrate without change, and refuses to adopt a conflicting pre-existing index. That independently created test index survives the failed migration; original extensions/rows remain. This proves correctness/index availability, not production performance. Only proven disposable tmpfs fixtures are inserted/deleted/restored.

## Corrected attempts and limitations

The new unit mock initially assumed a Jest global under ESM; importing it revealed an undeclared-module TypeScript error once permitted execution exposed diagnostics (sandboxed diagnostics also reported stream-descriptor EPERM). Replaced it with a typed local test adapter without a dependency addition. A read-only assertion initially mistook the column `merged_into` for the SQL verb MERGE; corrected to actual keyword boundaries, retaining the prohibition on mutations/GUC changes/private-table reads. The initial metre-boundary fixture hit an overloaded ST_Project signature; explicit double-precision fixture parameters fixed it. The engine's geography query itself passed those earlier stages. A legacy web component await timed out during competing checks, then the identical full suite passed alone without changing its assertions/timeouts/workers; the exact cause is not claimed diagnosed. No failed attempt is counted as a full pass.

Synthetic dataset coverage is narrower than the complete eventual §6.3 matrix: private boarding operators/ad reconciliation/owner claims, confidential contact/image evidence, pending contributions and transactional concurrent submit prevention remain deferred. Rejected unsupported input and excluded unpublished rows are boundary tests, not implemented private matching. All results require review; ordinal scores are not probabilities; no automatic merge or identity/ownership transfer exists. Human field calibration, actual photo matching, real data/consent, production load benchmarks and manual AT approval are NOT RUN by this backend issue. Phase 6 accessibility carry-over remains deferred, not PASS.

No UI files/design references were changed. Existing browser screenshot/axe checks remain regression evidence with explicitly mocked map resources, not new human approval or live provider verification. Five ADRs, old migration files, extension ownership, .env and persistent data remain intact.


- `pnpm test:ui`: PASS **50 existing cases**, exit 0 (3.2 minutes). Existing mobile/desktop selectors, map/lifecycle/list fallback, URL history/share, favourites, POI detail and accessibility regressions preserved; captures remain in temporary evidence storage. These are regression checks, not a new UNI-024 duplicate-warning UI journey.
- `pnpm db:test:extensions`: NOT RUN as a separate legacy development-infrastructure command; the isolated suite exercises extension ownership/dependency/adoption and version preservation without touching the persistent development DB.


- `pnpm test:e2e`: PASS **ten existing integrated journeys**, exit 0 (1.3 minutes); real Next/Nest/migrated-seeded tmpfs PostGIS with mocked map resources only. Existing guest/favourites/public detail/map flows preserved. Cleanup completed. This does not implement a UNI-024 duplicate-warning journey.
- Final identity review removed trimming from opaque provider/external IDs. Unit and actual PostgreSQL fixtures prove whitespace/Unicode-width forms remain distinct and exact; no normalization silently points to another source record. Reran all **282 tests**, lint/typecheck, API/final Webpack builds and all **18 Docker groups** successfully after this correction. The 50/10 browser runs precede this internal-only correction, cover unchanged UI/public endpoints and are not falsely presented as exercising the new matcher API (none exists).
- Scope/static review: unchanged old migration files, .env, lockfile, five ADRs, approved references and UI. No DATABASE_URL/API_BASE_URL/synthetic-actor/private test canaries in built browser JavaScript. Markdown file/anchor links and working-tree whitespace checked. Nothing is staged by the agent; staged-diff review belongs to the human checkpoint.

## GIT CHECKPOINT — HUMAN ACTION REQUIRED

Issue UNI-023. Verified branch `feat/uni-023-duplicate-matcher`. Changes: internal API matcher/provider and tests; shared normalization/contracts/tests; paired index migration and isolated synthetic fixture/harness; architecture/progress/predecessor CI evidence. No new runtime environment requirement beyond applying normal ordered migrations. Scores still need future labeled field calibration; pending/private/media/submission scenarios remain explicitly deferred.

Review the working-tree diff and stage only these scoped paths. `--no-pager` keeps the review summary from pausing the command sequence.

```sh
git add -- README.md apps/api/src/app.module.ts apps/api/src/duplicates apps/api/test/poi-matcher.spec.ts \
  packages/contracts/src/index.ts packages/contracts/src/poi-matching.ts packages/contracts/src/poi-matching.test.ts \
  infra/db/fixtures/poi-matching.synthetic.json \
  infra/db/migrations/004_public_poi_geography_index.up.sql infra/db/migrations/004_public_poi_geography_index.down.sql \
  scripts/test-database.mjs scripts/lib/test-poi-matching.mjs scripts/lib/test-universities.mjs \
  docs/architecture/poi-duplicate-matching.md docs/architecture/public-poi-database.md \
  docs/progress/CURRENT_STATUS.md docs/progress/PHASE-02.md \
  docs/contributing/ci.md docs/contributing/synthetic-fixtures.md docs/verification/UNI-022 docs/verification/UNI-023
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(places): add public POI duplicate candidate scoring"
git push -u origin feat/uni-023-duplicate-matcher
```

PR base dev; PR optional. Observe all three issue-branch jobs for the exact resulting commit before human fast-forward-only dev integration/push; verify exact dev CI before creating the next UNI-024 branch. No new commit SHA or future CI result is invented. Stop here; no routine Git operations by the agent and no UNI-024 implementation.
