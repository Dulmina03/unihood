# UNI-024 verification — duplicate warning API and review UI

17 November 2026 (Asia/Colombo). Human-created clean branch `feat/uni-024-duplicate-warning` starts at **e36681c940b990b903cf88633f8eafd329ca3130**, with local dev/origin-dev synchronized after verified UNI-023 issue #30/dev #31 SUCCESS. No agent Git mutations. [API/UI contract, local instructions and boundaries](../../api/duplicates.md). All five ADRs remain unchanged.

## Scope and acceptance mapping

- Specification §3.6, §6.1 steps 1–4, §7.2 contributing-actor duplicate check and §10 UNI-024: bounded public-POI preflight → accessible warning/context → update-existing, distinct-with-reason or cancel choice. Name/category/public entrance only; internal provider/building/tuning fields and residential payloads rejected.
- Existing global actor/permission guard, explicit loopback simulation and shared error envelope; staging/production/unknown environments and arbitrary identity headers grant no authority. Shared 20/minute process budget and three-active-check bound. CORS only for this endpoint and configured eligible loopback origin; no proxy-created synthetic authority, wildcard, credentials or new auth provider.
- Shared Zod request/response/ephemeral choice contracts and actual live generated OpenAPI POST body/results/authorization annotation/errors. Runtime validation sanitizes malformed matcher projections and unavailable DB errors.
- `/places/check-duplicates`, linked from public POI results: reusable Campus Teal editorial layout, input validation, loading, cancel/stale-response protection, focus on result heading and restoration on cancel, empty/truncated/authorization/rate/unavailable/retry states. Contextual ambiguity and ordinal ranking are not verified identity or probabilities.
- Choices/reason remain RAM-only; no localStorage, URL snapshot, submission or canonical mutation. Final transaction/idempotency/pending-source work is UNI-025; full contribution draft/proposal path is UNI-026. No new migrations, seed data, boarding/POI publication, owner authority, map provider or registration feature. No complete §6.3 whole-product claim.

## Actual local verification

Node **22.23.4**, pnpm **10.34.9**. Runtime checks set `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false`; production/browser commands additionally disable Next telemetry, with the owning API tests/harness explicitly configuring only their isolated actors. Browser checks add `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright UI_EVIDENCE_DIR=/tmp/unihood-024-ui`. No persistent development migrate/seed/reset was performed.

- `pnpm install --frozen-lockfile --offline`: PASS, lockfile unchanged.
- `pnpm check:repo`, changed `.mjs` syntax and `git diff --check`: PASS. Final documentation review and **121 local Markdown file links** PASS; no remote link/anchor availability claim.
- `pnpm check:workflows`: PASS, fresh checksum-verified actionlint **1.7.12**. Initial restricted download failed DNS; permitted retry succeeded. Workflow files remain unchanged.
- `pnpm lint`, `pnpm typecheck`: PASS. Fixed new environment-helper test typing; no assertion/dependency weakening.
- Final `pnpm test`: PASS **302 tests**, exit 0: **13 Node + 47 contracts + 97 API + 145 web**. Includes live/saved OpenAPI equality, strict inputs, public projections, guest/deployed/forged/cross-site/forwarded denials, actual HTTP rate cap, concurrent active cap/release, storage absence, stale-input clearing, review choices and retry/fallback.
- `pnpm --filter @unihood/api build`: PASS. Supported `pnpm --filter @unihood/web exec next build --webpack`: PASS, exit 0. Default `pnpm build`: attempted, exit 1 / locally BLOCKED by Turbopack CSS worker process/port binding EPERM; not reported PASS. No hosted build result inferred.
- `TEST_LANDING_WEB=1 pnpm db:test`: PASS **19 result groups**, exit 0. Adds real configured loopback contributor HTTP → Nest → PostGIS candidate check, actual CORS preflight, no credentialed CORS, no-store/public-only response, and residential/internal-source/forwarded/cross-site rejection. Explicit before/after canonical-place snapshot proves the HTTP check does not mutate places. Existing read-only matcher, Unicode/metre fixtures, private/public separation, deployed synthetic exclusion, source uniqueness, migration rollback/remigration/ownership, readiness/outage and real Next/UNI-010 regression groups remain enabled. Only unique proven tmpfs fixture storage is modified.
- Final `pnpm test:ui`: PASS **56 cases**, exit 0, 3.2 minutes: 50 preserved regressions + six new desktop/mobile duplicate review cases. Actual completed rerun after the locator correction; no skipped/retried cases. New choices, keyboard/focus, loading cancellation/stale-response discard, 401/429/503 retry, empty/incomplete states, responsive screenshots and zero-violation axe checks passed.
- `pnpm test:e2e`: PASS **ten cases**, exit 0, 1.3 minutes. Real Next → Nest → migrated/seeded isolated tmpfs PostGIS; guest actors remain disabled. Only map-provider resources are mocked. Existing QR/selection/explore/preview/favourites/share/history, POI map/list/detail, error/retry/list fallback and accessibility regressions passed. Owning harness confirmed service cleanup and no persistent DB target.

## Corrected attempts

