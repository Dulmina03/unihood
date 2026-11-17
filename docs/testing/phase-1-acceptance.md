# Phase 1 acceptance — UNI-015

This gate covers the existing guest university/campus/entrance, exploration and browser-only favourites workflow (specification §10 UNI-010–015), not later boarding/POI/registration features. [Actual UNI-015 evidence](../verification/UNI-015/README.md) separates historical automated passes, the partial agent Orca attempt and later human-confirmed integration/CI/visual/core Orca results. [Closure review](../verification/UNI-015/human-acceptance.md) records the exact remaining manual checklist evidence; Phase 1 closure is still pending those confirmations.

## Commands and prerequisites

Use the pinned Node/pnpm versions from the root manifest. Install locked dependencies and Playwright Chromium/system libraries. Docker must be available; `.env` must exist for the existing Compose configuration. Never substitute a development or hosted database for this gate.

```bash
pnpm install --frozen-lockfile
pnpm --filter @unihood/web exec playwright install --with-deps chromium
pnpm --filter @unihood/contracts build
pnpm --filter @unihood/api build
pnpm --filter @unihood/web build
pnpm test:e2e
```

If the local default Turbopack build is blocked by the documented environment EPERM, the separately reported supported build is `pnpm --filter @unihood/web exec next build --webpack`. It must not be represented as a successful default build or silently replace the hosted default script. `pnpm test:e2e` requires production output, as does `pnpm test:ui`; it does not build/install dependencies or contact production for you. Missing prerequisites fail the command. Set `PLAYWRIGHT_BROWSERS_PATH` consistently for install and execution, and `UI_EVIDENCE_DIR` to an owned temporary output directory (default `/tmp/unihood-phase1-evidence`).

`pnpm test:e2e` runs `scripts/test-phase-one.mjs`. It creates a uniquely named Compose `db-test` container with an ephemeral loopback port, verifies actual tmpfs and no volume/bind mounts, migrates/seeds only that database, then starts Nest with synthetic actors disabled and two owned production Next processes. Configured-map and disabled-map origins use allocated loopback ports. It ignores any supplied DATABASE_URL as a target and strips it from the browser runner environment. The Playwright configuration refuses missing/non-loopback origins and expects this owning runner. No existing server is reused.

The existing `startLandingIntegration` public-read/SSR checks also run against these services. Nest readiness is bounded; server/browser timeouts fail rather than pass silently. The runner stops owned services/container on success/failure/interruption; cleanup never removes development volumes or changes extension ownership in persistent databases. It creates no new schema migration or seed dataset. A concurrent socket-bind race fails visibly rather than attaching to an existing process.

## Test boundaries

- **Integrated acceptance:** `pnpm test:e2e` runs production Next → existing read-only adapters → real Nest → migrated/seeded disposable PostGIS. Happy-path directory responses are not intercepted. IDs and names remain existing synthetic UNI-010 fixtures, not real campus locations.
- **Map boundary:** actual MapLibre, worker and software WebGL run with the existing explicitly labeled synthetic style resource intercepted in the browser. No public tile quota, key or live-provider uptime is required. The unavailable-state case deliberately aborts map resources; the disabled-provider server remains usable through its list. UNI-013's historical live-provider smoke is separate and not revalidated by this gate.
- **Fault injection:** browser response delay/503 and a name-filter empty result exercise loading, redaction, retry and empty behavior. Recovery returns to real Nest/PostGIS. Real database outage/readiness/privacy/migration/rollback protections remain separately exercised by `TEST_LANDING_WEB=1 pnpm db:test`.
- **Preserved regression suite:** `pnpm test:ui` retains all 42 existing component/landing/exploration/map/favourites cases plus four UNI-021 public-layer cases with its synthetic HTTP upstream; it is not relabeled as integrated database acceptance. Both suites must pass.

