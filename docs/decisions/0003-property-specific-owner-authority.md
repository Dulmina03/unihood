# ADR-0003: Property-specific owner authority

Date: 16 November 2026 (Asia/Colombo). Issue: UNI-004. Status: accepted in specification v3.0; recorded here. M5 owns identity/permission boundaries; M3 integrates property writes. No membership schema, auth adapter or enforcement code is implemented here.

## Context

One person may contribute as a community member and manage several properties. Conversely, different owners may operate in one building. A global `owner` flag, shared phone or coordinate cannot establish authority over a requested property. Verifying an account, university enrollment, property control and current availability are different assertions.

## Decision

- Official fees, deposits, vacancies, verified contact and exact public map publication require an appropriately authorized owner/manager **for the specific boarding**. The API/server checks the actor, target `property_id`/boarding ID and operation permission on every protected action, including updates and consent revocation. UI labels or hidden buttons are insufficient.
- A self-selected role, verified login, student status, arbitrary `X-User-Id`/`X-Role` header, contact match or phone OTP alone never grants property authority. Property A membership cannot authorize property B; shared ownership/contact/building geometry does not merge identities or permissions.
- Exact map publication additionally requires the explicit consent/mode checks in [ADR-0001](0001-location-visibility-and-consent.md). Location-hidden owners may still publish authorized official fees/vacancies; official fields do not require public geography. Public contact requires verification and separate owner consent and cannot expose another person's private details.
- Keep community recommendations and official owner facts distinct. Owner verification, publisher/source, visibility and availability freshness are independent. A community discrepancy may trigger a report, but never silently overwrite an official price/vacancy.
- Latest eligible owner confirmation **per unit** determines public availability. Expired/missing confirmation becomes UNKNOWN; the illustrative 14-day TTL is configurable, not a finalized operational policy. Preserve confirmation dates, author/reason/timestamps and prior values for official changes. Missing price is “Price not provided by owner,” never an estimate.
- Claiming an existing recommendation must preserve canonical property identity, contribution attribution and privacy settings. Conflicting claims remain pending; no temporary owner privileges from the dispute itself. Exceptional support may suppress/dispute harmful claims, not impersonate an owner to invent fees, vacancy or map consent.

## Rationale and alternatives

Global roles and contact-only ownership claims are convenient but permit cross-property access and takeover. Using one “verified” badge conflates identity, ownership and freshness. Scoped authorization and independent labels maintain least privilege and explain what a displayed fact actually means without requiring an early choice of identity provider.

## Consequences

Future permission interfaces and endpoints need operation/target checks, denial tests, auditable mutations, membership revocation and guarded publication. Owner-authorized writes stay closed in deployed environments until final auth is implemented and passes its release gates. Existing shared interfaces and UI demos are not evidence that those domain controls are implemented. [ADR-0005](0005-registration-deferral.md) preserves the implementation schedule.

## Privacy and security boundaries

Deny guests, unknown actors, unrelated owners and revoked/disabled memberships. Do not reveal another property's private existence/evidence through errors or authorization responses. Separate private verification evidence from public DTOs and media. Audit events must be access-restricted and redact sensitive values; “audit history” does not justify copying hidden coordinates/contact/proof into ordinary logs. No automatic inheritance of owner authority through a merge, claim, public POI update or reputation score. Real authorization remains server-side even when clients use a strongly typed DTO.

## Deferred questions

Final proof-of-authority evidence, delegated manager permission sets, claim disputes, membership/recovery/revocation mechanics and evidence retention belong to the scheduled final phase. Freshness configuration and owner update usability require validation later. No identity provider, account fields, ownership document requirement or retention duration is selected here.

## Validation obligations

Future tests cover property A versus B, one owner/two properties, two owners/one building, forged role headers, revoked access, community official-field writes, stale vacancy, contact consent and claim conflicts. E2E-08/09/11/14/18/19 plus final-phase adversarial cases are targets, **not executed by UNI-004**.

## Specification references

- [§2.1 actors](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#21-actors) and [§2.2 permissions](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#22-non-negotiable-permission-matrix)
- [§3.5 official vacancy/fee updates](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#35-workflow-w-04--owner-updates-vacancy-and-fee) and [§3.9 claim boundary](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#39-workflow-w-08--owner-claim-final-phase-spec-only)
- [§6.4 freshness](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#64-vacancy-and-source-freshness) and [§8.6 M3 acceptance](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#86-module-m3-deliverables-and-acceptance)
- [§11.3 permission interfaces/security invariant](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#113-mandatory-auth-service-interfaces-available-from-phase-0)
- [§13.3 E2E scenarios](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#133-golden-e2e-scenarios-and-expected-results)
