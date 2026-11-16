# ADR-0002: Student advertisement-only contributions

Date: 16 November 2026 (Asia/Colombo). Issue: UNI-004. Status: accepted in specification v3.0; recorded here. Future M3/M4 contributions and M2 duplicate checks implement the decision; no contribution endpoint/form is added here.

## Context

Students and other community members know about boardings that owners have not listed. That knowledge is useful, but cannot establish authority to disclose a residence or publish official prices, availability or contact. Several recommendations may refer to one boarding, while several different properties may share a building.

## Decision

- The student/community boarding workflow is **Recommend Boarding**, producing a clearly labeled `COMMUNITY_RECOMMENDATION` advertisement. It never offers or requires an exact boarding coordinate/pin and never publishes one through community permissions, even if the contributor knows the address.
- Permitted content includes a title, privacy-checked description, permitted general locality, allowed consented media, facilities and context. Hold sensitive content; warn against private phone/address disclosure and unconsented interior photos; strip media GPS metadata.
- A community recommendation cannot publish or overwrite official rent, deposits, vacancy, owner-verification status or verified owner contact. Availability is unknown without an eligible owner confirmation; no guessed price is substituted. Preserve source and freshness separately from property ownership.
- Search for existing canonical properties, ads and pending submissions before creation, then recheck on the server with concurrency/idempotency safeguards. Use locality, names and authorized privacy-safe evidence; never infer/publish hidden geometry. Attach contributions or suggest corrections to a match while preserving attribution/history. Ambiguity stays pending; no destructive fuzzy-score merge.
- A later authorized owner claim reuses the same canonical boarding, subject to [ADR-0003](0003-property-specific-owner-authority.md) and [ADR-0005](0005-registration-deferral.md). It does not automatically turn the original community statement into verified owner information.
- Public POI proposals (pharmacies, food, transport and other public services) are a separate permitted contribution path with public-location, duplicate, media and abuse checks. This exception for public POIs never authorizes a residential boarding pin.
- A student who also becomes an authorized manager uses that property's explicit **owner** publication flow; student/community status itself grants no owner permission.

## Rationale and alternatives

Allowing student boarding pins would bypass residential consent. Prohibiting all community recommendations would discard useful discovery information. Accepting official rent/vacancy as crowdsourced facts would misrepresent authority and freshness. Advertisement-only recommendations retain community value without impersonating owners.

## Consequences

Future forms, API validation and public serializers must enforce publisher-specific allowed fields, not simply remove map buttons. Recommendations may remain unverified or await evidence; they are still useful in the ad experience. Shared canonical identity enables a later claim without discarding contributions or creating duplicates. A public POI downstairs and a boarding upstairs remain distinct real places.

## Privacy and security boundaries

Reject protected fields and forged owner/source claims server-side. Duplicate match responses must not expose hidden coordinates, private contacts, internal fingerprints or evidence files. Free text, photos, captions, EXIF, links, error responses and share metadata must be checked for residential disclosure; structured-field omission alone is insufficient. Do not treat private uploaded evidence as public listing media. [ADR-0001](0001-location-visibility-and-consent.md) governs public location projection; [ADR-0004](0004-automation-first-governance.md) governs sensitive holds and appeals. Anonymous deployed contribution writes remain denied until final authorization; no public header can simulate an actor.

## Deferred questions

Duplicate thresholds, allowed-media operational rules, independent confirmation signals and abuse limits need later implementation/calibration. Account methods, student verification, owner claim proof and evidence retention remain final-phase questions. The label “student” is not proof of enrollment. This ADR does not finalize guest contribution account policy beyond the current permission matrix and deny-before-auth boundary.

## Validation obligations

Future tests deny community exact pins, official fields and spoofed owner claims; exercise sensitive media/private-text holds, duplicate/concurrent recommendations, same-building distinct properties and later canonical claim reuse. E2E-05/11/12/16/17 are targets, **not UNI-004 executed workflows**.

## Specification references

- [§0.2 decisions 2/6/7](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#02-agreed-product-decisions-do-not-silently-reverse)
- [§2.2 permissions](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#22-non-negotiable-permission-matrix) and [§2.3 labels](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#23-trust-and-publication-labels)
- [§3.3 boarding recommendation](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#33-workflow-w-02--student-submits-boarding-recommendation-ad-only) and [§3.6 public POIs](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#36-workflow-w-05--contribute-a-public-essential-service)
- [§6.1 duplicate matching](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#61-mandatory-match-process)
- [§8.7 M4 acceptance](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#87-module-m4-deliverables-and-acceptance) and [§13.3 E2E scenarios](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#133-golden-e2e-scenarios-and-expected-results)