The complete guest case uses keyboard Tab/Enter/native selectors from a university QR URL through preview, save, `/saved`, reload, reopen, Back/Forward and a copied share link. Named controls, focus restoration, localStorage IDs and tagged axe checks are asserted. Additional cases exercise URL name/type/sort filters, selection/marker/list agreement, phone sheet, Map/List, 320/390/768/1440px, retry/fallback, public read-only boundary and separately captured UI-01/UI-03 reference evidence. No later domain workflow is implied.

## Real screen-reader smoke — human gate

Automated keyboard and axe tests are not a screen-reader pass. Use a working desktop screen reader/browser combination (for example Orca with Firefox or Chromium); record actual versions, OS, date and speech/braille behavior. The original agent Orca attempt remains incomplete. A later human Orca/Chrome/Ubuntu core smoke is reported successful for the listed controls/navigation; that does not retroactively pass the agent attempt. [Human observations and unconfirmed checklist items](../verification/UNI-015/human-acceptance.md) distinguish both sources. Actual human test date/versions were not supplied. Do not replace an existing user's screen reader, import settings over their profile or publish raw desktop debug logs. A speech-generation log alone does not establish auditory intelligibility or independent usability.

Perform and record each step as PASS / FAIL / NOT RUN:

1. Open `/u/<valid university slug>` without signing in. Hear the page title; navigate landmarks/headings. Tab to Skip to content and activate it; verify main focus and sensible reading order.
2. Reach the labeled university/campus/public-entrance selectors. Change campus and entrance using the assistive technology's supported focus/browse mode. Verify available values, dependent reset and selection-status announcements.
3. Activate Explore selected campus. Read the public entrance preview and provenance. Navigate filters, category and Map/List; verify no focus trap, no partly covered marker in the tab order, and equivalent usable list selection.
4. At phone widths, verify expandable/collapsible results, focus visibility and unobscured controls. Record whether this is desktop responsive emulation or real mobile assistive technology; do not conflate them.
5. Save and unsave a gate. Hear the stable name and pressed state; open Saved, reload, reopen the gate and check browser-only persistence. Remove a favourite and verify focus returns to Saved places.
6. Open Share. Hear its dialog title; traverse Close, link field and Copy; verify focus stays inside, Escape closes and returns to Share. Check manual copying when clipboard access is unavailable.
7. Exercise a directory/map error and retry/list fallback using only synthetic test data. Check distinct loading/empty/error messages, recovery announcements and useful focus after actions.
8. Record defects, actual spoken output and limitations. Do not certify translated content, all browsers, mobile screen readers or all WCAG criteria from this smoke.

## Visual review and completion

Review UI-01 and UI-03 independently at 390×844 and 1440×900 against [Editorial Explorer](../design/references/01_landing_editorial.png) and [Urban Map](../design/references/02_explore_urban_map.png). Check tablet 768px and no overflow at 320px. Retain existing Campus Teal, photo provenance, public-only labels, rail/sheet and usable map-failure alternative. Record intentional differences: synthetic public gates rather than fictional boardings, mocked basemap resources and no unsupported routes/distances/owner claims.

Agent screenshot inspection is recorded separately from **human visual approval**. Human approval of UI-01/UI-03 desktop/mobile and live OpenFreeMap with synthetic fixtures is now confirmed. UNI-015 commit/merge into dev and run #16 SUCCESS on short commit 432e83c (all three jobs PASS) are human-confirmed; no run URL/full SHA or per-command logs supplied. The core human Orca smoke is confirmed, while the remaining checklist evidence in the closure review keeps Phase 1 **in progress**. These are remaining manual confirmations, not an assertion of a new application failure. The documentation update has its own human Git checkpoint. Human-only Git, optional PRs, fast-forward-only dev integration and stable-release main remain unchanged. Stop before Phase 2.


## Authorized deferral to Phase 6

