# UNI-035 — room/bed inventory and official owner pricing

17 November 2026 (Asia/Colombo). **Implementation/local verification complete; remote CI NOT OBSERVED, not integrated.** Branch `feat/uni-035-owner-pricing` from clean synchronized dev `e0ed8f6efb7e0804c91fa64a34fe8ab147ab64bc` after independently verified UNI-034 issue #51/dev #52 success in all three jobs. The observed UNI-034 JSON records are included in this evidence follow-up; historical cancelled #49 and superseded green #50 remain recorded.

## Scope and boundaries

Exact [specification UNI-035](../../../UniHood_MASTER_PROJECT_SPECIFICATION.md#phase-3--boardings-advertisements-privacy-and-vacancy-m3m1m2), §3.5/§5.2/§7.4/§8.6, all five ADRs, especially [property authority](../../decisions/0003-property-specific-owner-authority.md). [API, local demo and migration behavior](../../api/boarding-inventory.md).

Additive paired migration 010; existing migrations 001–009 are unchanged. Existing units gain no public template automatically. Curated synthetic capacity, version-safe create/edit, exact integer LKR monthly rent and nullable deposit, explicit room/bed basis, utilities/meals disclosure, effective dates and retained append-only API fee history. History has bounded pagination beyond the initial 20 revisions. Current public price excludes future-effective revisions. Null and zero remain distinct.

Existing issued local/test property management AND official-price permission govern fee writes. No new actor grant, arbitrary identity headers or production/staging writer. Only preinstalled closed fictional property A is editable; raw unit labels never become public. HIDDEN/AREA_ONLY owners can share fees without a point or map consent. Public reads select explicit facts without private location/actor evidence. Capacity never implies vacancy: all availability remains UNKNOWN. Lost/conflicted save responses clear editing data and require reload; no successful save is inferred. No inventory/history snapshot is persisted in browser storage.

No vacancy confirmation/expiry (UNI-036), media/contact, fuller detail/comparison/nearby, final auth/proof, payment, real inventory or real ownership claim. No persistent developer database command, `.env` change, public provider test or deployment was performed during verification.

## Observed local checks

- `pnpm test` with required loopback execution permissions: 401 PASS (13 Node runner checks + 67 contracts + 150 API + 171 web). Two subsequently added web proxy checks passed with the full web suite: **173 web PASS**, yielding **403 unique passing workspace tests**. Final API rerun: all 150 PASS, including new history denial assertions.
- `pnpm typecheck`: PASS after UI/history/browser additions. `pnpm lint`: PASS. API production TypeScript build and actual OpenAPI export: PASS.
- Supported `pnpm --filter @unihood/web exec next build --webpack`: PASS. Default Turbopack historical local worker/socket limitation remains; no claim that this issue fixes or re-verifies it.
- `TEST_LANDING_WEB=1 pnpm db:test`: **35 PASS result groups**, including owned tmpfs actual owner/price-manager HTTP writes, 21 retained revisions/history pagination, exact amounts/zero/deposit, future-effective exclusion, cross-property/unit denials/FK, concurrent price conflict, injected insert/version atomic rollback, authority/archive/deployed suppression, dependency/populated rollback safeguards and real public Next adapter → Nest → PostGIS equality. All previous schema/seed/extension/privacy regressions remain. Owned temporary rows/containers only are cleaned by the harness; persistent data untouched.
- Targeted browser `playwright test boarding-inventory.spec.ts`: **4 PASS**, mobile 390×844 and desktop 1440×900. Mocked owner/public responses only; not authorization/database evidence. New pages support accessible names, focus after saves/retry, money/body contracts, strict private-payload rejection and no horizontal overflow at 320/768; six zero-violation axe reports (WCAG A/AA tags) and 13 screenshots captured.
- Preserved real `pnpm test:e2e`: **16 PASS in 1.8 minutes**, wrapper observed exit code 0/signal null and owned-service cleanup. Complete preserved browser regression: **86 PASS in 5.3 minutes**, including all 82 previous cases and four new inventory cases.
- `pnpm check:repo`: PASS. Fresh checksum-verified actionlint 1.7.12 `pnpm check:workflows`: PASS. `pnpm install --offline --frozen-lockfile`: PASS. Compose validation, script syntax, OpenAPI JSON/path/schema, new documentation links and diff whitespace checks: PASS. Final scoped staging review follows before commit.

## Attempts and limitations retained

The initial restricted `pnpm test` stopped in existing Node runner tests before workspace suites; rerun with required process/loopback execution permissions passed. The first restricted Webpack build failed parsing a TypeScript `--showConfig` subprocess; the identical supported build with execution permissions passed, with no config workaround or weakened gate. Initial database startup failed because Docker Desktop was inactive and its socket absent; starting the existing user service restored isolated tests, which passed. Restricted actionlint download failed DNS; permitted download/checksum validation passed. No application defect or data reset was inferred from those environment failures.

Earlier WIP attempts recorded in session context include an escaped CORS regex syntax correction, adding the new OpenAPI paths to the test whitelist after its first failure, and replacing unsupported Testing Library options; these were corrected before the final successful checks. Initial historic pre-resume logs are no longer present in `/tmp`; no new exact result is inferred from missing logs.

Agent screenshot inspection: desktop preserves the approved navy/teal editorial typography, bounded two-column owner controls and facts; mobile/tablet stack the controls/facts, with long forms/history requiring normal vertical scrolling. Native selects truncate long option display at narrow widths, but the selected unit's full facts/reference remain separately visible. Public fee cards contain no map or exact-location hints. These are task-specific controls, not replicas of later detail/media screens. **No human visual approval, real screen-reader or physical-device PASS is claimed for these new pages.** Existing human approval of UNI-031 layouts is scoped to those earlier layouts. Detailed Phase 1 manual AT remains explicitly deferred to Phase 6, NOT PASS.

## Remote integration

Issue exact commit, run URL, all required job results, clean fast-forward dev integration and dev exact-commit run: **NOT OBSERVED / NOT DONE**. Pending checks are not PASS. UNI-036 has not begun.
