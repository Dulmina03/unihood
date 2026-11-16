# ADR-0004: Automation-first governance with exceptional escalation

Date: 16 November 2026 (Asia/Colombo). Issue: UNI-004. Status: accepted in specification v3.0; recorded here. M4 owns contribution/report policy; M5 owns restricted support access and operational integration. No support service/dashboard or automated decision engine is implemented here.

## Context

Routine campus-by-campus administrative approval would slow contributions and depend on unavailable university administrators. Removing daily moderation does not remove responsibility for privacy, ownership conflicts, security or incorrect merges. Automation and community confirmations are useful evidence, but cannot confer ownership or make uncertain allegations true.

## Decision

- No day-to-day Admin Dashboard, university-specific administrator dependency or mandatory routine approval queue. Eligible low-risk **public POI** submissions may publish as community-submitted after server validation, duplicate/abuse checks and media moderation; no automatic owner-verification claim follows.
- Sensitive residential addresses, private contacts, ownership claims, exposed personal details and high-confidence duplicate collisions remain held for evidence or exceptional escalation. This ADR does not permit all submissions to auto-publish. Boarding recommendations remain subject to [ADR-0002](0002-student-advertisement-only-contributions.md) and cannot become map listings through confirmations.
- Independent community confirmation can raise confidence using independence, recency, source, suspicious-pattern and conflict-of-interest checks. A simple vote count, reputation threshold or fuzzy score never automatically grants support access, transfers ownership, force-merges contested records or certifies official vacancy.
- Maintain a narrow, reachable exceptional escalation channel for privacy exposure/takedown, ownership conflicts, abuse, security incidents, appeals and wrongful merges. Restricted operators act on cases with authorization and audit trails; they do not impersonate owners or routinely author official property facts.
- Obvious private exposure should temporarily suppress affected fields/media pending review. Record risk classification, minimal confidential evidence, resolution and a safe appeal path; notify affected parties where safe. Contested ownership remains pending without privileges. Do not automatically erase legitimate negative feedback at an owner's request.
- Destructive canonical merges are exceptional, restricted and reversible: preserve mapping, pre-merge state and reverse action; do not transfer owner privileges or official prices by default. Candidate matching can attach proposals to known identities without destructive merges; distinct businesses/properties in one building remain distinct.

## Rationale and alternatives

Mandatory routine human approval does not scale; fully automatic sensitive publication risks harm. Reputation voting is vulnerable to collusion and is not proof of property authority. Risk-based automation with exceptional, accountable human intervention supports ordinary participation while retaining a route to remedy serious errors.

## Consequences

Future workflows need risk states, confidential case/evidence storage, rate limits, suspicious-pattern checks, auditable resolution and tested reversible merges. An exception channel is a launch obligation, not a claim that an operator is already staffed. Operational accountability persists even without a broad admin UI. Unresolved critical privacy/ownership problems must block affected publication or launch; open guest browsing does not authorize protected contribution writes before [ADR-0005](0005-registration-deferral.md)'s gates.

## Privacy and security boundaries

Keep reporters' identities, ownership proof and private evidence out of public DTOs, notices, logs and notifications. Restrict operator access and record actions with sensitive values redacted; minimize evidence collection and retention. Escalation must not become an unrestricted private-location lookup or ownership-transfer bypass. Takedown protection must also invalidate affected public derivatives/caches under [ADR-0001](0001-location-visibility-and-consent.md). An automated confidence label is not a legal finding, identity verification or route-safety guarantee.

## Deferred questions

Operator contact method/staffing, access controls, response targets, detailed risk thresholds, notification/appeal mechanics and evidence retention need later implementation and review. Exact owner-claim dispute proof and authentication remain final-phase decisions. No SLA, service vendor, legal interpretation, support credential scheme or production operator assignment is created by this record.

## Validation obligations

Future tests verify sensitive holds/takedown, confidential reports, appeal/resolution history, restricted support actions, collusion resistance and reversible merge recovery without unintended privilege transfer. E2E-07/14/15/16/19 and §6.3 duplicate fixtures are targets, **not UNI-004 executed scenarios**.

## Specification references

- [§0.2 governance decision 8](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#02-agreed-product-decisions-do-not-silently-reverse) and [§2.4 routine operation](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#24-administration-free-routine-operation)
- [§3.8 reports/takedown](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#38-workflow-w-07--report-correct-request-takedown)
- [§5.5 restricted reversible merges](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#55-relational-consistency-and-migrations) and [§6.3 duplicate fixtures](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#63-required-duplicate-test-dataset)
- [§6.5 review controls](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#65-review-authenticity-and-conflict-controls)
- [§14.3 incidents](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#143-incident-workflow) and [§14.4 data lifecycle](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#144-data-lifecycle--retention)
- [§13.3 E2E scenarios](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#133-golden-e2e-scenarios-and-expected-results)
