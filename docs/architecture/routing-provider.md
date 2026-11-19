# Pedestrian routing provider boundary

UNI-050 adds a provider-neutral pedestrian routing adapter and deterministic synthetic fixtures. It does not add a public `/api/v1/routes` endpoint, a route UI, route-condition reporting, or any route database table. Public route integration belongs to UNI-051; structured condition observations belong to UNI-053.

## Boundary

`PedestrianRoutingProvider` accepts a request whose origin and destination have already been resolved by a trusted internal caller. The provider is **not** an authorization or privacy boundary. It cannot establish whether a boarding is `PUBLIC_MAP`, whether public-map consent exists, whether the property is active, or whether the caller is authorized. Those checks must happen before provider invocation in UNI-051.

The provider request contains public IDs and resolved coordinates. No public interface accepts client-supplied coordinates, provider URLs, provider names, credentials, or arbitrary origin/destination points.

## Provider selection

`ROUTING_PROVIDER` defaults to `disabled` in `.env.example`. The only implemented kind is `local-fixture`, and it is accepted only when:

- `APP_ENV=local` and `NODE_ENV` is absent or `development`; or
- `APP_ENV=test` and `NODE_ENV=test`;
- `API_HOST` is a loopback address.

All other configurations resolve to `DisabledRoutingProvider`. No external provider URL, credential, quota, or live routing call is introduced.

## Deterministic fixtures

`apps/api/src/routing/fixtures/synthetic-routes.v1.json` is parsed with a strict schema at provider construction. Lookup is by the exact `gateId + boardingId + timeContext` key. Missing keys and explicitly unavailable cases return `UNAVAILABLE / NO_ROUTE`; the provider never interpolates, calculates a straight-line substitute, returns a nearest match, or invents metrics.

Every available option carries `SYNTHETIC` provenance with the fixture version and a label that says it is fictional and not a safety assessment. Route geometry is GeoJSON `LineString` with bounded coordinates. Distance and duration must be positive bounded integers. Unavailable results contain no geometry, distance, duration, or partial option array.

Duplicate case keys, duplicate route IDs within a case, malformed geometry, invalid metrics, and non-synthetic labels fail fixture validation.

## Failure handling

`BoundedRoutingProvider` applies the timeout policy at the provider execution boundary. Provider exceptions become `PROVIDER_ERROR`; cancellation becomes `CANCELLED`; timeout becomes `TIMEOUT`; malformed successful responses become `INVALID_RESPONSE`. Raw provider errors, stack traces, SQL details, and coordinates are not included in results. The local fixture provider performs no external request and adds no artificial delay.

## Future live provider checklist

Before a live provider is enabled, the project must review:

- provider licensing, attribution, usage quota, and privacy terms;
- whether the provider accepts only the minimum public coordinates;
- timeout/retry/cancellation behavior and rate limits;
- response normalization, provenance, and uncertainty labels;
- cache behavior and revocation invalidation;
- no route-safety guarantee or objective safety score;
- tests proving private/area-only/hidden boardings are rejected before invocation.

No live provider or production credential is selected by UNI-050.
