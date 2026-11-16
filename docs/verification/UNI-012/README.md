# UNI-012 verification — Urban Map responsive shell

Recorded 16 November 2026 (Asia/Colombo), Node 22.23.4 / pnpm 10.34.9. Prepared issue branch verified through plain `.git/HEAD`: `feat/uni-012-urban-map-shell`. No Git command, remote dispatch, deployment or next issue was performed. Implementation is ready for human review with the local environment limitations below; Phase 1 remains in progress.

## Human integration and remote CI

UNI-011 is human-confirmed **committed and merged into dev**. Its remote CI remains **outstanding/unverified**: no successful run evidence, run URL or commit SHA was supplied. Merge confirmation is not CI evidence. Its [historical local verification](../UNI-011/README.md) is retained. The confirmed successful run #6, dev, short SHA f8e6623 belongs to **UNI-010 only**; all three jobs passed by human verification. No URL or full SHA is invented.

Remote UNI-012 Actions are **NOT OBSERVED**. After the human pushes, check Workspace quality, Isolated PostGIS integration and Component browser acceptance for the relevant commit, recording actual run URL/SHA/conclusions. Local Webpack success does not establish hosted Turbopack success.

## Actual local results

- `pnpm install --frozen-lockfile --offline`: **PASS**; no dependency/lockfile changes.
- `pnpm check:repo`: **PASS**. `bash -n scripts/check-workflows.sh`: **PASS**. Compose validation `docker compose --env-file .env -f infra/compose.yaml --profile test config --quiet`: **PASS**.
- `pnpm check:workflows`: **BLOCKED / exit 6**, fresh GitHub download cannot resolve github.com. Offline fallback: `sha256sum /tmp/actionlint_1.7.12_linux_amd64.tar.gz` exactly matches `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8`, the existing script's pinned digest. Extracting its actionlint into `/tmp/unihood-012-actionlint` and running `/tmp/unihood-012-actionlint/actionlint -color .github/workflows/ci.yml`: **PASS / exit 0**. No workflow/tool pin changed. Fresh network verification is not claimed.
- `pnpm lint`: **PASS**, zero warnings. `pnpm typecheck`: **PASS**, contracts/UI/API/web and browser tests.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 pnpm test`: **PASS: 164 tests** — Node tooling 7, contracts 22, API unit/HTTP 69, web 66. New tests cover query round trips/rejection, parent hierarchy, paginated/strict/no-cookie directory reads, failure/empty recovery, canceled/stale responses, URL dependency reset, restored previews and sheet controls. Existing permission/privacy/OpenAPI tests pass unchanged.
- Default `pnpm build` and `pnpm --filter @unihood/web build`: **BLOCKED / exit 1**, Turbopack cannot bind a worker socket (`Operation not permitted`, EPERM), including after permission-enabled retries. Contracts and API compile; no default web/Turbopack pass is claimed. Package scripts, Next configuration and CI retain their original defaults.
- `pnpm --filter @unihood/web exec next build --webpack`: **PASS / exit 0**, supported production build including static `/explore` with Suspense fallback, landing/photo credits/design system, dynamic QR and existing GET adapters. This output is used for the browser/Docker checks; it is not a claim that Turbopack was verified locally.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 TEST_LANDING_WEB=1 pnpm db:test`: **PASS: 14 result groups**. Real production `/explore` SSR communicates loading/map limitations; existing actual Next → Nest UNI-010 API → isolated tmpfs PostGIS tests verify universities/campuses/gates, public parent validation, QR/not-found, mutation rejection and outage behavior. All concurrent/ordered migrations, repeatable/concurrent seeds, populated/dependency rollback refusal, extension ownership/adoption, readiness and outage recovery regressions remain passing. Only the harness-owned disposable storage/processes are used and cleaned up. No development database commands, persistent data deletion or extension ownership changes.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright UI_EVIDENCE_DIR=/tmp/unihood-012-ui-evidence pnpm test:ui`: **PASS: 24 Chromium tests** — eight existing design-system, eight landing/QR and eight exploration cases. Includes 320/390/768/1440px reflow, tablet collapse, mobile sheet keyboard and vertical pointer dragging, URL reload/Back/Forward/dependent reset, filters/category emptiness, actual clipboard copy and denied-copy manual fallback, share link in a new page, delayed loading, empty/outage/retry, missing/invalid selections, modal containment/Escape/restoration, preview/result focus, skip link and tagged axe checks.

The complete 24-case suite passed before the final mobile context label correction; all eight exploration cases were rerun successfully against the final build and recaptured evidence. Existing installed browser/system dependencies were used. Jest experimental VM-module and browser color-environment warnings remain. Initial lint issues and a test using the wrong synthetic fixture name were corrected. The first browser run was deliberately interrupted after recognizing the fixture-name error; corrected targeted and complete runs passed. Screenshot review identified and fixed a desktop preview/heading overlap; a geometry assertion prevents recurrence. Final mobile context explicitly identifies map unavailability even with the results sheet expanded. No runtime guard or quality policy was weakened.

## Screenshots and reference review

Only synthetic UNI-010 fixtures feed the test-only loopback browser upstream; there is no app fallback dataset. Browser interaction checks run the production Next UI and adapters; actual backend/database integration is separately verified above. No new photography or map imagery was added. Existing approved references, licensed landing assets and historical UNI-003/011 screenshots are preserved.

- [Mobile selected preview — 390×844](explore-mobile.png).
- [Mobile controls — 390×844](explore-controls-mobile.png).
- [Desktop shell and selected preview — 1440×900](explore-desktop.png).
- [Tablet collapsible rail — 768×900](explore-tablet.png).
- [Mobile list alternative — 390×844](explore-list-mobile.png).
- [Desktop list alternative — 1440×900](explore-list-desktop.png).
- [Mobile axe report](explore-mobile-axe.json) and [desktop axe report](explore-desktop-axe.json): **zero WCAG 2 A/AA, 2.1 AA and 2.2 AA tagged violations**. List view and open filters dialog also pass tagged axe checks in the suite. This is not full accessibility certification or human screen-reader approval.

Manually compared captures with the approved [UI-03 Urban Map reference](../../design/references/02_explore_urban_map.png). Navy compact navigation, Campus Teal/mint controls, serif editorial rail heading, 380px desktop rail, layered controls, rounded result cards and grounded selected preview follow its composition. Tablet collapses a 330px rail; mobile uses a touch-sized control bar and scrollable bottom sheet/list alternative. Intentional differences: an explicitly unavailable, abstract grid replaces geography; public-gate previews replace fictional boarding inventory; no unauthorized boarding pin, copied foreign geography, official rent/vacancy badge, live service, distance or directions is invented. Price/radius/vacancy filters have no verified feed yet and are explained rather than rendered as dead controls. UNI-013 owns actual maps/tiles/attribution. Human visual approval remains part of this checkpoint.

## Scope and exclusions

[Shell documentation](../../ui/explore.md) defines supported URL fields, canonical sharing, pagination/timeout limits, interactions, empty states and privacy. Existing public adapters, shared contracts/OpenAPI, API/database/seed code, extension ownership, actor/property permissions, .env and approved palette remain unchanged. Primary exploration copy extends the typed English baseline; comprehensive reviewed Sinhala/Tamil rollout is deferred. No new runtime configuration or migration is needed.

**NOT RUN / not claimed:** hosted Actions, successful default Turbopack build, fresh network actionlint/browser dependency installation, full UNI-015 `pnpm test:e2e` (still an intentional placeholder), cross-browser/human screen-reader checks, real field/provider/license validation, actual map/routing/listing/POI/registration/domain workflows, separate legacy extension script or deployment. UNI-013/014/015 and final registration remain separate issues. The browser stub and actual database integration are distinct tests; no claim is made that the browser suite itself runs against the Docker database.

Final content review: **PASS — 34 intended files**, compared with **187 pre-edit source/artifact hashes** (generated tsbuildinfo excluded); no deletions or protected source changes. **98 local documentation links** resolve. Source whitespace, six screenshot dimensions, two zero-violation axe reports and client JS canaries pass. Server-only API_BASE_URL/DATABASE_URL, test fixture sentinel and private canaries are absent from client bundles. This is a content comparison, not a Git diff/history audit.

## Human Git checkpoint

Issue: UNI-012. Verified branch: `feat/uni-012-urban-map-shell`. Review the exact files/evidence and local limitations first; all commands below are suggestions for the human only.

```sh
git add README.md \
  apps/web/src/app/explore apps/web/src/app/explore.css apps/web/src/app/layout.tsx \
  apps/web/src/components/explore apps/web/src/components/landing/landing.tsx apps/web/src/components/landing/university-picker.tsx \
  apps/web/src/lib/explore apps/web/src/lib/i18n/en.ts \
  apps/web/tests/explore-query.test.ts apps/web/tests/explore-directory.test.ts apps/web/tests/explore.test.tsx apps/web/tests/home.test.tsx \
  apps/web/browser-tests/explore.spec.ts apps/web/browser-tests/landing.spec.ts \
  scripts/lib/test-landing.mjs docs/ui/explore.md docs/ui/landing.md docs/ui/screen-index.md \
  docs/architecture/stack.md docs/contributing/ci.md docs/progress/CURRENT_STATUS.md docs/progress/PHASE-01.md \
  docs/verification/UNI-011/README.md docs/verification/UNI-012
git commit -m "feat(web): build responsive urban exploration shell"
git push -u origin feat/uni-012-urban-map-shell
```

PR optional, base `dev`; review the three remote job results. Human integrates using `git merge --ff-only`; no merge commits; `main` is reserved for stable releases. Stop before UNI-013; create/switch the next issue branch manually only after integration and separate authorization. Do not stage generated tsbuildinfo or temporary logs.
