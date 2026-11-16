# UniHood product decision records

These ADRs record the five already agreed v3.0 product decisions required by UNI-004. Their decision status is **accepted in the specification; recorded here**, not newly selected policy or proof of runtime enforcement. UNI-004 was committed and merged into `dev`, explicitly confirmed by the human developer before UNI-005; no Git history audit is claimed. Recorded: 16 November 2026 (Asia/Colombo).

The [master specification](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#02-agreed-product-decisions-do-not-silently-reverse) remains authoritative. ADRs explain rationale, consequences and validation obligations; they do not silently amend agreed requirements. Deferred questions are not permission to ship a permissive fallback. Future changes must identify the affected ADR/specification requirement and record the reason and approval; preserve the earlier decision's history.

## Decision navigation

1. [ADR-0001: Location visibility and consent](0001-location-visibility-and-consent.md) — public map eligibility, advertisement privacy, revocation and inference boundaries.
2. [ADR-0002: Student advertisement-only contributions](0002-student-advertisement-only-contributions.md) — boarding recommendations, public POI distinction and canonical reuse.
3. [ADR-0003: Property-specific owner authority](0003-property-specific-owner-authority.md) — official fields, server checks and independent trust/freshness.
4. [ADR-0004: Automation-first governance with exceptional escalation](0004-automation-first-governance.md) — low-risk validation, sensitive holds, restricted operators and appeals.
5. [ADR-0005: Registration deferral](0005-registration-deferral.md) — open browsing, local/test-only simulation and final-phase production authorization.

## Scope and source clarifications

- These records describe required behavior. Existing UNI-003 UI display helpers require sanitized public DTOs and are not server authorization/serialization boundaries. No runtime code, auth adapter, DTO/schema, migration, support service or publishing feature is implemented by UNI-004.
- Sections 3.4/5.4/13.2 agree that HIDDEN defaults to no locality. Sections 5.4/13.2 permit a **separately owner-authorized generic city**, not an inferred locality or a default exception. ADR-0001 preserves that distinction; the current UI intentionally omits hidden locality entirely.
- The older Phase 8 wording in §3.9 is read against the explicit [Phase 7 ordering constraint](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#phase-7--final-feature-development-registration-roles-and-owner-authorization-m5-m3-integration) and §11: registration/owner verification is the final feature phase, before Phase 8 release. The closing v2.0 mention does not supersede the document's v3.0 title/end version. The specification itself is preserved.
- For solo work, the user's workflow clarification applies over older mandatory-PR wording: humans perform all Git operations; one branch per UNI issue; verified work enters `dev` by `git merge --ff-only`; PR optional; no merge commits; `main` is for stable releases.

## Verification and progress

Each ADR separates current decision, future implementation consequences and deferred questions, and links its source sections and future acceptance scenarios. UNI-004 checks the documentation, not completion of those future scenarios. See [verification evidence](../verification/UNI-004/README.md), [Phase 0 progress](../progress/PHASE-00.md#uni-004--product-decision-records) and [current status](../progress/CURRENT_STATUS.md). After its separate human branch/checkpoint, UNI-005 implements the [API contract and guarded actor baseline](../api/contracts-and-actors.md). Subsequent issues still require their own human checkpoint.
