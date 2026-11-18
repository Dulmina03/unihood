# UNI-045 verification — versioned risk rules

Date: 18 November 2026 (Asia/Colombo). Branch: `feat/uni-045-risk-rules`, based on verified `dev` `ca3739412c56936b970942cce222079435d33882`.

## Scope verified

A deterministic, versioned (`risk-rules-v1`) and explainable evaluator classifies contribution handling as `AUTO_PUBLISH`, `HOLD`, `NEEDS_EVIDENCE` or `ESCALATE`. Rules are explicit and ordered; identical signals and version produce identical reasons and decisions. Signals cover contribution/target kind, source/evidence presence, freshness, duplicates/canonical collisions, self-interest, active report suppression, conflicting reports, repeated submissions, private/contact/residential/ownership content, media moderation, agreement/collusion patterns and sensitive reports.

Risk is separate from `ReportSeverity` and `SourceConfidence`. Votes/confirmations are signals only: agreement without evidence requires evidence, and agreement from too few accounts is a collusion pattern; no vote threshold grants authority or publication. Real intake runs with the publication gate closed, so no user content auto-publishes. `AUTO_PUBLISH` is supported and tested for the future eligible public-POI gate but is unreachable at runtime.

UNI-044 suppression and appeal states remain authoritative; a sensitive report can be risk-`ESCALATE` while its report status stays `SUPPRESSED`. Ordinary reviews and corrections are held, official/owner/visibility/contact attempts are rejected by strict contracts, and owner self-review is refused before a risk record. Legitimate negative content is not deleted or downgraded by disagreement.

## Local results (actual)

- `pnpm lint`: PASS (`eslint . --max-warnings=0`).
- `pnpm typecheck`: PASS (contracts built; all workspace typechecks).
- `pnpm check:repo`, `pnpm check:workflows`: PASS.
- Workspace tests: PASS — contracts 131, API 241, web 218; 13 root runner tests.
- `pnpm build`: PASS (API/contracts/web).
- `pnpm test:ui`: PASS — 128/128 Playwright cases across mobile and desktop, including 4 new UNI-045 history cases with zero-violation axe reports.
- Evidence: `risk-history-{mobile,desktop}.png`, full-page captures and axe JSON in this directory. Automated results do not imply human approval.
- OpenAPI regenerated: 47 paths, new history risk fields/components documented.
- New coverage: contract rules for every outcome, gate, kind, self-interest, evidence/staleness, votes, collusion, duplicates, conflicts/reports, suppression, strong-reason precedence, determinism, schema strictness and legacy history compatibility; API signal/record tests; HTTP history serialization/rejection; real database group `scripts/lib/test-risk-rules.mjs` covering held routine intake, evidence demands, official-field rejection, owner self-review refusal, sensitive report escalation alongside UNI-044 suppression, replay idempotency, non-leak and populated rollback refusal; web history rendering and malformed-rule rejection.

## Not run locally

- **Isolated Docker/PostGIS `pnpm db:test` and browser E2E: NOT RUN locally.** No Docker daemon and no `.env`; remote CI is required and no local database PASS is claimed.
- Human visual/accessibility and real-device checks: NOT PERFORMED. Automated checks do not imply human approval. Detailed Phase 1 manual accessibility remains DEFERRED to Phase 6.

## Remote CI and integration

Pending exact issue commit CI and fast-forward dev verification; this record will be updated with actual run URLs only after they pass.
