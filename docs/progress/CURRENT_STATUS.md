# Current status

Updated: 16 November 2026 (Asia/Colombo).

- Current issue: **UNI-004 — product decision records**, Phase 0 documentation across M1–M5 boundaries.
- Branch confirmed by reading `.git/HEAD` as a plain file: `docs/uni-004-product-decisions`. No Git command was performed; remote/integration history was not inspected.
- **UNI-003 is merged into `dev`, explicitly confirmed by the human developer.** This supersedes the former pending UNI-003 checkpoint; no merge hash/date or independent Git verification is claimed. Prior UNI-001–003 verification remains historical in [PHASE-00.md](PHASE-00.md).
- UNI-004 deliverables: [five product ADRs and decision navigation](../decisions/README.md), recording location visibility/consent, student advertisement-only contributions, property-specific owner authority, automation-first governance with exceptional escalation, and final-phase registration deferral. Each includes rationale, alternatives/consequences, privacy/security boundaries, deferred questions, specification links and future validation obligations. Agreed requirements are recorded, not replaced by new authentication policy.
- Status: **implemented and verified; awaiting human Git checkpoint**. [UNI-004 evidence](../verification/UNI-004/README.md) records PASS for documentation links/anchors, ADR structure/traceability and policy review, whitespace and documentation-only SHA-256 scope checks; `pnpm lint`, `pnpm typecheck`, `pnpm test` (**23 existing tests**) and `pnpm build` also PASS. Browser/product E2E, Docker and remote CI were NOT RUN for this documentation-only issue.
- Scope: documentation only; no runtime source, dependencies, API/contracts, auth implementation, database/migration/seed, environment configuration, extension ownership, persistent data or UI behavior changed. Future E2E scenarios in ADRs are obligations, not completed tests.
- Phase 0 remains incomplete. **UNI-005–006 are outstanding; neither is started by UNI-004.** Final signup/provider/owner-proof choices remain deferred to Phase 7. Guest reads remain open; deployed protected writes must remain denied until real authorization and release gates pass.
- Human workflow: review/stage/commit/push this issue branch; verified changes integrate into `dev` by **git merge --ff-only**. PR optional; no merge commits; `main` reserved for stable releases. Every Git operation belongs to the human.
- **Stop before UNI-005** (`feat/uni-005-api-contracts`) until the human completes UNI-004 integration and prepares the next issue branch.
