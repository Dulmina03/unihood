# Phase 1 acceptance — UNI-015

This gate covers the existing guest university/campus/entrance, exploration and browser-only favourites workflow (specification §10 UNI-010–015), not later boarding/POI/registration features. [Actual UNI-015 evidence](../verification/UNI-015/README.md) separates automated passes, a partial real Orca attempt and outstanding human approvals.

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
- **Preserved regression suite:** `pnpm test:ui` retains all 42 existing component/landing/exploration/map/favourites cases with its synthetic HTTP upstream; it is not relabeled as integrated database acceptance. Both suites must pass.

The complete guest case uses keyboard Tab/Enter/native selectors from a university QR URL through preview, save, `/saved`, reload, reopen, Back/Forward and a copied share link. Named controls, focus restoration, localStorage IDs and tagged axe checks are asserted. Additional cases exercise URL name/type/sort filters, selection/marker/list agreement, phone sheet, Map/List, 320/390/768/1440px, retry/fallback, public read-only boundary and separately captured UI-01/UI-03 reference evidence. No later domain workflow is implied.

## Real screen-reader smoke — human gate

Automated keyboard and axe tests are not a screen-reader pass. Use a working desktop screen reader/browser combination (for example Orca with Firefox or Chromium); record actual versions, OS, date and speech/braille behavior. The current session's limited Orca attempt is documented as incomplete, not passed. Do not replace an existing user's screen reader, import settings over their profile or publish raw desktop debug logs. A speech-generation log alone does not establish auditory intelligibility or independent usability.

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

Agent screenshot inspection is recorded separately from **human visual approval**. Phase 1 remains **in progress** until the real screen-reader gate, separate human UI-01/UI-03 approvals, issue verification and human Git checkpoint are resolved. UNI-015 remote CI also requires new run evidence; earlier green runs do not prove this new command passed remotely. Human-only Git, optional PRs, fast-forward-only dev integration and stable-release main remain unchanged. Stop before Phase 2.