The first restricted Node launcher test invocation exited nonzero before workspace suites; the permitted full invocation passed unchanged Node assertions. Initial web typing attempts failed (new Button ref typing was corrected using a form ref; final helper tests also required an environment shape compatible with Next's augmented ProcessEnv). Diagnostics were only visible in the permitted typecheck. These failed attempts are not counted as passing gates.

An early browser attempt overlapped a build in the shared `.next` output and was explicitly cancelled (exit 130); its failures are invalid acceptance evidence, not a diagnosed runtime defect. Rebuilt Webpack sequentially. The next complete browser run passed 54/56 and failed the two new error-state cases: `getByRole('alert')` matched both the real form alert and Next's route announcer. Scoped the locator to the named form, preserving all error assertions and application behavior; the successful final full rerun is recorded above. No retry/timeouts/skips or existing assertion changes were used to hide failures.

## Screenshot and accessibility review

Browser captures are explicitly synthetic matching responses, not real provider/location/authorization verification. Viewport **390×844** and **1440×900** plus full-page captures are retained: [mobile](duplicate-review-mobile.png), [mobile full page](duplicate-review-mobile-full.png), [desktop](duplicate-review-desktop.png), [desktop full page](duplicate-review-desktop-full.png), [mobile axe](duplicate-review-mobile-axe.json), [desktop axe](duplicate-review-desktop-axe.json). Both axe WCAG A/AA scans at the captured distinct-choice state returned **zero violations**. Both projects assert no horizontal overflow at **320px** and **768px**. Keyboard Enter submits; results focus moves to their heading; native radios/select/textarea remain keyboard-operable; cancel restores Check button focus; reload discards unsent review.

Agent inspected mobile and desktop viewport/full-page captures against the approved Urban Map reference and existing editorial/Campus Teal components: navy header, serif heading, teal actions, mint form surface and amber ambiguity badge are retained. This new task form deliberately has no map panel/photos/boarding inventory/reference prices or unsupported distances. Mobile stacks input/review in normal document flow; the new review does not replace the existing explorer rail/sheet. Results and actions require scrolling on narrow screens; full-page captures document them. **Human visual approval, new real screen-reader testing, non-Chromium/physical devices and real-world match calibration: NOT RUN.** Existing Phase 1 detailed AT carry-over remains DEFERRED to Phase 6, not PASS.

## Limits and remaining gates

- Browser tests use a clearly synthetic HTTP matching/authorization upstream and mocked map resources; they do not establish real PostgreSQL scoring, production identity, pending-proposal recheck, real field accuracy or live-provider coverage. Separate real API/PostGIS harness supplies the database boundary evidence.
- Distinct reasons are only validated for bounded review text in this non-submitting UI; no claim of automated private-text detection or safe future publication. Eventual submission must independently validate authorization/content/evidence and perform transactional duplicate recheck. An empty/incomplete check never clears creation. Source identity and private boarding evidence remain internal/deferred.
- Loopback simulation is not production security/rate-limit deployment approval. Production protected operations remain denied until final auth; no release/public deployment performed. No changes to persistent data, .env, lockfile, old SQL migrations, ADRs or approved references. Production browser JS sensitive-marker scan (database URL, synthetic actor, test password and private-canary markers): PASS.
- UNI-024 commit/push, exact issue CI, human fast-forward-only dev integration/push and exact dev CI remain **PENDING / NOT OBSERVED**. No new commit, run number or URL is invented. Stop before UNI-025.


## Human Git checkpoint

Current verified branch: `feat/uni-024-duplicate-warning`. Local implementation/verification complete with the recorded Turbopack limitation. Review explicit scoped paths before staging; do not commit `.env`, credentials, real data or temporary logs. PRs are optional, base `dev`.

```sh
git add -- README.md apps/api/src/app.module.ts apps/api/src/configure-app.ts \
  apps/api/src/duplicates apps/api/src/openapi apps/api/test/contracts-http.spec.ts apps/api/test/duplicate-check.spec.ts \
  apps/web/browser-tests/duplicate-warning.spec.ts apps/web/browser-tests/start-landing-server.mjs \
  apps/web/src/app/places.css apps/web/src/app/places/check-duplicates \
  apps/web/src/components/places/duplicate-review.tsx apps/web/src/components/explore/poi-results.tsx \
  apps/web/src/lib/places/duplicate-endpoint.ts apps/web/tests/duplicate-review.test.tsx \
  packages/contracts/src/index.ts packages/contracts/src/openapi-schemas.ts \
  packages/contracts/src/duplicate-check.ts packages/contracts/src/duplicate-check.test.ts \
  scripts/lib/test-poi-matching.mjs scripts/lib/test-duplicate-api.mjs \
  docs/api/duplicates.md docs/api/openapi.json docs/architecture/poi-duplicate-matching.md \
  docs/contributing/ci.md docs/progress/CURRENT_STATUS.md docs/progress/PHASE-02.md docs/ui/screen-index.md \
  docs/verification/UNI-023 docs/verification/UNI-024
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(places): add guarded duplicate warning and review choices"
git push -u origin feat/uni-024-duplicate-warning
```

Observe all three required issue jobs on the exact new commit before human `git merge --ff-only` into dev; push dev and independently observe exact-commit dev CI before creating UNI-025. No agent Git mutations or next issue implementation.


## Integration observed under replacement autonomous instructions

Human committed and pushed exact **09071b5944470db3259dda29291af4f90c73e3ce** on `feat/uni-024-duplicate-warning`. Independently observed [issue run #32](https://github.com/Dulmina03/unihood/actions/runs/43995009395) SUCCESS, all three jobs. The human then replaced the earlier supplied human-only rules with autonomous Git authorization. Agent fetched/rechecked clean synchronized dev, fast-forwarded it to that exact verified commit and pushed dev, without a merge commit/history rewrite/main change. [Dev run #33](https://github.com/Dulmina03/unihood/actions/runs/43995965834) independently observed SUCCESS, all three jobs. Public metadata: [issue](issue-run-32.json), [dev](dev-run-33.json). The earlier handoff is historical and complete; new-screen manual visual/AT approval is still NOT RUN. UNI-025 branch was created only after both CI gates completed.
