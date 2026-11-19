# Public pedestrian routes — UNI-051

See [routing provider boundary](../architecture/routing-provider.md), [visibility rules](boarding-visibility.md), [universities and gates](universities.md), [OpenAPI](openapi.json) and [actual verification](../verification/UNI-051/README.md).

## Endpoint

`GET /api/v1/routes` returns pedestrian routing between one eligible public campus gate and one eligible owner-selected public boarding entrance.

| Query | Required | Values | Notes |
|---|---|---|---|
| `gateId` | yes | UUID | Campus entrance identifier from `/api/v1/universities/{id}/entrances`. |
| `boardingId` | yes | UUID | Boarding canonical place identifier. |
| `timeContext` | yes | `DAY` or `NIGHT` | Existing `RouteTimeContext` enum. |
| `includeAlternatives` | no | wire string `true` or `false` | Defaults to `true`; the provider caps options at three. |

Unknown, repeated or malformed parameters return the existing redacted `400 VALIDATION_FAILED` envelope. The endpoint accepts no coordinates, provider identifier, provider URL, credential, timeout or other provider configuration. Both endpoint locations are resolved on the server. Responses are `Cache-Control: no-store`, `security: []` and carry the standard `X-Request-Id`.

`includeAlternatives` is parsed as a wire string like every other public query contract; `true`/absent requests all available options and `false` requests the single primary option.

## Eligibility

Both endpoints must be eligible in one bounded read before the provider is invoked. Denial returns the same generic `404 NOT_FOUND` body for every privacy or publication predicate, so the response never discloses which rule failed.

Gate: the requested `campus_entrances` row, its `campuses` parent and its `universities` parent must each be `ACTIVE`. Each level must also be `data_kind='VERIFIED'` unless synthetic data is enabled, mirroring `UniversityService` visibility exactly. Only the public campus-entrance point (`campus_entrances.geo`) is used.

Boarding entrance: the strict public-map policy from `/boardings/map` is mirrored verbatim — active non-merged `BOARDING` place, synthetic place/property/preview provenance, `visibility='PUBLIC_MAP'`, `authorization_status='LOCAL_TEST_AUTHORIZED'`, explicit `public_map_consent`, `map_consent_at = entrance.consent_at`, `OWNER_OFFICIAL` `PUBLISHED` current listing, `visibility_snapshot='PUBLIC_MAP'`, `PUBLIC_MAP` advertisement preview and `purpose='OWNER_SELECTED_PUBLIC_ENTRANCE'`. The weaker comparison and nearby-essentials queries are deliberately not used.

Only `boarding_public_entrances.entrance_geo` becomes the destination. `unihood_private.boarding_locations`, encrypted addresses and any exact or verification geometry are never queried or serialized. No same-campus or nearest-campus rule is invented: any eligible gate and eligible boarding pair is allowed, and the provider decides whether a route exists.

The provider is called only after both endpoints resolve; a denial performs no provider call and no route result is persisted.

## Response

`200` is returned for provider-domain answers only and uses `PublicRouteResponse`, an explicit projection:

```json
{
  "gateId": "30000000-0000-4000-8000-000000000001",
  "boardingId": "00000000-0000-4000-8000-000000000001",
  "timeContext": "DAY",
  "status": "AVAILABLE",
  "sourceVersion": "uni-050-synthetic-routes-v1",
  "options": [
    {
      "routeId": "synthetic-primary-day-a",
      "label": "Synthetic daytime option A",
      "geometry": {"type": "LineString", "coordinates": [[0, 0], [0.0002, 0.0002], [0.0008, 0.0006]]},
      "distanceMeters": 112,
      "durationSeconds": 95,
      "provenance": {
        "dataKind": "SYNTHETIC",
        "provider": "LOCAL_FIXTURE",
        "sourceVersion": "uni-050-synthetic-routes-v1",
        "sourceLabel": "UNI-050 synthetic routing fixture; fictional coordinates, distances and times; not a real route, place or safety assessment",
        "verifiedAt": null
      }
    }
  ]
}
```

Unavailable returns `{"gateId","boardingId","timeContext","status":"UNAVAILABLE","reason"}` with `reason` limited to `NO_ROUTE` or `UNSUPPORTED_TIME_CONTEXT`. Unavailable payloads contain no geometry, distance, duration, options or source version.

The response never includes separate `origin`/`destination` coordinate objects, private or verification coordinates, encrypted addresses, actor references, consent/revision internals, listing descriptions, unrelated database identifiers, raw provider errors or any safety claim. Provenance stays synthetic with `verifiedAt: null`; no verification timestamp is invented and no route is labelled safe, safest or guaranteed.

## Error mapping

| Outcome | HTTP | Body |
|---|---|---|
| `AVAILABLE` | 200 | `PublicRouteResponse` with one to three options |
| `NO_ROUTE`, `UNSUPPORTED_TIME_CONTEXT` | 200 | typed `UNAVAILABLE` with that reason |
| unknown or ineligible gate/boarding | 404 | generic `NOT_FOUND` |
| `PROVIDER_DISABLED`, `TIMEOUT`, `PROVIDER_ERROR`, `INVALID_RESPONSE` | 503 | redacted `SERVICE_UNAVAILABLE` |
| `CANCELLED` or client disconnect | none | no response attempt; the request ends silently |
| malformed query | 400 | `VALIDATION_FAILED` |
| database failure or timeout | 503 | `SERVICE_UNAVAILABLE` |

A disconnected client is handled at the response `close` signal: the provider context is cancelled, no fabricated or partial route is returned, and no response is written — a cancelled request ends silently instead of producing a 503 body. Operational failures never expose raw exceptions, SQL details, coordinates, credentials or diagnostics.

`FEATURE_NOT_AVAILABLE` remains available in the shared error contract but is not emitted here; using it would require a shared exception-filter change outside this issue.

## Provenance and limitations

`ROUTING_PROVIDER` defaults to `disabled` in `.env.example`; `local-fixture` is accepted only in explicit loopback `APP_ENV=local`/`test` configuration. This issue adds no live provider, credential, quota or network access. Synthetic fixtures are the only implemented source, and every option is labelled fictional and not a safety assessment.

Current boarding publication is synthetic-only: `boarding_properties` requires `LOCAL_TEST_AUTHORIZED`, which the schema restricts to synthetic properties, and every public boarding query requires synthetic provenance. There is no verified boarding publication path yet. Deployed environments therefore return 404 for all boarding destinations until a legitimate publication path exists (Phase 7). That is an existing product/data limitation, not permission to weaken eligibility.

No gateway campus-to-boarding relationship, distance inference, private-location fallback, route persistence, route table, migration, rate limiter or verified publication authority is introduced. `public.route_segments` remains untouched.

## Deferred integration

- Route-read rate limiting is deferred to **UNI-062** with the rest of API validation/rate-limit hardening. No new limiter is added here.
- The Next.js same-origin proxy and any route card or `/routes` screen are deferred to the appropriate UI work (**UNI-054** route card design). This issue is API-only.
- Structured segments, day/night observations and confidence labels are **UNI-053**.

## Synthetic fixtures covered

| Gate | Boarding | Context | Result |
|---|---|---|---|
| `30000000-0000-4000-8000-000000000001` | `00000000-0000-4000-8000-000000000001` | `DAY` | available, two options |
| same | same | `NIGHT` | available, one option |
| `30000000-0000-4000-8000-000000000002` | `00000000-0000-4000-8000-000000000001` | `DAY` | `UNAVAILABLE / NO_ROUTE` |

Coordinates, distances and durations are fictional world-origin fixture values, not a real route or place and not a safety assessment.
