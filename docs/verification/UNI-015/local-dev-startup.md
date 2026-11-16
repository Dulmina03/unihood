# UNI-015 local development startup repair

Verified 16 November 2026 on human-created `fix/uni-015-local-dev-startup`, read from plain `.git/HEAD`; no Git commands performed. The original pending UNI-015 integration/visual/CI status is superseded by the later [human acceptance record](human-acceptance.md); remaining manual screen-reader evidence is listed there; this branch is a scoped startup repair, not Phase 2 or proof of human integration/remote CI.

## Observed cause and correction

The human's `pnpm dev` failed with `/usr/bin/node: --env-file-if-exists= is not allowed in NODE_OPTIONS`. Installed Next's `dist/server/lib/utils.js` merges `process.execArgv` into parsed Node options; `formatNodeOptions` omits environment-file flags from its CLI-only allowlist. `dist/cli/next-dev.js` then passes the formatted flags as child `NODE_OPTIONS`. A direct read-only invocation of these installed utilities confirmed that `--env-file-if-exists` is formatted into `nodeOptions`, not `execArgv`. This is unrelated to successful migrations/seeds.

`apps/web/scripts/next.mjs` now calls Node `loadEnvFile` in-process with an absolute repository-root path resolved from `import.meta.url`. It ignores only ENOENT, preserves existing exported values, validates ports and retains loopback binding. Dev/start scripts and both production integration/browser callers no longer pass the CLI env-file flag to this launcher. API startup is unchanged. No dependency patch, dependency update, private configuration changes, database operations or privacy boundary changes.

## Actual verification

- `pnpm check:repo`: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS, exit 0: **228 tests** (12 Node, 22 contracts, 69 API, 125 web). New launcher cases run the actual source in isolated temporary directory fixtures with a stub Next entry point, checking dev/start arguments, root-relative env resolution from another cwd, export precedence, missing-file defaults and invalid ports. They do not claim a real Next runtime; the smoke/browser checks below exercise that separately.
- Real `pnpm dev` smoke: PASS. Started owned web/API processes with exported WEB_PORT=3198, API_PORT=3199, API_BASE_URL=http://127.0.0.1:3199/api/v1. Actual `/` and API `/health` returned **HTTP 200**. Stopped only the owned process group afterward; resulting SIGTERM/ELIFECYCLE shutdown messages are expected. No migration/seed or database deletion performed. Raw temporary startup log: `/tmp/unihood-local-dev-startup.log` (local only).
- `CI=true APP_ENV=test ENABLE_SYNTHETIC_ACTORS=false SYNTHETIC_ACTOR= NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright UI_EVIDENCE_DIR=/tmp/unihood-startup-repair-evidence pnpm --filter @unihood/web test:ui landing.spec.ts`: PASS, **8 tests**, exit 0. Both real production Next start launchers booted using the existing production build. Mobile/desktop landing, keyboard/QR picker, invalid routes, loading/empty/error/retry and axe checks passed. The browser upstream is synthetic HTTP, not Nest/PostGIS; no real-provider verification claimed. Evidence stayed temporary.

Initial attempts inside the restricted execution environment failed to start the real dev service and two Node subprocess test files. The same checks with subprocess/loopback permissions passed; no assertions or safeguards were disabled. Tests and startup used the actual installed dependencies; no new production build was run for this launcher-only repair. Full 42-case browser regression, integrated Phase 1 E2E, isolated Docker regressions, real screen-reader completion and remote CI were **NOT RERUN**. Earlier UNI-015 results remain historical and separate.

## Human checkpoint

Run `pnpm dev`, then open http://127.0.0.1:3000 using the normal root `.env`; existing persistent data is preserved. Human Git review/commit/push and optional PR/fast-forward integration remain required. No remote run/commit evidence is inferred. UNI-013 remote CI remains unverified; UNI-014 run #14 human-confirmed success at short commit 9eefe89 remains unchanged. This was the original startup-repair handoff. The later [human acceptance record](human-acceptance.md) confirms UNI-015 integration, run #16 success, UI-01/UI-03 desktop/mobile approval and core Orca smoke; only the detailed remaining manual screen-reader confirmations keep Phase 1 open. It does not independently establish a separate startup-repair merge or CI run.