The human explicitly permits remaining manual accessibility confirmations to carry into [Phase 6](../progress/PHASE-06.md) while Phase 2 proceeds from UNI-020. The checklist remains required and unconfirmed items remain DEFERRED, not PASS. Earlier stop-before-Phase-2 and routine human-only Git language is historical; current AGENTS.md governs authorized agent Git/exact-commit CI/fast-forward integration. No new manual or automated result is claimed by this scheduling update.


## UNI-021 extension of the owned acceptance gate

The runner now also discovers `public-pois.spec.ts`: one mobile/desktop public Essentials journey against the same real owned Next/Nest/tmpfs PostGIS, increasing six original Phase 1 cases to eight. It checks required bounded query/category/marker/list/URL reload and provider-disabled list use; map style resources alone are intercepted. Existing six guest cases and all 42 browser regressions remain intact; the separate component suite adds four POI cases. Counts are expected coverage until the issue's actual verification record confirms execution. New guarded synthetic POI seeds run only in the already verified disposable database during acceptance. [UNI-021 results](../verification/UNI-021/README.md).


## UNI-022 detail extension

The same `pnpm test:e2e` runner includes a second mobile/desktop public POI journey: real Next/Nest/PostGIS detail read → canonical page → reload/share → preserved filtered exploration/selection → map. No directory/POI/detail API is intercepted; only synthetic map resources are mocked. This increases eight integrated cases to ten while preserving the original six Phase 1 cases. Separate `pnpm test:ui` coverage adds four detail/failure/keyboard/axe cases to the prior 46. Counts describe configured scope; [UNI-022 verification](../verification/UNI-022/README.md) records executed results and exclusions. Real AT, field data and live-provider certification remain separate.

## UNI-026 additional isolated contributor acceptance

`pnpm test:e2e` preserves the ten existing guest cases with actors disabled on their API and two guest Next servers. It additionally owns a separate loopback API explicitly configured with the test-only synthetic contributor and a third production Next instance against the same proven unique tmpfs database. Two new mobile/desktop cases exercise the actual draft → preflight → held receipt and public-detail exclusion; no proposal response/database is mocked. Only that contributor API enables its synthetic adapter. The browser process does not receive DATABASE_URL. Third-server origins are validated and all services are cleaned up by the owning harness. None of this proves production authentication or real-world publication.

Component browser tests use separate bounded synthetic upstream proposal receipts for UI/error/retry/accessibility checks and repository-authored map resources for optional draft-map lifecycle checks. They do not prove real provider availability or PostgreSQL persistence. Read [proposal verification](../verification/UNI-026/README.md) for exact results and limitations. Do not point either harness at developer/staging/production databases.

## UNI-031 boarding read regression extension

The owning runner explicitly seeds four curated synthetic boarding previews after the normal fixtures in its proven unique tmpfs database. Two new mobile/desktop cases exercise the real Next/Nest/PostGIS feed → source/privacy filters → canonical hidden detail → share/focus flow with no advertisement API interception. The ten previous guest cases and two separate contributor cases remain enabled (14 configured journeys). Existing map resource mocks and all data/provider/manual limitations remain unchanged. Real-data publication, owner writes, private pins, contacts and final auth are not simulated as approved production features. See [actual UNI-031 results](../verification/UNI-031/README.md).

## UNI-032 owner-draft boundary regression

The same `pnpm test:e2e` owned runner preserves the existing 14 journeys and adds two mobile/desktop checks through the already separate contributor web/API service: public-ad search → fictional owner wizard → denied session save. No guest/contributor service is granted owner privileges. No owner-check response is intercepted in these two cases. Positive synthetic owner-A draft checks and B/capability/environment/CORS denials are exercised through real Nest HTTP tests; component browser positive receipts are explicitly mocked. This distinction is not production authentication or owner-proof acceptance. The wizard never writes a canonical property, publication, price, vacancy, coordinate, contact or media asset. Actual results remain in [UNI-032 verification](../verification/UNI-032/README.md), not inferred from configured test counts.
