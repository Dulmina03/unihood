# ADR-0001: Location visibility and consent

Date: 16 November 2026 (Asia/Colombo). Issue: UNI-004. Status: accepted in specification v3.0; recorded here. Implementation is distributed across future M1/M2/M3/M5 work; this ADR does not assert those controls already exist.

## Context

Boarding discovery must remain useful without exposing a residence. A canonical boarding, advertisement, physical building and account are different entities; changing an owner's publication preference must not create another property. Knowing an address, verifying an account or privately reviewing property evidence does not authorize public location disclosure.

## Decision

- Default to **HIDDEN** and no public location disclosure. Public map publication requires a verified, property-authorized owner/manager, an explicitly selected public entrance and explicit map consent.
- **PUBLIC_MAP** permits that consented entrance in an owner map listing and advertisement. Exact walking routes/proximity are eligible only for this mode, using real provider results; unavailable routes remain unavailable. It is not permission to disclose all privately held property data.
- **AREA_ONLY** permits only an owner-approved broad locality label. No exact coordinate, geohash, marker, entrance hint, precise route/distance, reverse lookup or proximity ordering. Do not replace the coordinate with a random or blurred residential pin. A broad area polygon is only a later option if owner-selected and its privacy risk is reviewed; no polygon approach is selected here.
- **HIDDEN** exposes no exact address/geometry, locality, spatial ordering, distance, map pin or route. A generic city is permitted only through the separately explicit owner authorization described in §§5.4/13.2, never by inference or default. No city-sharing control or exception is implemented in this issue.
- Visibility changes preserve the same canonical boarding ID and contribution history. Revocation removes public points and promptly invalidates spatial/search indexes, routes, public caches and share previews. Before consent, explain that external screenshots or third-party copies may not be retractable.
- Contact disclosure has its own verified, owner-approved consent boundary; selecting map visibility does not authorize contact publication. Community advertisements cannot qualify for PUBLIC_MAP through community permissions; see [ADR-0002](0002-student-advertisement-only-contributions.md).

## Rationale and alternatives

A map-required model excludes privacy-conscious owners. UI-only hiding leaves coordinates in payloads. Blurred pins and computed distances can reveal the residence. Separate publication modes and server-side public projection support discovery while preserving meaningful owner choice; they also avoid duplicated identities when an owner changes visibility.

## Consequences

Future public queries/serializers must select only eligible public fields and geometry; private verification locations belong in restricted storage without a public serializer. Discovery may show advertisements without spatial ranking, routes or location-based neighborhood metrics. Cache invalidation and consent state must be treated as publication correctness, not cosmetic UI updates. Detailed revocation infrastructure remains future implementation work.

## Privacy and security boundaries

Apply the policy to list/detail/map/search/routes/essentials responses, nested DTOs, client props and bundles, vector tiles/features, QR/deep links, autocomplete, SEO/HTML/share metadata, image EXIF/thumbnails, errors, logs, analytics, caches and cache keys. Do not infer hidden coordinates via comparison scores, sorting or route endpoints. Strip GPS metadata from media. Public client masking is not redaction: private data must be removed before serialization. Private access and consent changes require the property permission boundary in [ADR-0003](0003-property-specific-owner-authority.md).

## Deferred questions

Exact cache invalidation mechanisms and operational revocation targets, broad-area privacy thresholds, any separately authorized city UI, private evidence retention and safe contact/location-request mechanisms need later technical/privacy review. No mandatory private coordinate collection, external map provider or legal compliance conclusion is chosen here. None of these open details relaxes the no-leak default.

## Validation obligations

Future tests cover every public surface under all visibility modes, unauthorized location publication, and PUBLIC_MAP → HIDDEN revocation including caches/share data while preserving canonical identity. Inspect network/metadata/media as well as DOM. These are obligations, **not tests executed by UNI-004**; E2E-03/04/10/16/18 are traceability targets.

## Specification references

- [§0.2 agreed decisions 3–5/7](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#02-agreed-product-decisions-do-not-silently-reverse)
- [§3.4 owner publication/consent](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#34-workflow-w-03--owner-publishes-map-or-advertisement)
- [§5.1 canonical modeling](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#51-modeling-rules) and [§5.4 spatial privacy](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#54-spatial-privacy-requirements-must-pass-tests)
- [§7.3 public serialization](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#73-api-response-rules)
- [§13.2 privacy matrix](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#132-required-privacy-matrix) and [§13.3 E2E scenarios](../../UniHood_MASTER_PROJECT_SPECIFICATION.md#133-golden-e2e-scenarios-and-expected-results)
