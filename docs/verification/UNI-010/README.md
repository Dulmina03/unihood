# UNI-010 verification

Recorded 16 November 2026 (Asia/Colombo), Node 22.23.4 / pnpm 10.34.9. Prepared branch confirmed from plain .git/HEAD: `feat/uni-010-university-campus-entrances`. No Git command/history audit performed. Implementation and local acceptance complete; human Git checkpoint pending. No next issue started.

## Integration and remote evidence

**UNI-006 merged into dev and successful remote CI verification are explicitly human-confirmed.** No run URL or commit SHA was supplied; both remain **unverified**, with no independent remote observation or invented identifier. Historical UNI-006 evidence is annotated accordingly. Remote UNI-010 Actions results: **NOT RUN/NOT OBSERVED** by the assistant; no dispatch, repository setting, required-check rule or deployment changed. Human review of the newest pushed issue/dev runs remains required.

## Actual local quality gates

- `pnpm install --frozen-lockfile --offline`: **PASS**. No dependencies/package manifest/lockfile changed; this does not prove hosted network installation.
- `pnpm check:repo`: **PASS**, workflow/template policy and isolated Compose storage.
- `pnpm check:workflows`: **PASS**, official actionlint 1.7.12 archive checksum verified. `bash -n scripts/check-workflows.sh`: **PASS**. ShellCheck: **NOT RUN**, unavailable locally.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS**, contracts/UI/API/web.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 pnpm test`: **PASS, 108 tests**, Node tooling 7, contracts 22, API unit/HTTP 69, web 10. Existing Jest experimental VM-module warning retained. The suites ran with subprocess/local socket access.
- `pnpm build`: **PASS**, final production contracts/API/web build. The initial restricted-sandbox attempt exited 1 during Next build; the worker-enabled rerun and final build passed. No build rule was disabled. Existing frontend routes remain unchanged.
- `node apps/api/dist/export-openapi.js > /tmp/unihood-010-openapi.json`: **PASS**, exact JSON parity with regenerated docs/api/openapi.json; **eight live GET paths, 28 components**. HTTP tests also check exact live/saved parity, OpenAPI 3.1, all JSON Pointer refs and entrance path/query parameter metadata. No fake authentication or domain operation is advertised.
- `docker compose --env-file .env -f infra/compose.yaml --profile test config --quiet`: **PASS**, original local .env preserved.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 pnpm db:test`: **PASS, 12 result groups** against a unique loopback Docker tmpfs DB and built real API; details below. Test-owned API/container cleaned up. No persistent development database was used.
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright UI_EVIDENCE_DIR=/tmp/unihood-010-ui-evidence pnpm test:ui`: **PASS, eight Chromium tests** at 390×844/1440×900 with intermediate-width checks. Existing installed Chromium/system dependencies used; fresh hosted `playwright install --with-deps chromium`: **NOT RUN locally**. Twelve temporary screenshots include two full-page captures; viewport sizes/full-page widths and two axe reports with zero violations checked. Existing color-environment warnings retained. Checked-in UNI-003 evidence untouched; no new university UI is claimed.

## Real database and CLI acceptance

The original seven result groups remain: tmpfs/mount/isolation/readiness checks; concurrent migrations; ordered/atomic migration and checksum failure; guarded repeatable seeds; dependency-blocked extension rollback/data preservation/re-migration; legacy/pre-existing extension ownership; bounded real outage/redacted readiness and recovery. Readiness now also requires migration 002 and its tables. The outage regression additionally checks redacted 503 on the university API while liveness stays 200.

Five added groups establish:

1. University graph seeds serialize concurrently and repeat deterministically. A modified row is preserved on conflict; a late conflict rolls back an earlier inserted gate. There is no update/delete/reset seed mode.
2. Actual SQL rejects duplicate/invalid slugs, orphaned parent FKs, parent deletion, null/out-of-range/nonfinite/empty/wrong-SRID/nonpoint coordinates, duplicate active primary gates and missing verified-source timestamp. Geometry is validated without geography normalization.
3. Actual HTTP university/campus/gate pages validate against strict shared Zod schemas, stable pagination and slug filtering work, university/campus boundaries are respected, archived parents hide children, malformed/repeated/unknown inputs are redacted, and forged headers do not create mutation routes.
4. Actual deployed-policy reads exclude synthetic rows and ineligible ancestors; the verified-only projection/UTC timestamp branch is tested using explicitly synthetic test-only source assertions, then reverted. No real campus/source verification is claimed. Unit tests additionally fail closed for incompatible APP_ENV/NODE_ENV combinations.
5. Populated rollback preserves rows/ledger. Exclusive table locking waits for a concurrent writer, then refuses removal and preserves the committed row. An external dependency aborts empty-table rollback atomically. A pre-existing unrelated table blocks migration without overwrite/partial DDL/history. Empty rollback/re-migration/re-seeding are repeatable.

The last group invokes the **actual** `pnpm db:rollback --test`, `pnpm db:migrate --test` (twice), and `pnpm db:seed --test` (twice) against only that isolated URL, with a distinct dummy development URL. Empty rollback/migrate/seed commands exit 0; populated `db:rollback --test` intentionally exits 1 and reports redacted P0001. The first CLI assertion incorrectly expected internal SQL text and failed; it was corrected to assert the existing redacted error contract, and the complete suite passed. Neither the guard nor redaction was weakened. Only the proven disposable DB prepares/deletes its own rows to exercise empty rollback; no persistent data deletion was performed.

## Final review and limits

`python3 /tmp/unihood-010-review.py`: **PASS**, 31 intended files compared against 138 pre-edit input hashes, no deletions, local Markdown links/anchors and changed-file whitespace valid. Environment files, manifest/lockfile, immutable 001 migration pair, Compose image/storage settings, identity guards, UI source/evidence, CI workflows, AGENTS/specification and five ADR contents are unchanged. The temporary checker accounts for full-page screenshot height; it is a session review helper, not a new project dependency or Git diff/history audit.

No real pilot field verification, external map/provider, authentication/registration, boarding/discovery feature, cross-browser/human screen-reader or full-product E2E acceptance is claimed. `pnpm test:e2e` remains UNI-015's explicit placeholder and was **NOT RUN**. The separate legacy extension script was **NOT RUN**; its ownership/dependency cases are covered in the preserved isolated suite. [University API/operation documentation](../../api/universities.md) explains data provenance, bounded contracts, config, rollback refusal and safe forward recovery. [Phase 1](../../progress/PHASE-01.md) remains in progress; no phase-wide browser workflow completion is claimed.

Human-only review/stage/commit/push; optional PR into dev, observe newest remote checks, integrate via git merge --ff-only with no merge commit; main stable releases only. Stop before UNI-011 or any next issue.
