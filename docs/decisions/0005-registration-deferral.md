# ADR-0005: Registration deferral

Date: 16 November 2026 (Asia/Colombo). Issue: UNI-004. Status: accepted in specification v3.0; recorded here. M5 owns secure interfaces and final auth, integrating M3 property authorization. This record selects no authentication provider or owner-proof policy and implements no authentication.

## Context

Public discovery, advertisements, privacy, POIs, community proposals and route behavior can be built with synthetic local/test actors before choosing final registration. Premature account/provider or identity-evidence decisions would collect unnecessary data and bind the project before the final policy review. Deferring authentication must never mean exposing unauthenticated writes.

## Decision

- Guest browsing, search, comparison and public map/QR discovery remain open without registration. This is read access to eligible public data, not permission for anonymous mutation.
- Final signup methods, student/enrollment verification, identity provider, property proof, claim dispute procedure, production sessions and recovery remain reserved for the **Phase 7 final feature phase**, after the earlier discovery/privacy/community/route work and hardening. UNI-067 prepares the worksheet; UNI-070–079 finalize, implement and validate the choices. Phase 8 is release/pilot, not an early authorization shortcut.
- Maintain identity/permission interfaces and property-specific authorization boundaries from Phase 0. UNI-005 separately implements the REST DTO/OpenAPI baseline and explicitly guarded local/test actor adapter; this ADR does not start that issue. Shared interfaces or a UI preview are not completed authentication.
- Simulation requires explicit local/test configuration, isolated synthetic actors and safeguards against public exposure. Arbitrary public `X-User-Id`/`X-Role` headers must never authenticate a request. No development bypass is available in staging/production; “development” naming alone does not authorize an internet-facing write API.
- Deployed public contribution and owner publication stay disabled/denied until real identity and property authorization are integrated, security/permission tests pass, policies are approved and operator escalation contacts are ready. A feature flag alone cannot substitute for those controls. Guest and unknown actors fail protected writes; granting any protected action must follow the relevant permission rules.
- Account verification, university enrollment and property authority remain distinct. Official fields and exact-map consent require [ADR-0003](0003-property-specific-owner-authority.md)'s per-property authority, not a self-selected owner profile or phone OTP alone. Minimize identity evidence; no blanket NIC collection or mandatory account for public search is selected.

## Rationale and alternatives

Choosing a provider/proof scheme now would prematurely resolve explicitly deferred policy and privacy questions. Temporarily anonymous production writes would create an authorization vulnerability. Provider-neutral interfaces plus guarded local/test simulation allow development while retaining a fail-closed deployment boundary. Existing agreed product invariants remain fixed even though their final account mechanics are open.

## Consequences

Public read prototypes can proceed; public write launch cannot. Later modules must depend on interfaces and test actors rather than inventing independent login/role systems. Signup/claim UI placeholders cannot bind final policy. Release gates need real production-like authorization, revocation/recovery tests, secure evidence handling and exceptional support readiness. This ADR does not introduce user/account tables, endpoints, provider credentials or new environment variables.

## Privacy and security boundaries

Never expose production simulated identities or accept client claims of owner authority. Fail closed when real identity/permission resolution is absent. Do not upload real identity evidence into synthetic fixtures or public media; keep future proof confidential, access-controlled and governed by reviewed retention/deletion rules. Recovery must not bypass revoked property membership. Preserve the privacy protections in [ADR-0001](0001-location-visibility-and-consent.md), the contribution limits in [ADR-0002](0002-student-advertisement-only-contributions.md) and the exceptional case boundary in [ADR-0004](0004-automation-first-governance.md).

## Deferred questions

The §11.2 worksheet remains open: email/Google/phone combinations, guest contribution account policy, optional student proof, owner/manager evidence and delegation, conflicting claims, account linking/recovery, minimum age, contact relay/location requests and evidence retention/export/deletion. Its recommendations are **not final choices**. Legal/provider feasibility must be reviewed before launch; this record makes no legal compliance claim and adopts no third-party service.

## Validation obligations

Future tests demonstrate open guest reads, denied anonymous/unknown/deployed-mock writes, no spoofed headers, cross-property denial, secure recovery/revocation, pending conflicting claims and no production dev bypass. E2E-01/09/17/18/19 and UNI-078/079 gates are targets, **not UNI-004 executed tests**. Recording this ADR does not pass any launch gate.

## Specification references

- [§0.3 deliberately postponed decisions](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#03-decisions-deliberately-postponed-or-subject-to-later-validation)
- [§7.3 anonymous read-only API rule](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#73-api-response-rules)
- [§10 Phase 7 ordering and tasks](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#phase-7--final-feature-development-registration-roles-and-owner-authorization-m5-m3-integration)
- [§11.2 open worksheet](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#112-decision-worksheet--complete-just-before-phase-7) and [§11.3 interface/security invariant](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#113-mandatory-auth-service-interfaces-available-from-phase-0)
- [§14.1 environment boundaries](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#141-local-vs-staging-vs-production) and [§13.3 E2E scenarios](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#133-golden-e2e-scenarios-and-expected-results)
