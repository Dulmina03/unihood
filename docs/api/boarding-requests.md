# Boarding contact and location requests (local mock)

UNI-046 adds one protected local/test-only workflow for owner-published advertisements:

- `POST /api/v1/boarding-requests` records a synthetic pending request.
- `GET /api/v1/boarding-requests/{requestId}` returns only the requesting contributor's status.

There is no messaging, email, phone reveal, owner notification, location disclosure or publication change. Production and staging fail closed through the existing synthetic actor boundary.

## Input

```json
{
  "requestKey": "46000000-0000-4000-8000-000000000002",
  "boardingId": "71000000-0000-4000-8000-000000000001",
  "kind": "CONTACT_OWNER",
  "syntheticAcknowledged": true
}
```

`kind` is exactly `CONTACT_OWNER` or `REQUEST_LOCATION`. Strict schemas reject phone numbers, emails, coordinates, visibility, ownership claims and any other extension.

## Eligibility

The API rereads current public projection records on every request. It never trusts client eligibility badges and never reads private geometry, contact ciphertext or exact addresses.

- Only `OWNER_OFFICIAL` advertisements with `PUBLISHED`, current listings and local-test authorization are eligible. Community recommendations return `404`.
- `CONTACT_OWNER` records intent only. No owner contact data is returned or stored.
- `REQUEST_LOCATION` is available for `AREA_ONLY` and `HIDDEN` owner advertisements. An already `PUBLIC_MAP` advertisement returns `400` because no private location exists to request.
- Visibility, publication status, fees and vacancies are never updated by a request.

## Receipt and privacy

Receipts expose only `requestId`, `boardingId`, `kind`, `status: MOCK_PENDING`, `policyVersion: boarding-request-mock-v1`, `synthetic`, `ownerNotified: false`, `locationDisclosed: false`, `dataKind: SYNTHETIC`, `createdAt` and `duplicate`. Status responses omit `duplicate`.

The mock never claims an owner was contacted or location access was granted. Stored rows contain only requester reference, boarding id, kind, request key, payload hash, status and timestamps; no free text, phone, email, coordinates or owner identity.

## Idempotency and limits

- Same contributor, request key and intent returns the original receipt with `duplicate: true`.
- Reusing a request key for a different advertisement or kind returns `409`.
- A second request of the same kind for the same advertisement returns the existing receipt instead of creating a row.
- Requests are actor-scoped; another actor cannot read the status.
- The shared local simulator budget is 20 requests per minute (`429` beyond it).

## Deferred

Final authentication, owner verification, consent-aware contact delivery, real notifications and any production contact/location policy remain deferred to the final authentication/contact-policy phase.
