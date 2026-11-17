# UNI-025 verification — pending POI transactions and idempotency

17 November 2026 (Asia/Colombo). Branch `feat/uni-025-transactional-poi-submission` from clean synchronized dev **09071b5944470db3259dda29291af4f90c73e3ce**, created only after independently verified UNI-024 issue #32/dev #33 SUCCESS, all three jobs each. Current replacement AGENTS authorizes agent Git and sequential continuation; older human-only handoffs are historical. [Architecture, privacy, operations and explicit limits](../../architecture/poi-submission-transactions.md).

## Scope

- Strict internal synthetic intent/result contracts; issued actor/immutable namespace checks; same-client READ COMMITTED transaction; actor-scoped idempotency and payload conflict; permission-before-replay and public-visibility revalidation.
- Pending and canonical duplicate recheck under transaction-level advisory lock; private pending/source evidence excluded from public results. Distinct explanations remain held, never automatic canonical insertion/merge/ownership authority.
- Additive paired migration 005: pending intents, exact pending source references, minimal idempotency results, geometry/text indexes and bidirectional canonical/pending source collision triggers. Existing source rows, previous SQL, extension ownership and persistent data untouched.
- Real pooled/concurrent PostgreSQL tests, injected mid-transaction rollback/retry, canonical/private/pending source drift, same point/different businesses, privacy-redacted replay and safe migration tests. No new REST/UI/production write, registration or UNI-026 workflow.

## Actual local verification

Environment **Node 22.23.5**, **pnpm 10.34.9**. Prior UNI-024 Node 22.23.4 evidence remains historical, not rewritten. Runtime gates set `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false`; production/browser checks disable Next telemetry. Owned permission fixtures explicitly issue synthetic actors; the real integration harness temporarily constructs repositories against its proven unique loopback tmpfs database only. Browser cache restored with the pinned Playwright install under `/tmp/unihood-playwright`.

- Frozen offline install, repository checks and fresh checksum-verified actionlint 1.7.12: PASS. New script syntax/diff checks PASS. Final documentation/file-link review (118 links), Compose configuration and production browser sensitive-marker scan PASS.
- Final `pnpm test`: PASS **307 tests**: 13 Node, 49 contracts, 100 API, 145 web. Final typecheck/API build PASS after correcting union narrowing and a widened redacted-result literal. Final lint PASS after the harness additions.
- Default `pnpm build`: attempted, locally BLOCKED/exit 1 by the historical Turbopack worker process/port EPERM. Supported `pnpm --filter @unihood/web exec next build --webpack`: PASS. No default local success inferred from prior remote CI.
- Final real `TEST_LANDING_WEB=1 pnpm db:test`: PASS **21 groups**, exit 0, including all final HTTP/migration-race/object-collision assertions. Covers actual pooled idempotency, actor isolation, forced lock wait, same/different keys, category/same-category distinct businesses, source geometry drift and opaque identity, hidden boarding-source exclusion, public-visibility replay revocation, injected rollback/retry, source races both orders, repeatable-read refusal, populated down refusal, RESTRICT dependency atomicity, concurrent rollback writer retention, conflicting pre-existing object preservation, pending public 404/list exclusion and empty down/up/repeat with extensions/canonical data intact. Prior UNI-020–024 regressions remain enabled.
- `pnpm test:ui`: PASS **56 cases**, exit 0, 3.4 minutes; unchanged mobile/desktop regressions, screenshots redirected to temporary evidence. No new UI screenshot/human visual approval required or claimed by this internal backend issue.
- `pnpm test:e2e`: PASS **ten cases**, exit 0, 1.3 minutes; real Next/Nest/migrated and seeded tmpfs PostGIS, existing guest harness actor-disabled. Map resources alone are mocked. Harness cleanup confirmed only owned temporary services were stopped.

## Attempts and limits

Initial Docker invocation failed before DB assertions because both selected Docker Desktop and default daemon sockets were absent. Read-only diagnosis found an installed inactive user service; started `docker-desktop` with systemctl, confirmed daemon 29.7.2, and then ran only owned disposable tests. No daemon/context replacement, application persistent DB command, volume deletion or extension change was used. Docker service startup is recorded separately from test results.

Initial combined tests had one failure in the unchanged web result-loading await (`Synthetic Pharmacy` heading); the unchanged standalone web suite passed all 145, and subsequent complete suites passed without assertion/timeout/worker changes. The exact initial cause is not claimed diagnosed. New TypeScript narrowing/result-literal errors were fixed before final builds. Failed attempts are not reported as passing gates.

The pending similarity policy is illustrative; private boarding matching, identity/owner verification, media/contact evidence, source promotion, risk transitions, public contribution/submission flows and complete eventual §6.3 coverage are not implemented here. Direct administrator SQL outside the protocol is not semantically deduplicated; cross-table source collisions are database-enforced. All new records are held synthetic intents, never live public inventory. New production writes remain denied. Real field data/calibration, human AT/physical devices and deployment performance are NOT RUN. Phase 1 detailed manual AT remains DEFERRED to Phase 6, not PASS. Existing historical CI failures/local Turbopack limitation remain.

## Git and CI

UNI-025 commit/push/issue CI/dev integration/dev CI are PENDING / NOT OBSERVED. No new SHA, run number, URL or result is invented. Stage only reviewed issue files; exclude local `.env`, credentials, real private data and temporary output. Conventional commit and exact-commit issue checks must succeed before fast-forward-only dev integration/push; exact dev checks must succeed before UNI-026. Remote evidence will be recorded after it is observed.
