# UNI-022 verification — public POI detail and service cards

Recorded 17 November 2026 (Asia/Colombo). Human-created branch `feat/uni-022-poi-detail-nearby-services`, clean baseline aa8858409d9eedfae654eff3fb5c4278ec534efe after verified UNI-021 issue #25/dev #26 all-three-job SUCCESS. No Git mutation by the agent. Implementation: [public API/navigation/source boundaries](../../api/places.md). No migration, extension ownership, persistent development data, credential/provider change or later contribution/boarding/auth workflow.

Local implementation/acceptance completed; human Git checkpoint pending. No remote result is inferred from local checks or predecessor CI. UNI-022 remote CI and integration NOT OBSERVED. Existing local Turbopack and historical CI failures remain recorded; additional Phase 1 manual AT remains deferred to Phase 6, not PASS.


## Confirmed local checks so far

Environment: Node 22.23.4 / pnpm 10.34.9. Runtime commands use `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1`. Browser commands additionally use `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright`, `UI_EVIDENCE_DIR=/tmp/unihood-022-final-browser` (component) or `/tmp/unihood-022-final-e2e` (integrated). Docker regression adds `TEST_LANDING_WEB=1`. No persistent development migration/seed/reset was executed.

- `pnpm lint`, `pnpm typecheck`, `pnpm check:repo`, pinned checksum-verified `pnpm check:workflows`, changed-script syntax and `git diff --check`: PASS.
- Full standalone `pnpm test`: PASS **269 tests** (13 Node, 37 contracts, 81 API, 138 web), exit 0. Includes actual live/exported OpenAPI parity for the new read-only route. A sandboxed first run failed the pre-existing Node launcher/socket tests before workspace tests could run; permitted loopback execution was required. First unrestricted run exposed an incorrect new jsdom native-Escape assumption, corrected to test the Close control while real Escape remains checked in Playwright; an existing POI test also timed out during competing build load, then passed unchanged in isolation and the final full standalone suite. No assertions/timeouts/workers were relaxed.
- API compile and final `pnpm --filter @unihood/web exec next build --webpack`: PASS. Default `pnpm build` attempted and failed with the historical Turbopack CSS worker process/port bind EPERM (exit 1), even with available execution permission. The supported Webpack build was rebuilt successfully after corrections, before final browser startup. Default local build is BLOCKED, not PASS; new remote CI is still required after human push.

## Defects caught and corrected

- Axe found a small teal label on the new mint panel at 4.26:1 contrast. The label now uses the approved navy token; no palette change or axe exclusion.
- The initial new Next loading boundary flushed HTTP 200 before discovering an unavailable POI. Removed that early streaming boundary so server guest entry preserves a real HTTP 404; retained bounded server fetch and announced client retry loading. The existing 404 browser assertion was preserved. This follows the installed Next documentation's streamed/non-streamed status behavior.

## Privacy and scope review

Detail SQL binds canonical UUID, uses the same active POI/unmerged/public-location/environment filters as list reads, projects explicit fields, and never joins residential/identity/private-source tables. Unknown, unpublished, unlisted, pending, merged, BOARDING and deployed synthetic IDs reveal no successor/private facts. Shared detail DTO is strict; same-origin and client retry validate exact ID and reject extra/private payload fields. Requests carry no incoming identity/cookies, refuse upstream redirects and redact faults. No write controller or synthetic actor authority is added.

The UI-09 conceptual name slug uses the existing canonical UUID for stability without an unnecessary migration. The contextual back link accepts only existing validated exploration state and rechecks membership on return; canonical sharing intentionally drops context. The selected public gate's existing bbox is the only service-discovery origin. No nearest ranking, walking radius/route/distance, private boarding origin, fabricated business/hours/phone, owner claim or automatic source-to-ownership inference. Source verification, location confirmation and record edits stay distinct. Correction guidance expands but explicitly sends no report; contribution/duplicate/auth workflows remain deferred. All five ADRs and persistent data/extension ownership remain untouched.

## Evidence boundaries and manual gates

Component tests use the test-only synthetic HTTP directory/POI upstream; the failure/recovery case also injects a labeled synthetic response. Actual MapLibre runs elsewhere in the preserved suite with mocked style resources/software WebGL. The separate owned E2E uses real Next → Nest → tmpfs PostGIS and no directory/POI/detail API interception; only map resources are mocked. Neither establishes live provider uptime, real campus/business coverage, field data verification or physical phone performance. No new real screen-reader or human visual approval is claimed. Phase 6 manual AT carry-over remains DEFERRED, not PASS.

## Human checkpoint

UNI-022 commit/push, issue CI, human fast-forward dev integration/push and dev CI: NOT OBSERVED. No Git operations were performed by the agent. Do not start UNI-023 before the checkpoint and required CI gates. Main, releases and deployment remain untouched.


## Final browser/database results and screenshot review

