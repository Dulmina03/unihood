# Current status

Updated: 16 November 2026 (Asia/Colombo).

- Current issue: **UNI-001 — workspace bootstrap** (M1 + M5; minimum M2 infra required by §9.7).
- Last verified branch (from the initial bootstrap; no Git commands run during this repair): `chore/uni-001-workspace-bootstrap`.
- Implementation: workspace, Next.js landing placeholder, NestJS liveness, shared contracts/auth interfaces, Campus Teal tokens, PostGIS Compose/extension SQL, test harnesses and CI written.
- **Verified:** frozen install, lint, typecheck, eight tests, production build, production HTTP checks and combined development HTTP checks. See [Phase 0](PHASE-00.md) for commands and caveats.
- Status: **bootstrap and database rollback repair verified; human Git handoff pending**. Browser screenshots are unverified (no browser available); E2E intentionally remains unconfigured.
- Database repair verified against the now-running Docker service: migrate ×2 → rollback ×2 → re-migrate passed; all 6 pre-existing extension versions and 37 existing table row counts were preserved. `pnpm db:test` passed fresh-image, owned/adopted extension, spatial data and dependency-failure checks in disposable tmpfs storage. The existing service remains healthy with migration 001 applied. See PHASE-00.md for actual evidence.
- No Git write operation performed. Existing specification edits, AGENTS.md, START_HERE.md and reference assets preserved.
- **Do not start UNI-002.** UNI-001 acceptance and the human commit/push/PR/merge checkpoint remain pending. After acceptance and merge, the human creates the UNI-002 branch manually.

Registration/provider/owner-proof decisions remain deferred to Phase 7. No live inventory or public write routes exist.
