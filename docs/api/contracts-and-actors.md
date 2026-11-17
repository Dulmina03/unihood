# UNI-005 — REST contracts, OpenAPI and local actors

This is the Phase 0 contract/authorization seam, not final authentication or an implementation of boarding, contribution, claim or other domain workflows. The [five product ADRs](../decisions/README.md) and specification §§5.3–5.4, 7.3–7.5 and 11.3 govern these boundaries. UNI-004 was committed and merged into dev by the human developer, as explicitly confirmed by the human; no Git history was inspected.

## Shared contracts

`packages/contracts` exports Zod schemas and inferred TypeScript types. Existing health/readiness exports and actor interfaces remain compatible. Eight required enum families are centralized: PlaceKind, BoardingVisibility, PublisherKind, PublicationStatus, VacancyStatus, SourceConfidence, SubmissionRisk and RouteTimeContext, each with a `*Schema` export. ActorContext, IdentityProvider and PermissionService remain provider-neutral interfaces, not public API request/response models.

The REST foundation includes strict public UUIDs, bounded query/pagination, generic errors and five public boarding projections. No domain endpoint is introduced just because its schema is available. Public response projections are not owner-write request contracts; never accept their self-asserted verification/consent fields as authority. Full domain DTOs/queries grow with their owning issue rather than claiming the proposed endpoint list already works.

- `PaginationQuerySchema`: HTTP strings; page 1–9,999,999, pageSize 1–100, sort newest/title and trimmed q 1–120 characters. Unknown keys, arrays, booleans, scientific notation, leading zeroes, distance sorting and nested filters fail. `parsePaginationQuery` returns numeric page/pageSize with defaults 1/20 and newest sorting. Future domain-specific filters need explicit schemas. `paginatedSchema` wraps items/page metadata with hasNextPage, at most 100 items and no more items than pageSize; it exposes no guessed or privacy-sensitive total.
- `ErrorResponseSchema`: `{error:{code,message,details,requestId}}`. Generic HTTP error messages and enumerated public field/reason details never echo submitted values, unknown keys, exception messages, SQL text, request URLs or stack traces. The server creates a UUID correlation ID and sets X-Request-Id; inbound IDs are ignored. Error responses use no-store. Existing readiness retains its separate flat 200/503 monitoring protocol, accurately documented with ReadyResponse/NotReadyResponse schemas. It is the explicit compatibility exception, not a generic REST exception envelope.
- `ContractValidationPipe` applies a shared schema to a controller argument and reports sanitized 400 VALIDATION_FAILED details. Future handlers must explicitly select the correct body/query/param schema; the pipe is not blanket domain validation and is not installed on nonexistent domain routes.

## Public boarding projection and privacy

`PublicBoardingResponseSchema` is a strict union of owner PUBLIC_MAP, owner AREA_ONLY, owner HIDDEN, community AREA_ONLY and community HIDDEN. Every nested object is strict. Geometry is available only for a verified owner-public projection with explicit true map consent and valid coordinate bounds. Private/area/community variants require null entrance, route and distance; hidden locality is null. The separately authorized generic-city exception remains future work; it is not inferred or implemented here. Community official price is null, vacancy unknown, and its disclaimer cannot claim owner verification. Community source cannot carry owner verification/consent fields. Official owner price is finite/nonnegative LKR or null, independently of location visibility.

Use `parsePublicBoardingResponse(deliberatelyBuiltPublicProjection, now)` at a future serialization boundary: it rejects extra/private fields and normalizes stale/future owner confirmations to UNKNOWN with null timestamps. Confirmed AVAILABLE/FULL requires valid timestamps and expiry after confirmation. Plain schema `.parse` checks structure/intervals; it does not apply current-clock freshness. Never serialize an unchecked object after calling safeParse or spread private entity fields into a response. No public endpoint uses this boarding contract yet.

These schemas are not a private-data scrubber or consent/ownership proof. They cannot detect an address/phone hidden in title/locality text; source queries, permission checks, moderation, EXIF stripping and media/contact consent remain future owning-module responsibilities. Contacts, media URLs, private evidence, route metrics and raw domain entities are intentionally absent. They must not be passed to client props. Schema validation alone cannot prove private geometry was not used for sorting, logs, caches or inference. Existing UNI-003 display helpers are unchanged and still require sanitized input.

## Synthetic identity and permissions

Nest binds IDENTITY_PROVIDER and PERMISSION_SERVICE tokens to one SyntheticActors instance through the existing shared interfaces. The global ProtectedBoundaryGuard leaves ordinary GET/HEAD/OPTIONS reads open, while protected reads use metadata and every mutation fails unless explicitly annotated and authorized. Future GET handlers must remain side-effect free. No product mutation or actor introspection endpoint was added. Unknown domain routes remain 404; the following 401/403 behavior is tested with test-module-only fixture controllers.

