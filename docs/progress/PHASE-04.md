# Phase 4 — community recommendations, reviews and corrections

Status: UNI-040 in progress on `feat/uni-040-community-boarding-ads`, based on verified `466d4e0fc893ea3070145802fd7e2acb515a5adb` dev after UNI-039 issue #69/dev #70 all-job SUCCESS. Worktree: `/tmp/unihood-dev-integration`; original project working tree remains on UNI-039 with historical regenerated artifacts preserved.

Exact roadmap: UNI-040 contribution hub and boarding recommendation → UNI-041 privacy-safe advertisement duplicates/canonical attachment → UNI-042 POI corrections/status → UNI-043 structured reviews → UNI-044 confidential reports/takedown/appeals → UNI-045 risk rules → UNI-046 mock contact/location request → UNI-047 multi-actor regressions. No later workflow is implemented by UNI-040.

## UNI-040 — contribution hub and Recommend Boarding

Implementation in progress: UI-15 `/contribute`, UI-16 `/contribute/boarding`, shared strict synthetic-only contracts and the specified protected `POST /api/v1/contributions/boarding`. Intake remains private and held, never canonical creation, public advertisement publication, ownership, map pins, official fees/vacancies or verified contact. Existing public title search is a browsing aid, not the UNI-041 duplicate engine or a publication clearance. No media upload is added; separate photo/EXIF guidance is acknowledged without granting access to owner private media.

Additive paired migration 013 preserves existing data and extension ownership and refuses populated rollback. Property authority and guarded local/test actor interfaces remain unchanged; staging/production writes deny before private access. Local lint/typecheck, 501 workspace tests, production API/supported Webpack builds, full browser106 plus scoped6 (two new long-name cases), real E2E18 and isolated Docker46 groups PASS. Sixteen screenshots/eight zero-violation axe reports reviewed; no human approval implied. Exact-commit issue/dev CI and integration remain pending. [Actual results and attempts](../verification/UNI-040/README.md). Detailed Phase 1 manual accessibility remains DEFERRED to Phase 6, not PASS.
