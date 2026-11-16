# Current status

Updated: 16 November 2026 (Asia/Colombo).

- Current issue: **UNI-005 — REST contracts, OpenAPI baseline and guarded synthetic actors**, M5 with shared M1–M4 consumers.
- Branch confirmed by reading `.git/HEAD`: `feat/uni-005-api-contracts`. No Git command or history audit was performed.
- **UNI-004 was committed and merged into `dev`, explicitly confirmed by the human developer.** UNI-003's merge is also human-confirmed. Earlier verification remains historical in [PHASE-00.md](PHASE-00.md); no merge hashes/dates are inferred.
- Delivered: eight shared enum families, strict Zod/TypeScript public boarding variants, error/pagination/query validation, current-time vacancy projection, provider-neutral identity/permission injection, opt-in loopback local/test synthetic actors and a global protected-action guard. Caller-supplied identities/memberships and arbitrary identity headers confer no grants; staging/production/unknown configurations fail closed. No final authentication or domain workflow is implemented.
- OpenAPI: [generated baseline](../api/openapi.json), five live public GET paths and 18 shared components. Nest route/response metadata and Zod schemas generate it; no fake domain/actor endpoint is listed. Existing readiness retains its flat monitoring protocol. See [contract/configuration documentation](../api/contracts-and-actors.md).
- Status: **implemented and verified locally; awaiting human Git checkpoint**. [UNI-005 evidence](../verification/UNI-005/README.md) records frozen install, lint, typecheck, **77 tests**, production build, saved/live OpenAPI parity, official OpenAPI/component validation, built production-mode HTTP smoke and **7 Docker integration result groups**, all PASS. Browser/product E2E, screenshots, separate legacy extension suite and remote CI were NOT RUN for this issue.
- No schema/migration, persistent data, PostGIS extension ownership, final signup/provider/proof policy, account/session flow or frontend behavior was changed. New protected HTTP fixture handlers exist only in tests and are absent from production modules/build.
- Phase 0 remains incomplete. **Stop before UNI-006** (`chore/uni-006-ci`). Broader CI conventions and final Phase 7 authentication remain separate issues.
- Human-only workflow: review/stage/commit/push the issue branch; integrate verified work into `dev` with **git merge --ff-only**, PR optional, no merge commits, `main` stable releases only. Do not continue until the human checkpoint and next branch preparation are complete.