All of these conditions must hold to issue a synthetic actor:

1. ENABLE_SYNTHETIC_ACTORS is exactly `true`.
2. APP_ENV=local with NODE_ENV unset/development, or APP_ENV=test with NODE_ENV=test. Unknown/missing APP_ENV, staging, production and NODE_ENV=production cannot enable it.
3. API_HOST is unset (defaults 127.0.0.1), exactly 127.0.0.1 or ::1. Public/wildcard/nonliteral bindings disable synthetic grants.
4. Actual peer and local socket addresses are loopback, Host is a literal loopback/localhost name, any Origin is loopback, and forwarded/proxy headers or cross-site browser requests are absent. Never expose this local server via public proxies/tunnels. Origin/host checks are additional development safeguards, not production authentication.
5. SYNTHETIC_ACTOR is one of the server-configured fixtures below. A request header, body or cookie never selects an actor. X-User-Id/X-Role grant no authority; proxy IP headers are never trusted as evidence of loopback.

Fixtures: contributor (suggestions only), owner-a (suggestions and four property permissions for A), price-manager-a (suggestions plus manage/set-price for A). Blank/unknown selects guest. A is synthetic UUID `00000000-0000-4000-8000-000000000001`; B is `00000000-0000-4000-8000-000000000002`, deliberately ungranted. These are not real properties/users. `.env.example` keeps enablement false and fixture blank; existing `.env` is preserved.

Permission methods honor private per-instance issuance records, not caller-created ActorContext data. Cloning an issued actor, editing its membership list, supplying VERIFIED_ACCOUNT or handing it to another adapter instance does not create new privileges. Owner-a cannot manage B. A limited price manager cannot publish map geometry or confirm vacancy. Actual consent must additionally be checked by the future publication workflow; canPublishExactBoardingLocation is a capability check, not consent to publish. No real owner membership/proof, delegation, recovery or revocation flow is implemented. Deployed environments return guest/no grants and deny protected actions even if synthetic flags or identity headers are supplied.

## OpenAPI baseline and reproduction

GET `/api/v1/openapi.json` is public and generated from registered Nest controller route metadata and ApiContract response metadata. Generation fails when a routed handler lacks contract metadata. Components are generated from the same Zod definitions using native JSON Schema conversion. UNI-005 originally exposed five GET paths: both health aliases, both readiness aliases and OpenAPI itself. UNI-010 now adds three [university/campus/entrance GET paths](universities.md), for eight paths, with query schemas and UUID path parameters generated from live route/shared contract metadata. No login, /me, claim, contribution, boarding or fake test endpoint is advertised. Since all current operations are public, there is no invented bearer authentication scheme.

`docs/api/openapi.json` is the exported baseline. After rebuilding, regenerate it from repository root:

```sh
pnpm build
node apps/api/dist/export-openapi.js > docs/api/openapi.json
pnpm test
```

The exporter starts an application context without listening, writes JSON to stdout and closes it; it does not migrate, seed or query a database. The HTTP test compares the live document with the saved artifact and resolves all component references. Zod refinements (current-time freshness, confirmation interval and page-size consistency) require runtime validation beyond JSON Schema; they are not falsely represented as enforceable cross-field OpenAPI rules. No Swagger UI/dependency, new provider or paid service is needed.

Compatibility references: [Zod native JSON Schema](https://zod.dev/json-schema), [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0.html), [official OpenAPI 3.1 validation schema](https://spec.openapis.org/oas/3.1/schema/2022-10-07). Native conversion targets draft 2020-12 and throws on unrepresentable structures rather than silently replacing them with unconstrained schemas. See [verification](../verification/UNI-005/README.md) for actual checks and limitations. UNI-006 integration and remote CI are now human-confirmed (run URL/commit SHA not supplied); Phase 7 registration remains deferred. UNI-010 has its own human checkpoint.

UNI-026 registers strict `PublicPoiProposalInput` and `PublicPoiProposalResult` contracts and the actual guarded `POST /api/v1/places/proposals` operation. It accepts only explicitly synthetic local/test contributors, not arbitrary body/header identities or deployed users. Both pending/evidence receipt states are private holds; no canonical publication or owner authority is granted. [Wire behavior and limitations](poi-proposals.md).

UNI-030 adds `PublicBoardingListing` and `PublicBoardingListingPage` response components, preserving the five existing privacy/publisher variants. `id` is the canonical property UUID; `listingId` identifies its separate advertisement revision. Public provenance labels synthetic data explicitly. Use `parsePublicBoardingListing` for current-clock vacancy normalization; plain schema parsing does not establish freshness, consent, ownership or content safety. The internal unit model and private location/building/media storage are excluded from public OpenAPI. No boarding REST endpoint or protected write is implemented by these components. [Foundation and remaining enforcement](../architecture/boarding-privacy.md).
