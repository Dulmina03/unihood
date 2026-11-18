# UNI-044 verification — confidential reports, takedown and appeals

Date: 18 November 2026 (Asia/Colombo). Branch: `feat/uni-044-privacy-reporting`, based on verified `dev` `7694ee68cdbc20b8342533644fded397d11d4d29`.

## Scope verified

Protected structured reports against current synthetic public boardings, POIs, quarantined owner media and eligible route segments. Confidential evidence is AES-256-GCM encrypted at rest in `unihood_private.report_cases`; reporter identity and evidence are absent from every API DTO, history item, error and document baseline. Canonical P0/P1/P2 severity is server-assigned and distinct from `SubmissionRisk`. Ordinary wrong-fee, wrong-vacancy, stale, duplicate, fake-ownership, harassment and negative-review reports remain held and never edit official prices/vacancies/ownership or delete legitimate reviews.

Only obvious `PRIVATE_DATA_EXPOSED` on a public boarding/media target and `INAPPROPRIATE_MEDIA` on media auto-suppress. Suppression is reversible, audited, hides the affected public listing/private owner media and bumps the monotonic `unihood_private.public_projection_revisions` invalidation signal. No public cache or derivative store exists in this repository; the revision row is the invalidation contract consumed by the public read path.

Appeals are available to the reporter or affected property manager without revealing reporter identity. Decisions remain restricted to the explicit `synthetic:operator` local/test fixture; production/staging and anonymous/unknown actors fail closed. Route reports require an existing `public.route_segments` row with `data_kind='SYNTHETIC'` and `public_status='ELIGIBLE'`; with no eligible segment the request returns unavailable.

## Local results (actual)

- `pnpm lint`: PASS (`eslint . --max-warnings=0`).
- `pnpm typecheck`: PASS (contracts build then all workspace typechecks).
- `pnpm check:repo` and `pnpm check:workflows`: PASS.
- `pnpm test`: PASS — contracts 120, API 235, web 216 (571 workspace) plus 13 root runner tests.
- `pnpm build`: PASS (API/contracts/web; `/report` is a dynamic route).
- `pnpm test:ui`: PASS — 124/124 Playwright cases across mobile and desktop, including 4 new UNI-044 cases. Six new screenshots and six zero-violation axe reports are in this directory.
- New coverage: report/appeal/operator contracts; service authorization, idempotency and suppression effect matrix; HTTP deployment fail-closed, spoofed-header, validation and operator separation; component form, retry, receipt, status, appeal and endpoint exposure; real API database group `scripts/lib/test-privacy-reports.mjs` covering E2E-11 (fee unchanged), E2E-15 (negative review intact), E2E-16 (encrypted private evidence, media takedown/restoration, revision bump), reporter/evidence non-leak, unrelated-actor denial, route availability, redacted audit and populated-rollback refusal.

## Remote CI (actual)

Commit `0b3f684be4ac5f0011e5c8218d1f5cb9f4206291` on `feat/uni-044-privacy-reporting`, workflow run [44380335839](https://github.com/Dulmina03/unihood/actions/runs/44380335839), all required jobs SUCCESS:

- Workspace quality — https://github.com/Dulmina03/unihood/actions/runs/44380335839/job/135070498888
- Isolated PostGIS integration — https://github.com/Dulmina03/unihood/actions/runs/44380335839/job/135070499503 (includes `PASS: UNI-044 held wrong-fee/negative-review reports ...` and `PASS: UNI-044 populated rollback refusal, empty rollback and idempotent re-migration`)
- Component browser acceptance — https://github.com/Dulmina03/unihood/actions/runs/44380335839/job/135070499664

Earlier failure iterations on this branch (`a1c5165`, `585e514`, `8bd0f3a`, `1495268`, `66fe47c`, `1b18e63`) are retained in history as failed database runs; the final design adds no public listing column and rolls the migration back without breaking running public queries. A transient UUID-containment flake in `test-boarding-privacy` was rerun, not suppressed.

## Integration (actual)

Fast-forward merged into `dev` and pushed as `c4edef588b431a6e44d626928e1a061504a8b28b`; [dev run 44385793415](https://github.com/Dulmina03/unihood/actions/runs/44385793415) independently passed all three required jobs for the same SHA: Workspace quality (job 135089877403), Component browser acceptance (job 135089877857), Isolated PostGIS integration (job 135089877909). No merge commit was created.

## Not run locally

- **Isolated Docker/PostGIS `pnpm db:test` and real browser E2E database coverage: NOT RUN.** This machine has no Docker daemon and no `.env` credentials. The database assertions above were written and included in the repository gate but are unverified locally; remote CI is required before integration. No local database PASS is claimed.
- Human visual/accessibility review, assistive-technology checks and real-device tests: NOT PERFORMED. Screenshots and automated axe results do not imply human approval. Detailed Phase 1 manual accessibility checks remain DEFERRED to Phase 6.
- Final operator contact/staffing, retention periods, notification mechanics and M5 operator access: deliberately deferred; `privacy-support@unihood.example` is a reserved documentation relay, not a real service.

## Evidence

- `privacy-report-review-{mobile,desktop}.png` and axe JSON: form/privacy guidance preview.
- `privacy-report-receipt-{mobile,desktop}.png` and axe JSON: protected receipt, status, appeal.
- `privacy-report-history-{mobile,desktop}.png` and axe JSON: actor-scoped REPORT history without evidence or reporter identity.
