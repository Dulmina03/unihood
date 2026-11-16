# UNI-021 verification — public category layers and bounded POI reads

Recorded 16 November 2026 (Asia/Colombo). Branch `feat/uni-021-public-poi-layers` from clean synchronized dev eb11e9e832312ce509edf1fdf4f7211186389546, after independently observed UNI-020 issue run #22 and dev run #23 passed all three jobs. UNI-020 publishing permission blocker is resolved by successful HTTPS push. Predecessor metadata/results are recorded on this subsequent branch without rewriting historical failed attempts or inventing self-CI.

Scope: [read-only API/UI/contracts and guarded synthetic seeds](../../api/places.md), preserving existing university/MapLibre/list/favourites layouts and privacy boundaries. No private boarding geometry, inferred distance/route, owner claims, contribution/auth flow, duplicate engine or UNI-022 detail/nearby calculation is introduced. No migration file, extension ownership, .env or persistent development data was modified by verification.

## Actual local results

- Lint and typecheck: PASS after fixing a new typed fetch test mock. Shared/HTTP route inventory was updated for the two actual read-only routes and required bbox; no assertion was disabled.
- Full unit/API/UI `pnpm test`: PASS **259 tests**, 13 Node/36 contracts/78 API/132 web. Earlier failures were the new mock's TypeScript tuple and the previous live-route inventory/default-200 expectation for newly required bbox; corrected to match actual safe behavior.
- Full `TEST_LANDING_WEB=1 pnpm db:test`: PASS **17 groups**, real PostGIS SQL + HTTP + Next/Nest SSR, including POI query/category/sort/page/empty/invalid/read-only, synthetic policy and seed conflict preservation. Final rerun also passed late-conflict seed atomicity: a point inserted before a later conflict is rolled back and local edits remain untouched. An initial concurrent web rebuild/start overlapped and the SQL-passing run failed its Next startup; sequential finished-build rerun passed. This failed attempt is not counted as full acceptance.
- Four new targeted browser cases: PASS (mobile/desktop); after card spacing/copy review, final complete `pnpm test:ui` PASS **46 cases**, exit 0 (3.7 minutes), preserving all 42 existing cases. Final two axe reports: zero tagged WCAG 2 A/AA, 2.1 AA, 2.2 AA violations. Screenshots captured/inspected as recorded below; native Enter selection, preview focus/restoration, URL/search/category/sort/page/history/reload/share and failure/retry/read-only adapters are exercised.
- Default `pnpm build`: attempted, existing local Turbopack CSS worker socket EPERM, exit 1. API compile passes; final supported `pnpm --filter @unihood/web exec next build --webpack` PASS, exit 0, including both new adapters and worker output. The final production output was completed before browser/DB startup; API build also PASS. No default local pass claimed; remote default build still required for exact new commit.

- `pnpm test:e2e`: PASS **eight integrated cases**, exit 0 (1.6 minutes), six original guest cases plus two real Next/Nest/PostGIS POI journeys; cleanup complete. Directory/POI/category responses are not intercepted; only provider resources are mocked.
- `pnpm install --frozen-lockfile --offline`, `pnpm check:repo`, `pnpm check:workflows` (pinned actionlint checksum verified), `pnpm lint`, `pnpm typecheck`, changed-script syntax, Compose validation and `git diff --check`: PASS. No package/dependency/lockfile changes.
- Final standalone `pnpm test`: PASS **259**, exit 0. A concurrent local rerun while software-WebGL browser gates were active had two jsdom wait failures; the exact suite rerun alone passed without changing assertions, timeouts or worker settings. No completed assertion failure is hidden as a pass; concurrent local load is a limitation, not a diagnosed app defect. Only the final clean command is counted as the acceptance pass.

Exact test environment: CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1; browser runs use PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright and UI_EVIDENCE_DIR=/tmp/unihood-021-final-browser or /tmp/unihood-021-final-e2e. Docker gate additionally uses TEST_LANDING_WEB=1. No persistent development migration or seed was executed.

## Screenshot and accessibility review

- [Desktop 1440×900](public-pois-desktop.png) and [mobile 390×844](public-pois-mobile.png) were agent-inspected against the approved Urban Map direction. Existing navy/Campus Teal, editorial serif, results rail/sheet, focus outline, category controls, attribution and selected public preview are preserved. New POI cards use the same tokens/card rhythm.
- [Desktop axe](public-pois-desktop-axe.json) / [mobile axe](public-pois-mobile-axe.json): zero tagged violations. Browser checks cover 320px horizontal overflow and tablet 768px as well as existing 390/1440 regressions. This is browser emulation/software WebGL, not physical phone/GPU certification or real screen-reader approval.
- Captures show focused selected Pharmacy, the scroll position needed to reach the results, and the mobile sheet expanded after marker selection. Full university selectors can require rail/sheet scrolling. The rectangular basemap is explicitly **Mock map resources · synthetic geometry**; POI names/provenance are fictional. No realistic campus/business inventory, owner claims, route or distance was added for visual effect.

Evidence remains synthetic; no human visual/AT approval for this new layer is inferred. Final source/link/staged-scope review is performed before commit; runtime checks are not rerun solely for these documentation result updates.

## Test boundaries and manual items

Unit/API tests use a fake repository to inspect parameter binding/DTO failures; Docker tests separately use actual isolated PostGIS and real Nest/Next. Existing browser suite/new layer cases use a test-only synthetic HTTP upstream and actual MapLibre/software WebGL with explicit intercepted GeoJSON style. The owned E2E runner's new POI case uses real Next → Nest → tmpfs PostGIS without directory/POI/category interception; only map resources are mocked. No new live-provider check, real campus/business verification, route measurement or physical device test is claimed.

Synthetic POI seeds have fictional names/source labels around (0,0); category labels do not prove business existence. No public OSM/Nominatim extraction or provider credential is added. Screenshots are agent review, not human certification; further manual accessibility remains visible in [Phase 6 carry-over](../../progress/PHASE-06.md), not automatically PASS.

## Remote integration

Issue commit/push/exact-commit CI, fast-forward dev merge/push and dev CI: NOT YET OBSERVED. Do not continue UNI-022 until all required exact-commit issue/dev jobs pass. No Git main/release/deployment action is authorized by this issue. Historical UNI-013 remote uncertainty, CI failures #7/#8/#9/#21 and local Turbopack limitations remain preserved.

Final working-tree review PASS: 105 local Markdown links/anchors, scope/whitespace review, exact screenshot dimensions and zero-violation reports; no DATABASE_URL/API_BASE_URL/synthetic-actor/private test canaries in built client JavaScript. Staging and staged-diff review remain pending. Earlier SQL migrations, extension ownership, five ADRs, .env, dependency lock and approved references/photos remain untouched. Only scoped runtime/contracts/tests/fixtures/evidence and accurate predecessor/progress documentation are included.

Resume checkpoint: the attempted staging action was not executed because automatic approval review reached its service usage limit; this was not a finding that the changes were unsafe. No issue commit, push or remote CI resulted. The latest user-supplied repository instructions require human-only Git operations, so work stops at the human Git checkpoint despite the autonomous policy currently stored on disk. UNI-022 remains unstarted.
