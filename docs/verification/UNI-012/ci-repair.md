# UNI-012 CI repair — missing contracts build prerequisite

## Confirmed human integration and repaired CI

Human-confirmed update: UNI-012, including its CI repair, was committed, fast-forward merged and pushed to dev. Remote GitHub Actions **SUCCESS** on short commit **99eeef1**: **Workspace quality**, **Isolated PostGIS integration** and **Component browser acceptance** all passed. No run number, run URL or full commit SHA was supplied; none is invented. This is human-verified evidence, not a new independent remote audit. Historical failed runs #7/#8/#9 remain unchanged.

The pending-checkpoint/post-fix uncertainty below describes the original handoff and is superseded by this update. UNI-013 is separately authorized.


Recorded 16 November 2026. Verified issue branch from plain `.git/HEAD`: `feat/uni-012-urban-map-shell`. No Git commands, merge, remote rerun/dispatch or UNI-013 work performed. Repair is awaiting the human Git checkpoint and a new remote run.

## Actual remote investigation

Read-only GitHub connector calls retrieved run metadata, all three jobs per run and decoded Component browser acceptance logs. The pasted run #9 excerpt agrees with the remote log. [Sanitized evidence](ci-runs-7-9.json) records IDs, full commit SHAs, branches, conclusions and timestamped error lines.

- UNI-011 [run #7](https://github.com/Dulmina03/unihood/actions/runs/43824532632), issue branch, and [run #8](https://github.com/Dulmina03/unihood/actions/runs/43824866837), dev: commit `fa7ff9b4c7b60af7858a2844605b6a365f3209a8`. Both **FAILED** at the browser job's `pnpm --filter @unihood/web build`, with **four** unresolved `@unihood/contracts` imports. Workspace quality and Isolated PostGIS integration **passed** in both runs.
- UNI-012 [run #9](https://github.com/Dulmina03/unihood/actions/runs/43829607311), issue branch: commit `eadc988805097424e69493938f5d593aec16744c`. Same failed step and missing module, now **six** import sites. Quality and PostGIS jobs **passed**.

All three browser jobs successfully installed dependencies and Chromium, then failed building web. The actual Playwright step was **skipped**, so these logs contain no failed browser assertions. The four common import sites are the QR page, university picker, university API adapter and proxy. UNI-012 adds exploration component and query imports. This is one repeated prerequisite failure, not evidence that the new map shell or Chromium broke.

## Root cause and minimal fix

`packages/contracts/package.json` exposes `dist/index.js` and `dist/index.d.ts`. Generated `dist/` is ignored and contracts has no install-time compile hook. Installing pnpm dependencies links the workspace package but does not generate those entrypoints. The browser job built only web; each independent runner starts without the contracts output.

The passing quality job builds contracts through typecheck/test/topological workspace build; the database job explicitly builds contracts before API/web. Neither job's generated files are shared with the browser runner. Earlier local checks also built contracts first, masking the missing prerequisite.

The fix adds just one named workflow step, `pnpm --filter @unihood/contracts build`, immediately before the existing browser-job web build. A test in `scripts/check-repository.test.mjs` requires contracts → web → browser ordering. It failed with the old workflow and passes with the fix. Default Turbopack, action revisions, timeouts, token permissions, synthetic actor settings, browser checks and the complete isolated database job remain unchanged. No application/package/contract/SQL/seed/privacy code, screenshots or lockfile changed. No caching workaround or generated files are committed.

## Actual local verification

- `node --test scripts/check-repository.test.mjs`: **before fix FAIL** on the new prerequisite assertion (four existing tests passed); **after fix PASS, five tests**.
- Disposable source copy `/tmp/unihood-012-ci-clean-tcs6lkf_`: omitted `.git`, `.env`, all generated workspace `dist`, `.next` and tsbuildinfo. Fresh frozen offline install was **BLOCKED** by missing cached `@eslint/js` tarball. Existing installed locked node_modules trees were copied with relative workspace links preserved; contracts output remained absent. No fresh installation success is claimed, and the real workspace's generated output was not removed.
- In that copy, `pnpm --filter @unihood/web exec next build --webpack`: **FAIL / exit 1** before contracts compilation, including TS2307 missing `@unihood/contracts` declarations. Webpack's diagnostic phase differs from the remote Turbopack error, but the missing generated package is the same.
- Then `pnpm --filter @unihood/contracts build`: **PASS**; repeating the exact same Webpack web build: **PASS / exit 0**, all existing routes plus `/explore`, with no app-source change. Supported Webpack is used because the earlier local Turbopack worker EPERM is a separate environment limitation. Hosted Turbopack already passed in the two jobs that built contracts; the workflow keeps its default build command. No successful local Turbopack reproduction is claimed.
- Root `pnpm check:repo`, `pnpm lint`, `pnpm typecheck`: **PASS**. Cached actionlint 1.7.12 archive SHA-256 matched the existing pinned digest (`8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8`); `/tmp/unihood-012-actionlint/actionlint -color .github/workflows/ci.yml`: **PASS / exit 0**. Fresh validator download was not repeated.
- Root `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 pnpm test`: **PASS, 165 tests** — Node 8, contracts 22, API 69, web 66, including existing privacy/property/actor/OpenAPI checks.
- In the disposable copy after contracts + production web build: `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright UI_EVIDENCE_DIR=/tmp/unihood-012-ci-browser-evidence pnpm test:ui`: **PASS, all 24 Chromium tests**, 56.7 seconds. Includes existing design-system, landing/QR and complete exploration URL/history/share/retry/mobile-sheet/focus/accessibility tests, zero tagged axe violations. Existing installed browser/system dependencies were used. Temporary screenshots preserve the checked-in UNI-003/011/012 evidence.

No Docker rerun was needed for this workflow-only repair: the entire database job and all runtime/API/DB code are unchanged; its actual remote results in #7/#8/#9 are verified passing. Prior local 14-group Docker results remain historical, not new executions. Full UNI-015 E2E, fresh hosted installations, human screen-reader/cross-browser tests and a post-fix remote run are **NOT RUN**. No post-fix remote success is inferred from these local passes. The user need not supply more log lines because the remote logs were accessible.

## Human Git checkpoint

Issue: UNI-012 CI repair. Current verified branch: `feat/uni-012-urban-map-shell`. Review workflow prerequisite, its regression test and updated evidence/status records. PR optional, base dev. Human commit suggestion: `fix(ci): build contracts before browser web build`; push this issue branch, observe all three job conclusions on the new commit, and integrate with `git merge --ff-only` only after human review. No merge commits; main remains stable releases. Stop before UNI-013.
