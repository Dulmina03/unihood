# Current status

Updated: 16 November 2026 (Asia/Colombo).

- Current issue: **UNI-010 — university/campus/entrance data and public read APIs**, M2/shared M5 contracts. Prepared branch confirmed from plain .git/HEAD: `feat/uni-010-university-campus-entrances`. No Git command/history audit performed.
- **UNI-006 merged into dev and successful remote CI verification are explicitly human-confirmed.** Run URL and commit SHA were not supplied and remain **unverified**; no independent remote observation is claimed. Earlier integration/test evidence is historical in [Phase 0](PHASE-00.md).
- UNI-010: **implemented and locally verified; awaiting the human Git checkpoint**. Frozen install, repo/actionlint checks, lint/typecheck/build, 108 unit/HTTP tests, 12 isolated Docker result groups and eight existing browser component tests PASS; generated OpenAPI has eight GET paths/28 components. Safe migration, deterministic synthetic seeds, read-only APIs, shared Zod/OpenAPI contracts and tests are documented in [Phase 1](PHASE-01.md), [API operations](../api/universities.md) and [verification](../verification/UNI-010/README.md). Remote UNI-010 Actions: **NOT RUN/NOT OBSERVED** here.
- No real campus coordinates were invented. All seed universities/campuses/gates are explicitly fictional synthetic fixtures around (0,0). Eligible verified rows are public; synthetic rows require compatible explicit local/test environments.
- Existing persistent data, extension ownership, registration deferral and property-specific authorization boundaries are preserved. No unrelated map, boarding, registration or discovery feature is added. Phase 1 remains in progress.
- Human-only Git: one issue branch, review/stage/commit/push manually, optional PR into dev, integrate via **git merge --ff-only**, no merge commits, main reserved for stable releases.
- **Stop before UNI-011 or any next issue.** The human must finish UNI-010's checkpoint and prepare a separately authorized next branch.
