# Explainable risk outcomes and contribution history — UNI-045

The versioned `risk-rules-v1` evaluator runs inside the existing contribution transactions for POI proposals, POI corrections, boarding recommendations, structured reviews and confidential reports. It returns `AUTO_PUBLISH`, `HOLD`, `NEEDS_EVIDENCE` or `ESCALATE` with explicit rule identifiers and a fixed explanation. Full catalog and boundaries: [risk architecture](../architecture/risk-rules.md).

## API surface

No new route is added. `GET /api/v1/contributions` remains protected, no-store and actor-scoped. Each returned item may now include:

- `riskDecision`: `AUTO_PUBLISH | HOLD | NEEDS_EVIDENCE | ESCALATE`
- `riskLevel`: `LOW | ELEVATED | HIGH`
- `riskRuleVersion`: currently `risk-rules-v1`
- `riskReasons`: bounded explicit rule ids
- `riskExplanation`: fixed public sentence from the rule catalog

These fields are nullable for contributions recorded before UNI-045. They never contain private evidence, payload text, contacts, coordinates, reporter identity, rule scores or internal actor metadata. The existing contribution state remains the held/suppression status; risk classification is separate from report severity and source confidence.

Current runtime: all supported intake kinds pass `publicWritesEnabled=false`, so real flows record `HOLD` (or `NEEDS_EVIDENCE`/`ESCALATE` where a stronger rule triggers). Routine `AUTO_PUBLISH` is only available to the future eligible public-POI path after the final identity and publication gates; this prototype does not publish user content.

## UI

`/contributions` shows the decision badge, explanation and rule version per item. It does not show a score, raw signals or moderation internals.

## Evidence

Implementation and actual results: [UNI-045 verification](../verification/UNI-045/README.md). Migration 018 preserves populated history and refuses destructive rollback.
