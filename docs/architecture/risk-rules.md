# Versioned workflow risk rules — UNI-045

Specification §3.5–3.8, §10 UNI-045; [ADR-0004](../decisions/0004-automation-first-governance.md) and [ADR-0005](../decisions/0005-registration-deferral.md) remain controlling. The engine classifies how a contribution should be handled. It does not verify facts, grant ownership, assign report severity, replace source confidence or publish sensitive data.

## Separation of concepts

| Concept | Owner | Meaning |
| --- | --- | --- |
| `RiskDecision` (`AUTO_PUBLISH`/`HOLD`/`NEEDS_EVIDENCE`/`ESCALATE`) | this engine | workflow action for a contribution |
| `SubmissionRisk` (`LOW`/`NEEDS_EVIDENCE`/`HIGH_RISK`/`REJECTED`) | existing intake vocabulary | unrelated submission vocabulary; not produced here |
| `ReportSeverity` (`P0`/`P1`/`P2`) | UNI-044 report policy | harm triage for confidential report cases |
| `SourceConfidence` | existing contracts | provenance label, never authority |

A risk evaluation is an explainable rule result, not a score and not proof. Votes, confirmations and agreement are recorded signals only; no threshold can grant support access, operator permission, ownership, official facts or independent verification.

## Rule catalog (`risk-rules-v1`)

Signals are derived server-side from strict contracts and stored state. The engine is a pure function of those signals and the rule version. Rules are evaluated in catalog order; the strongest triggered decision wins (`ESCALATE` > `NEEDS_EVIDENCE` > `HOLD` > `AUTO_PUBLISH`). All triggered reasons are returned sorted by rule id.

| Rule | Decision | Trigger |
| --- | --- | --- |
| RR-001-OWNER-CONTROLLED-FIELD | ESCALATE | official fee/vacancy/visibility/contact/ownership field attempt |
| RR-002-OWNERSHIP-CLAIM | ESCALATE | ownership language or claim |
| RR-003-SELF-INTEREST | ESCALATE | actor manages the target |
| RR-004-SENSITIVE-REPORT | ESCALATE | P0 report type (private data, fake ownership, harassment) |
| RR-005-PRIVATE-TEXT | NEEDS_EVIDENCE | residential/private/address/rent/price/vacancy wording |
| RR-006-CONTACT-OR-LINK | NEEDS_EVIDENCE | contact sequence, e-mail marker or external URL |
| RR-007-EVIDENCE-INSUFFICIENT | NEEDS_EVIDENCE | required evidence note absent |
| RR-008-STALE-OBSERVATION | NEEDS_EVIDENCE | observation older than 30 days |
| RR-009-MEDIA-UNMODERATED | NEEDS_EVIDENCE | unmoderated media signal |
| RR-010-AGREEMENT-NOT-EVIDENCE | NEEDS_EVIDENCE | ≥3 confirmations without an evidence note |
| RR-011-COLLUSION-PATTERN | NEEDS_EVIDENCE | ≥3 confirmations from fewer than 3 accounts |
| RR-012-REPORT-SUPPRESSION-ACTIVE | HOLD | existing report suppression/hold |
| RR-013-DUPLICATE-OR-CONFLICT | HOLD | pending duplicate or canonical collision |
| RR-014-CONFLICTING-REPORTS | HOLD | other open reports on the target |
| RR-015-REPEATED-SUBMISSIONS | HOLD | ≥3 actor submissions in the recent window |
| RR-016-REPORT-CASE | HOLD | reports never auto-publish a fact |
| RR-017-KIND-NOT-PUBLISHABLE | HOLD | only eligible public POI proposals may auto-publish |
| RR-018-PUBLICATION-GATE-CLOSED | HOLD | runtime publication gate closed |
| RR-019-ROUTINE-LOW-RISK | AUTO_PUBLISH | eligible kind, open gate, no triggered hold/evidence/escalation signal |

`RR-019` is the only publication path. It is unreachable in the current runtime because `PUBLIC_WRITES_ENABLED=false` until final identity/publication gates pass ([ADR-0005](../decisions/0005-registration-deferral.md)); every current real flow records at least `RR-018` and remains held. The outcome is supported and unit-tested for the future gate, not claimed as current behaviour.

## Persistence and privacy

Migration 018 stores one immutable evaluation per contribution: kind, contribution id, rule version, decision, derived level, rule ids and the fixed public explanation. The table has no raw submission text, evidence, reporter identity, coordinates, actor metadata or free-form score. Actor-scoped contribution history joins the evaluation and projects only decision/version/rule ids/explanation; UNI-043/UNI-044 receipts and states are unchanged.

Risk recording occurs in the same transaction as intake. A failure aborts the contribution rather than leaving an unexplained state. Replays reuse the original contribution and produce no second evaluation. Sensitive evidence remains in the existing private tables; report severity and suppression/appeal decisions remain authoritative and are never overridden by this classifier.

## Boundaries and conservative defaults

- No vote threshold, reputation score or confirmation count can publish a fact, grant support access or transfer ownership.
- Community contributions cannot set official fees, vacancy, visibility, exact map pins or owner contacts; strict contracts reject such fields before the engine.
- Residential locations, contacts, ownership claims and sensitive reports are held or escalated; nothing is auto-published.
- Legitimate negative reviews are not deleted because of disagreement or reports.
- Rate limits, actor isolation, idempotency and protected writes are unchanged.
- No admin dashboard, ownership transfer or UNI-046/UNI-047 scope is introduced.
