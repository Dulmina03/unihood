# UNI-006 verification

Recorded 16 November 2026 (Asia/Colombo). Branch metadata is `chore/uni-006-ci`, read from .git/HEAD without a Git command. UNI-005's commit/merge into dev is explicitly human-confirmed; no history audit/hash/date is inferred. UNI-006 is implemented and locally verified, awaiting the human Git checkpoint. Remote GitHub Actions execution is **NOT RUN/NOT OBSERVED** by the assistant.

## Actual local results

- `pnpm install --frozen-lockfile --offline`: **PASS**, locked dependencies available locally. This does not prove a fresh hosted network installation.
- `pnpm check:repo`: **PASS**, workflow policy, isolated Compose storage, issue metadata and PR template.
- `pnpm check:workflows`: **PASS**, official actionlint 1.7.12 archive checksum verified before execution. Initially failed because runner.temp was used in job-level env; corrected to step-level env and rerun successfully without disabling validation.
- `bash -n scripts/check-workflows.sh`: **PASS**. ShellCheck: **NOT RUN**, absent locally; actionlint's optional ShellCheck integration was unavailable.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS**, contracts/UI/API/web.
- `pnpm test`: **PASS**, **81 tests**: Node tooling 7 (including four new policy regressions), contracts 17, API unit/HTTP 47, web 10. Also passed with CI=true, APP_ENV=test, ENABLE_SYNTHETIC_ACTORS=false, empty SYNTHETIC_ACTOR and NEXT_TELEMETRY_DISABLED=1. A final restricted-sandbox attempt failed because spawnSync of the existing DB CLI returned EPERM; the unchanged suite passed when rerun with subprocess access. No assertion was weakened. Existing Jest experimental VM-module warning remains.
- `pnpm build`: **PASS**, production contracts/API/web.
- `docker compose --env-file .env -f infra/compose.yaml --profile test config --quiet`: **PASS**, existing local .env preserved.
- `pnpm db:test` with the same CI environment: **PASS**, all **seven isolated Docker result groups**: tmpfs/readiness; concurrent migration serialization; ordered rollback, atomic failure and checksum checks; seed safety; dependency-blocked rollback preserving data; legacy extension ownership adoption; real API outage/redacted readiness 503/liveness 200/recovery. Harness-owned temporary resources cleaned up; no development volume/data/extension ownership changed.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright UI_EVIDENCE_DIR=/tmp/unihood-006-ui-evidence pnpm test:ui` with the same CI environment: **PASS**, **eight Chromium component tests** across 390×844 and 1440×900, including intermediate-width assertions. Twelve PNGs and two axe JSON reports were written to temporary storage; dimensions and zero axe violations verified. Existing installed Playwright Chromium/system dependencies were used; the workflow's fresh `playwright install --with-deps chromium` step was **NOT RUN locally**. Existing color-environment warnings remain.
- Temporary read-only baseline/link checker, `python3 /tmp/unihood-006-review.py`: **PASS**, exactly 20 intended tooling/template/documentation files changed against 126 pre-edit inputs; no deletions. API/contracts/runtime UI, DB scripts/SQL, environment files, AGENTS/specification and checked-in UNI-003 evidence preserved. Local Markdown links/anchors, changed-file whitespace, screenshot dimensions and accessibility JSON checked. This is a content comparison, not a Git/history audit.

## Coverage and limits

[CI documentation](../../contributing/ci.md) records action revisions, tool checksum, permissions, job commands and reproducibility limits. Three required job outcomes are configured: Workspace quality, Isolated PostGIS integration and Component browser acceptance. Local commands/actionlint do not execute hosted actions or reproduce hosted runner image/cache/event behavior. No remote run URL/result, branch protection, required-check configuration, secret/token policy or manual dispatch was inspected/changed/triggered. These remain human verification after push; Phase 0 remains in progress.

Full product `pnpm test:e2e` (the explicit UNI-015 placeholder), separate legacy extension suite, cross-browser and human screen-reader checks: **NOT RUN for UNI-006**. Existing isolated coverage is retained; no full domain/authentication acceptance is claimed. No final registration, owner proof, domain workflow or application behavior was implemented. Five ADR privacy/authority boundaries remain unchanged.

## Human handoff

Review the 20 intended files and local evidence, stage/commit/push manually, observe all three remote jobs, then integrate into dev with `git merge --ff-only` following [CONTRIBUTING.md](../../../CONTRIBUTING.md). PR optional; no merge commits; main is reserved for stable releases. No Git command was performed. Stop before UNI-007 or any next issue; no next issue is started by this handoff.
