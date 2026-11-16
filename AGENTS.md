# AGENTS.md — UniHood coding-agent operating rules

Read `UniHood_MASTER_PROJECT_SPECIFICATION.md` v3.0, current/phase progress, the five ADRs and CI documentation before changes. Preserve agreed product requirements. The human's autonomous-workflow authorization supersedes older human-only Git/checkpoint wording in the specification, historical records and templates.

## Start and scope

- Treat this as an existing repository; never initialize or replace it. Inspect status, branches, remotes, manifests and dependencies. Expected origin: `https://github.com/Dulmina03/unihood.git`; verify it.
- Begin from a clean `dev`, fetch origin and synchronize with fast-forward only. Preserve unrelated work; do not stash/discard it without approval. Never work directly on `main`.
- Create one appropriately named branch per exact roadmap issue. Start at **UNI-020**, then follow specification §10 in order; do not invent UNI numbers or implement future workflows early.
- Read the issue's dependencies and acceptance requirements. Own only its scoped changes across the five modules. Applied migrations are immutable; add paired ordered SQL. Preserve existing persistent data and extension ownership.

## Authorized autonomous Git and verification

1. Implement the specified issue and meaningful tests, preserving privacy/security.
2. Run applicable lint, typecheck, unit/API, build, browser and isolated Docker checks. Fix failures before integration; never suppress a failing gate. Report local limitations separately from remote results.
3. Review diffs, stage explicit relevant paths only, inspect the staged diff and exclude secrets, local `.env` credentials, real private data and generated output.
4. Commit with a conventional message and push the issue branch. Verify applicable GitHub Actions for that **exact full commit**, workflow and branch: run URL, status and every required job result. Triggered/pending/skipped/cancelled is not PASS.
5. Only after required checks pass, fetch/recheck clean synchronized `dev`, integrate the verified issue commit with `git merge --ff-only`, push `dev`, and observe its exact-commit remote CI. Never create merge commits. PRs are optional.
6. Update progress/verification with actual results, commits, branch/run URLs and integration status. Evidence follow-up commits also require applicable exact-commit checks before integration; never predeclare a future run passed. Start the next issue only after dev CI is verified.
7. Continue automatically while the active session and execution permissions allow. Give a short per-issue report: features, checks/CI, branch/commit/integration and manual items. No routine human Git checkpoints.

If remote checks are unavailable/unverifiable, stop and report the exact blocker and next action. Do not force-push, reset/rewrite shared history, bypass CI, modify `main`, create release tags, deploy publicly or delete important data without explicit human approval. Do not auto-delete branches or change repository protections/permissions. A failed fast-forward is a conflict to inspect, not permission for a normal merge/rebase/reset.

## Human input and boundaries

Ask only for genuine product/policy/privacy/ownership decisions; real-world data or external-service consent; unavailable credentials/permissions; manual visual/accessibility/device checks; destructive actions, deployment/releases; or persistent failures/conflicts that cannot safely be resolved. Do not claim background work after this session stops.

Keep all five ADRs intact. No private boarding coordinates or inference through distances/routes/search/cache/metadata. Students contribute boarding recommendations only in advertisements, never exact map pins. Only authorized property managers control official fees/vacancies; exact boarding map publication also requires consent. Production protected writes fail closed. Use existing actor interfaces and guarded local/test-only synthetic adapters before final authentication. Registration/identity-provider and owner-proof decisions remain in Phase 7, the final feature phase. No routine admin dashboard.

Keep approved Campus Teal / Editorial Explorer + Urban Map references and accessible responsive components. Never invent real listings, locations, availability, owner claims or test results. Synthetic fixtures and mocked provider resources must be explicitly labeled; never use public Nominatim for bulk extraction or assume public OSM tiles are unrestricted.

Update `CURRENT_STATUS.md`, `PHASE-XX.md` and verification records honestly. Remaining Phase 1 manual accessibility checks are explicitly deferred to **Phase 6**, not PASS and not silently dropped; this authorized deferral permits Phase 2. Historical CI failures and local Turbopack limitations remain recorded. See `CONTRIBUTING.md` and `docs/contributing/ci.md` for the current integration workflow.
