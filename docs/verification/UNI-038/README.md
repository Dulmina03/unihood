# UNI-038 — Boarding details, comparison and nearby essentials only for eligible precise public locations

18 November 2026 (Asia/Colombo).  
Branch: `feat/uni-038-details-comparison-essentials` branched from clean synchronized `dev` (`598b7c03b49de551a00cff1488d781016a74ba5c`).

## Scope & Implementation Summary

UNI-038 implements boarding detail enhancements, side-by-side comparison matrix, and nearby essentials calculations strictly limited to consented public map locations in accordance with all five privacy ADRs (0001–0005):

1. **Nearby Essentials API (`GET /api/v1/boardings/:id/nearby-essentials`)**:
   - PostGIS spherical geodesic distance computation (`ST_Distance(poi.location::geography, b.entrance_geo::geography)`) within a 2000m radius (`ST_DWithin`).
   - Strict visibility & consent gate:
     - ONLY boardings with `visibility = 'PUBLIC_MAP'` AND `public_map_consent = true` return computed essentials.
     - For `AREA_ONLY` or `HIDDEN` listings, the endpoint strictly fails closed with 404 NOT_FOUND. No distance calculation, proximity ranking, or coordinates are computed or returned (ADR-0002, ADR-0003).
   - Results are capped at 50 POIs and mapped with synthetic provenance attribution.

2. **Side-by-Side Comparison Matrix API (`GET /api/v1/boardings/compare?ids=id1,id2,...`)**:
   - Accepts 1 to 4 valid boarding IDs.
   - Aggregates official published pricing (LKR), vacancy state freshness, declared room units summary, and straight-line nearby essentials.
   - Strict ADR-0002/0003 contract validation (`BoardingComparisonItemSchema.refine()`):
     - For `PUBLIC_MAP` boardings: `hasExactEntrance = true`, `entrance` coordinates present, `nearbyEssentials` summary list present.
     - For non-`PUBLIC_MAP` boardings: `hasExactEntrance = false`, `entrance = null`, `nearbyEssentials = null`. The schema strictly rejects any payload where private listings disclose entrance geometry or nearby essentials.

3. **Web Interfaces (`apps/web`)**:
   - `/compare` (`apps/web/src/app/compare/page.tsx` & `boarding-compare.tsx`):
     - Accessible, responsive side-by-side comparison matrix for up to 4 boardings.
     - Honest distinction between public consented coordinates and private accommodations (`Not shared (location private)`).
     - Remove action, retry on failure, skip link, and keyboard navigation.
     - Full WCAG 2 AA compliance (0 axe violations) across desktop, tablet, and mobile (390px / 320px).
   - `/boardings/[id]` (`boarding-detail.tsx` & `nearby-essentials.tsx`):
     - Displays `NearbyEssentials` component. For `AREA_ONLY` / `HIDDEN` advertisements, renders privacy notice: *"Proximity is not computed for private listings. Walking distances and nearby public services are available only for owner-consented public map listings."*
     - Provides quick-action button: *"Compare this boarding"* linking to `/compare?ids=[id]`.

## Verification Results

### 1. Repository & CI Quality Gates
- `node scripts/check-repository.mjs`: **PASS**
- `bash scripts/check-workflows.sh`: **PASS** (actionlint 1.7.12 checksum verified)
- `pnpm run lint`: **PASS** (0 errors, 0 warnings across workspace)
- `pnpm run typecheck`: **PASS** (0 errors across contracts, ui, api, web)
- `pnpm run build`: **PASS** (Nest.js API and Next.js Turbopack web production builds succeed)

### 2. Unit and Integration Test Suite
Command: `pnpm test`
- Root test runner: **13/13 passed**
- Contracts (`@unihood/contracts`): **84/84 passed** (including `boarding-details.test.ts` with 9 tests)
- API (`@unihood/api`): **173/173 passed** across 19 suites (including `boarding-details.spec.ts`)
- Web component & unit tests (`@unihood/web`): **185/185 passed** across 29 suites (including `boarding-details.test.tsx`)
- **Total: 455 passed** (0 failed, 0 skipped)

### 3. Isolated Docker Database Suite
Command: `pnpm run db:test`
- Isolated PostgreSQL/PostGIS container run on tmpfs.
- All test groups **PASSED**, including real PostGIS distance calculations, nearby essentials refusal for private boardings, and comparison matrix in `scripts/lib/test-boarding-details.mjs`.

### 4. Playwright Browser Acceptance Suite
Command: `pnpm --filter @unihood/web test:ui`
- **98/98 browser tests PASSED** across mobile and desktop viewports.
- Tested `boarding-comparison.spec.ts`:
  - Comparison matrix rendering for public vs private boardings.
  - Consented entrance coordinates and nearby essentials shown only for public listings.
  - Private listings show explicit privacy notice and omit coordinates/essentials.
  - Advertisement detail privacy boundary and transition to comparison page.
  - Responsive reflow at 320px, 768px, and desktop widths.
  - Zero axe accessibility violations against WCAG 2.0/2.1/2.2 AA.
- Artifacts generated in `docs/verification/UNI-038/`:
  - `boarding-compare-desktop.png`, `boarding-compare-desktop-full.png`, `boarding-compare-desktop-axe.json` (0 violations)
  - `boarding-compare-mobile.png`, `boarding-compare-mobile-full.png`, `boarding-compare-mobile-axe.json` (0 violations)
  - `boarding-compare-tablet.png`
  - `boarding-advertisement-privacy-desktop.png`, `boarding-advertisement-privacy-desktop-full.png`, `boarding-advertisement-privacy-desktop-axe.json` (0 violations)
  - `boarding-advertisement-privacy-mobile.png`, `boarding-advertisement-privacy-mobile-full.png`, `boarding-advertisement-privacy-mobile-axe.json` (0 violations)

### 5. Remote GitHub Actions CI & Integration
- **Commit**: `cbbd0af149d0a691aa7ced76ed986768b02e8ecf`
- **Feature branch**: `feat/uni-038-details-comparison-essentials`
- **Issue CI Run**: [#63](https://github.com/Dulmina03/unihood/actions/runs/44176675246) — **SUCCESS**
  - Workspace quality in 1m11s (ID 134369762985): **PASS**
  - Isolated PostGIS integration in 1m37s (ID 134369762342): **PASS**
  - Component browser acceptance in 6m7s (ID 134369762898): **PASS**
- **Integration**: Fast-forward merged into `dev` (`git merge --ff-only feat/uni-038-details-comparison-essentials`) and pushed.
- **dev CI Run**: [#64](https://github.com/Dulmina03/unihood/actions/runs/44177859549) — **SUCCESS**
  - Workspace quality in 1m21s (ID 134373928527): **PASS**
  - Isolated PostGIS integration in 1m23s (ID 134373928585): **PASS**
  - Component browser acceptance in 6m18s (ID 134373928003): **PASS**