- `pnpm install --frozen-lockfile --offline` and test-profile Compose validation: PASS. No dependency/lock or environment file change.
- `pnpm test:ui`: PASS **50 cases**, exit 0, 3.4 minutes. All previous 46 preserved, four new mobile/desktop detail cases. Covers Enter navigation, direct canonical entry/reload, validated contextual back link, Back/Forward, share dialog/focus restoration, correct 404, protected mutation absence, loading, sanitized error and retry. Existing map/network/WebGL/list-fallback/sheet/favourites regressions remain passing. Earlier targeted run correctly failed on contrast; its follow-up passed axe but exposed the early-streaming 200/404 issue; both corrected before this full pass.
- `TEST_LANDING_WEB=1 pnpm db:test`: PASS **17 result groups**, exit 0. New real PostGIS assertions cover canonical detail with dates, unknown/invalid/BOARDING/unlisted/archived/pending/merged IDs, production synthetic exclusion and verified-provenance/location-confirmation branches. Existing migrations/rollback, extension adoption/ownership, seed repeatability/conflict atomicity, university and outage regressions all preserved. Only owned tmpfs fixtures are mutated/restored.
- `pnpm test:e2e`: PASS **ten cases**, exit 0, 1.4 minutes; all original eight preserved and two real detail journeys added. Real Next/Nest/PostGIS public detail → reload/share → contextual filtered return → selected marker works on mobile/desktop. No POI/detail API response is intercepted. Owned-service cleanup completed; no persistent database targeted.
- Agent inspected [390×844 viewport](poi-detail-mobile.png), [1440×900 viewport](poi-detail-desktop.png), [mobile full page](poi-detail-mobile-full.png) and [desktop full page](poi-detail-desktop-full.png). Dimensions checked. The new page follows UI-09's text-led service purpose with the approved navy header, serif title, restrained Campus Teal actions and mint public-point panel, consistent with [Urban Map](../../design/references/02_explore_urban_map.png) and the specification's extended detail language. No invented business photos, ratings, contact or route was added. UI-03's rail/sheet/preview/markers remain in the regression suite.
- Visible differences: standalone detail has source/facts and a public-coordinate panel rather than an inline map/photo gallery; users return to the existing interactive exploration map. On mobile the facts precede the point/actions below the fold, with no sticky action obscuring text. Full-page companions show that scrollable content. 320/768px reflow/overflow assertions pass; no separate physical-tablet or human visual approval is implied.
- [Mobile axe](poi-detail-mobile-axe.json) and [desktop axe](poi-detail-desktop-axe.json): zero tagged WCAG 2 A/AA, 2.1 AA and 2.2 AA violations. This is automated Chromium/software graphics evidence, not full WCAG certification or real AT testing.
- Final scope/static-bundle review: no DATABASE_URL/API_BASE_URL/synthetic-actor/private test canaries in built browser JavaScript; .env, lockfile, applied migrations, ADRs and approved references unchanged. Working-tree diff/whitespace and local Markdown links checked; no staged-diff review is claimed because nothing is staged by the agent.

The final API-only review generalized the shared OpenAPI 400 description from bounded-query-only wording to “Invalid parameters”, also accurate for UUID detail requests. It changes documentation metadata only; saved OpenAPI was regenerated and the final API-only rerun PASS: 81 tests, exit 0, including exact live/exported OpenAPI parity. No runtime behavior changed after the complete browser/database passes.


### Suggested human staging and publishing commands

Review the working-tree diff first. These explicit paths contain the scoped implementation and predecessor evidence; do not use this handoff to stage credentials or unrelated work.

```sh
git add -- README.md apps/api/src/places apps/api/test/contracts-http.spec.ts apps/api/test/places.spec.ts \
  apps/web/browser-tests/poi-detail.spec.ts apps/web/browser-tests/start-landing-server.mjs \
  apps/web/phase1-tests/public-pois.spec.ts apps/web/src/app/layout.tsx apps/web/src/app/places.css \
  'apps/web/src/app/api/places/[id]' apps/web/src/app/places apps/web/src/components/places \
  apps/web/src/components/explore/explore.tsx apps/web/src/components/explore/poi-results.tsx \
  apps/web/src/lib/places/detail.ts apps/web/src/lib/places/links.ts apps/web/tests/poi-detail.test.tsx \
  docs/api/openapi.json docs/api/places.md docs/contributing/ci.md docs/progress/CURRENT_STATUS.md \
  docs/progress/PHASE-02.md docs/testing/phase-1-acceptance.md docs/ui/screen-index.md \
  docs/verification/UNI-021 docs/verification/UNI-022 packages/contracts/src/openapi-schemas.ts \
  packages/contracts/src/place.ts packages/contracts/src/place.test.ts scripts/lib/test-public-pois.mjs
git diff --cached --stat
git diff --cached --check
git commit -m "feat(places): add public POI detail and source freshness"
git push -u origin feat/uni-022-poi-detail-nearby-services
```

PR base: dev; PR optional. Observe all three issue-branch CI jobs for the resulting exact commit before human fast-forward-only integration into dev; push dev and verify its exact-commit CI before UNI-023. No new issue commit/SHA/run is invented here.


## Confirmed human integration — 17 November 2026

Human commit/push and fast-forward dev integration/push are complete at exact SHA `ecf7a80155d34cf935a7c8ce19d6223ecffbb309`. Read-only Git inspection confirmed clean dev and matching origin-dev/issue refs. Independently queried [issue run #28](https://github.com/Dulmina03/unihood/actions/runs/43946060187) and [dev run #29](https://github.com/Dulmina03/unihood/actions/runs/43947129199): both completed SUCCESS for that full SHA, all three required jobs completed SUCCESS. [Issue metadata](issue-run-28.json), [dev metadata](dev-run-29.json). These observations supersede the earlier pending human checkpoint without altering its original local results or failed attempts. UNI-023 starts on a separate human-created branch; no agent Git mutation in this follow-up.
