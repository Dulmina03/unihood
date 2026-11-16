# Coding conventions

The specification and [five ADRs](../decisions/README.md) define behavior; conventions make implementation consistent. Work one UNI issue at a time with explicit acceptance and [authorized autonomous Git and exact-commit CI](../../CONTRIBUTING.md). M1 owns app/UI, M2 spatial/POI/dedup, M3 boardings/official fields, M4 community/reports/routes observations, M5 contracts/tooling/integration/security and final auth. Coordinate shared contracts/migrations explicitly rather than editing another module silently.

## Types, contracts and behavior

Use strict TypeScript, named descriptive functions/types and the shared ESLint/tsconfig settings. Match nearby code style; do not reformat unrelated files or add an unrelated formatter migration. Keep domain rules in the owning service/shared contract and interfaces explicit. Avoid any, unsafe casts, swallowed failures, unused code, secrets and misleading mocks. Document justified exceptions with a narrow scope and tests rather than disabling lint globally.

Public REST payloads use the strict Zod/TypeScript schemas in packages/contracts; validate untrusted query/body/params explicitly and project public fields before serialization. Generate OpenAPI from actual handlers/schemas and keep its export current. Response DTO validation does not prove ownership/consent or remove an address written into free text. Preserve [actor/configuration boundaries](../api/contracts-and-actors.md): arbitrary headers are not authentication, property A grants do not imply B, local/test synthetic actors never enable deployed writes. Provider/proof/signup decisions stay in Phase 7.

Community boarding recommendations appear only as ads, never exact pins/official fees/vacancies. Hidden/area-only data must not leak through API payloads, metadata, media, logs, errors, sorting, routes or caches. Contact and map consent are distinct. UI masking is not server authorization/redaction. No routine admin dashboard, owner impersonation, automatic ownership transfer or destructive fuzzy merge.

## Persistence and external services

Use paired ordered reversible SQL and the established transactional/checksummed runner. Applied migration files are immutable; add a later migration rather than edit history or bypass checksum drift. Preserve canonical identities, existing persistent data and extension ownership; never use DROP EXTENSION CASCADE or delete a volume to fix a failed rollback. Test against disposable storage. Document operational/contract changes and failure recovery. No schema change is needed solely for a tooling issue.

External provider behavior needs real licensed data or explicitly labeled local adapters, never invented routes, vacancies, review scores or verification claims. Record provenance/licenses and unavailable states. Route reports describe observed conditions and recency, not guaranteed safety. Never log connection strings, hidden coordinates, contact proof, actor evidence or raw private exception details.

## Tests, UI and documentation

Add focused tests for meaningful behavior and adversarial boundaries, not assertions that duplicate implementation. Relevant unit/integration/browser checks must run and failures remain visible. Use [synthetic fixtures](synthetic-fixtures.md), deterministic clocks and isolated storage. Label actual PASS/FAIL/NOT RUN, separate local/remote evidence, retain useful caveats and do not recycle old results as current execution.

Use the approved Campus Teal / Editorial Explorer + Urban Map direction and shared accessible components. Preserve semantic labels, keyboard focus/restore, responsive and loading/empty/error states. UI changes need applicable 390×844 and 1440×900 screenshot evidence and asset provenance. No fake precise metrics/map locations. Registration UI remains deferred.

Update README/configuration docs when commands or runtime requirements change; record decisions in architecture/ADRs, exact issue results in PHASE-XX and current state in CURRENT_STATUS. Keep historical results clearly historical and record human merge confirmation without inventing hashes or remote success. Source comments explain important reasons/boundaries; product UI should not expose irrelevant implementation details.

Use a conventional commit suggested to the human, such as feat(web), fix(boarding), test(auth), chore(ci) or docs(project). Use descriptive issue branches type/uni-###-description; templates are optional review aids and do not authorize assistant Git actions or automatic continuation.
