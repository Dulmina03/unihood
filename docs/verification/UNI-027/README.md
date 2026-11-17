# UNI-027 — provider/license documentation and import strategy

17 November 2026, Asia/Colombo. `docs/uni-027-provider-import-strategy`, based on clean synchronized dev `acb98a5514083994d607a033791e79cffd5e98af` after independently observed UNI-026 issue #36/dev #37 success. Node 22.23.5, pnpm 10.34.9. Exact specification §10 UNI-027, §7.6 and §8.5; all five ADRs preserved.

## Scope and evidence

[Strategy/provider register](../../architecture/poi-provider-import-strategy.md) distinguishes existing optional OpenFreeMap display, proposed licensed Geofabrik/OSM extracts and prohibited public Nominatim harvesting/Google scraping. It documents rights/attribution/quotas/caching/token/privacy boundaries, controlled acquisition/quarantine/identity/entrance/transaction/review/refresh/compensation design, a [non-executable incomplete manifest](../../data/poi-import-manifest.example.json) and future importer acceptance/manual release gates.

[Primary-source review](provider-review.json) lists the actual pages read and one Liberty HEAD observation: HTTP 200, public max-age=86400, CORS `*`. No real extract, checksum, coordinate, import, account/provider activation, SLA or consent is invented. Source pages are live references, not immutable legal evidence; recheck before activation/public reuse. OpenFreeMap terms/embedded-viewer eligibility and privacy Site/minors wording require later review rather than a silently selected student registration rule.

No runtime code, applied migration, schema, credentials, real data, protected-write behavior, media or provider adapter changed. Current synthetic-only proposals cannot ingest real source names or upgrade rows to VERIFIED. ODbL and source origin do not establish owner/map consent. Broader private-boarding/media/production-import fixtures are design obligations, not executed tests.

UNI-026's exact [issue #36](https://github.com/Dulmina03/unihood/actions/runs/44008792025)/[dev #37](https://github.com/Dulmina03/unihood/actions/runs/44009478550) and fast-forward integration are recorded in its [verification follow-up](../UNI-026/README.md). Older failures, local Turbopack EPERM and detailed manual Phase 1 AT deferred to Phase 6 remain recorded. New proposal human visual/AT/live-provider certification remains NOT RUN; no approval inferred.

## Validation

Local repository/checksum-verified actionlint 1.7.12, diff, JSON/manifest and documentation-link/consistency checks PASS (132 local links in the first review). Existing `pnpm lint`, `pnpm typecheck` and `pnpm test` PASS: **320 tests** (13 Node, 51 contracts, 107 API, 149 web). No runtime or test assertions changed. No new tests mirror this reversible documentation change. Local production/browser/Docker suites are not rerun for this documentation-only diff; the identical runtime passed UNI-026 locally (320 tests, 64 component browser, 12 actual integrated E2E, 23 isolated DB groups, API/supported Webpack build). These are predecessor results, not new UNI-027 runs. The unchanged default local Turbopack restriction is not reported as a new pass/failure.

All three exact-commit remote jobs remain required, with no path exemption. UNI-027 commit/push/issue CI/dev integration/dev CI are PENDING / NOT OBSERVED; no future run or SHA is invented. Phase 3 has not started.

## Outstanding work

Human pilot/rights/field/retention/provider-age/privacy review, real-data importer contracts/storage/authorization/attribution, actual importer/restore tests and later production deployment are not satisfied by a written strategy. They remain explicit future gates, not blockers to completing this documentation issue. No final registration/provider identity decision, real POI/boarding import or deployment is implemented here.


### Observed Git/CI integration follow-up

Exact commit `3fa3d0cb4bb88aa4c0b9c09f8a13e44c42e95830`, branch `docs/uni-027-provider-import-strategy`: independently observed [issue #38](https://github.com/Dulmina03/unihood/actions/runs/44011061756) SUCCESS, then clean synchronized dev fast-forward integration/push and [dev #39](https://github.com/Dulmina03/unihood/actions/runs/44011833954) SUCCESS. Workspace quality, Isolated PostGIS integration and Component browser acceptance completed successfully for that exact full commit in both runs. [Issue JSON](issue-run-38.json), [dev JSON](dev-run-39.json). Earlier pending statements are historical and resolved; future importer/legal/manual limits remain. No main/history rewrite or deployment.
