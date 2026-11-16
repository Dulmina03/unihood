# CI quality gates — UNI-006

The [workflow](../../.github/workflows/ci.yml) extends the existing workspace and isolated database jobs with a component-browser job. It checks issue-branch pushes (feat/fix/chore/test/docs `uni-*`), dev/main pushes, optional PRs into dev/main, and human manual dispatch. No path filters bypass documentation-only changes. Three independent jobs must succeed: Workspace quality, Isolated PostGIS integration and Component browser acceptance. There is no always-green summary job or continue-on-error. A human must review any existing required-check settings that refer to old names after observing remote runs; no repository setting is changed here. New pushes cancel superseded runs for the same workflow/ref; wait for the newest result.

## Toolchain and validation

Jobs use ubuntu-24.04, Node 22.23.4 (the locally tested application runtime), and pnpm 10.34.9 from packageManager with frozen lockfile installation. pnpm's store cache is keyed by pnpm-lock.yaml through setup-node. Node modules, .env, database files and private evidence are not cached. Action runtimes use Node 24 internally, separately from the application Node version. Hosted-runner action execution is not reproduced by a local Node test.

Third-party actions are pinned to immutable revisions verified from their official release metadata on 16 November 2026:

- actions/checkout v7.0.1: `3d3c42e5aac5ba805825da76410c181273ba90b1`
- actions/setup-node v7.1.0: `949feb2413d6458794dcd2491c4babbbce0c15c1`
- pnpm/action-setup v6.1.1: `73e46992e05b19abd31f2f3c20e0e7370d762115`

`pnpm check:repo` uses locked YAML 2.9.1 to validate workflow policy, issue frontmatter and PR content, default actor isolation and Compose test storage. It checks read-only permissions, pinned action refs, no persisted checkout credentials, no secrets-dependent gates, unconditional bounded jobs, no hidden failures/context interpolation into shell, required commands/triggers and matching temporary browser paths. Four Node regression tests exercise weakened privilege/pinning/failure/actor settings and duplicate YAML keys. These static checks are guardrails, not a complete audit of arbitrary shell/action code.

`pnpm check:workflows` downloads official actionlint 1.7.12 for Linux x86_64 into a fresh temporary directory, verifies the pinned SHA-256 `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8` before extraction/execution, validates all workflow YAML files, and removes its directory in a trap. It requires curl, tar, sha256sum and HTTPS access. It fails on download/checksum/validation errors. No pipe-to-shell installer or committed tool binary is used. Other host architectures need a separately verified native actionlint or a Linux x86_64 validation environment; this script does not silently download a different architecture. ShellCheck is optional in actionlint when installed; local absence is reported as a verification limitation, not a ShellCheck pass. `bash -n scripts/check-workflows.sh` checks installer syntax.

When updating a pinned action/tool, verify its release, exact revision/checksum, input/runtime compatibility and rerun validation; changing a version comment alone does not update the executed revision. References: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [pnpm setup](https://github.com/pnpm/action-setup), [actionlint release](https://github.com/rhysd/actionlint/releases/tag/v1.7.12).

## Workspace quality job

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm check:repo
pnpm check:workflows
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Unit/HTTP tests include shared contract privacy, synthetic actor environment/property boundaries and exact live/exported OpenAPI parity. A route/schema change must regenerate the saved OpenAPI after build as documented in [API contracts](../api/contracts-and-actors.md). The job uses no live database or paid provider credentials. Existing warnings are documented rather than suppressed. Workflow validation requires network access for its pinned validator; offline install verification alone does not reproduce that network step.

## Isolated PostGIS job

The fresh runner must have no .env; the job refuses to overwrite an existing one before copying .env.example. It validates Compose, builds contracts/API/web, then runs `pnpm db:test` with TEST_LANDING_WEB=1. UNI-011 adds the actual production web launcher/Next read-only adapters and QR SSR against the same real Nest/isolated PostGIS, including outage handling. That harness creates a uniquely named db-test container, loopback random port, separate test credentials/network and tmpfs storage, asserts there are no persistent volume/bind mounts, and cleans up its own API/container in finally. It checks migration ordering/concurrency/rollback/checksum/ownership, synthetic seed guards and real readiness outage/recovery. It never starts the development db service or runs development seed/migrate/reset commands.

CI supplies APP_ENV=test and disables synthetic actors; .env contains example-only credentials. It does not copy a developer's .env or use production URLs. Ordinary cancellation cleanup is best-effort; bounded hosted jobs/runners are disposable if forcibly terminated. No persistent development data is available to this job. Locally, preserve your existing .env and run `pnpm db:test` after building; do not copy over your configuration. The separate legacy extension suite requires development infrastructure and is not a required CI job here; the isolated suite already covers ownership adoption/dependency rollback.

## Component browser job

The job installs the locked Playwright Chromium browser/system dependencies, builds web and runs `pnpm test:ui`. PLAYWRIGHT_BROWSERS_PATH and UI_EVIDENCE_DIR are set on the install/test steps using runner.temp (runner context is not available in job-level env). Port 3180 must be free; Playwright owns/stops its production server. UI screenshots/accessibility JSON go to temporary storage, not checked-in UNI-003 evidence. Existing local default evidence behavior is unchanged unless UI_EVIDENCE_DIR is set. Traces use the existing temporary output directory. No automatic artifact upload is configured: review and sanitize evidence before sharing, especially when later tests expand beyond synthetic fixtures.

This includes the eight existing design-system tests plus eight targeted landing/QR/state/accessibility tests (UNI-011) across 390×844 and 1440×900, with 320/768px reflow checks. A test-only loopback HTTP upstream based on synthetic seed data supplies browser scenarios; it is not imported by app runtime. Real Next/Nest/PostGIS behavior is separately covered in the isolated DB job. It is **not full product E2E**. `pnpm test:e2e` intentionally remains an explicit unconfigured failure pending UNI-015; do not add it as a passing gate, suppress its failure or claim the product flow is covered. Cross-browser/human screen-reader approval also remains separate.

## Permissions, workflow and reporting boundary

The token has contents: read only, checkout does not persist credentials, untrusted pull_request_target execution and secrets-dependent jobs are prohibited, and no commit/push/PR/merge/deployment automation exists. Repository source checkout by CI is required to run tests; it grants no assistant permission to execute Git operations. All human integration remains [fast-forward-only into dev](../../CONTRIBUTING.md#fast-forward-only-integration), PR optional, main stable releases only.

Local commands, YAML/actionlint checks and Docker/browser tests are local evidence. Remote Actions results, hosted image/cache behavior, event dispatch and action execution are only verified after a human pushes/dispatches and observes their run URLs/results. A configured YAML file is not proof that CI passed. No branch protection, required-check setting, token policy, artifact publication or remote workflow run is changed/triggered by this issue. Phase 0 is not declared complete before its remaining remote/human gates.
