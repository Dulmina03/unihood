# Synthetic public-service proposals — UNI-026

Specification §3.6/W05, UI-17, §6.1 transactional recheck, §7.2 contributing-actor writes and §10 UNI-026; preserves [all five ADRs](../decisions/README.md). Depends on UNI-020–025. This is an explicitly synthetic local/test path, not a production contribution or moderation administration service.

## Run the demonstration

After the normal [local setup](../../README.md), keep Docker running and migrate normally (migration 006 is additive). Never delete a volume/reset the database to enable this form. Repeatable seed tooling adds the eleven public-service category codes; the existing four synthetic public place IDs/coordinates are unchanged.

```sh
pnpm db:up
pnpm db:migrate
APP_ENV=local pnpm db:seed
APP_ENV=local NODE_ENV=development API_HOST=127.0.0.1 WEB_PORT=3000 \
ENABLE_SYNTHETIC_ACTORS=true SYNTHETIC_ACTOR=contributor pnpm dev
```

Open `http://127.0.0.1:3000/contribute/place`. Select **Use synthetic draft example**, explicitly confirm it describes a fictional public business, then check possible matches. Choose a current existing public record or propose a distinct business with a 15–500 character explanation. Submit produces a held receipt, existing-public-record link or generic further-review state; it never publishes a map listing or sends a correction to an existing record. Pending receipt IDs are not public place URLs.

Names must begin with `Synthetic`; `(0,0)` and other fixture points are fictional, not destinations to visit. Do not enter residences, real contacts, boarding locations, owner assertions or live inventory. For a configured `MAP_PROVIDER=openfreemap` the optional map loads only after explicit consent to send the viewed draft area to the provider. Existing [provider configuration/licensing](../ui/maps.md) applies; coordinate fields and four adjustment buttons work without a map. No geolocation or geocoding. WebGL, context-loss, network failure, timeout and Mercator-limit fallback preserve the draft. MapLibre workers/listeners/observer/marker are cleaned up on close, retry, unsupported latitude and navigation.

Unsent data lives only in component memory; reload clears it. No source, point, reason or receipt is written to localStorage, cookies or share URLs. Submitted records persist privately in the local/test database. Clearing/editing browser fields cannot cancel a request the server already received. Browser requests go directly to the validated HTTP loopback API, omit credentials and follow no redirects; a public proxy cannot grant synthetic authority.

## REST boundary

`POST /api/v1/places/proposals`, no-store, HTTP 200 for the result union. See [generated OpenAPI](openapi.json) and shared `PublicPoiProposalInputSchema`/`PublicPoiProposalResultSchema`.

- Strict request: UUID idempotency key; public POI draft (Synthetic-prefixed name, category, bounded entrance point); current-public-candidate `suggest_update` or `continue_as_distinct_with_reason`; bounded source/observation note; literal `publicBusinessConfirmed:true`.
- Client actor IDs, review/publication states, provider source identifiers, boarding kinds, owner authority, media and unknown fields are rejected. No arbitrary identity header grants authority. The server resolves and verifies its issued synthetic contributor before the transaction/cache.
- Only explicitly enabled local/test actor environments with loopback socket/origin and no forwarding qualify. Staging, production, unknown environments, disabled adapters, guests and cross-site requests fail closed. This is not final authentication.
- Shared duplicate/proposal limiter: 20 authorized attempts/minute/process, up to three active calls per controller. Separate controllers may each have three active operations, sharing the same fixed-window attempt budget. This bounded simulator is not distributed production abuse protection.
- 400 invalid input; 401/403 authority denial; 409 changed-key payload/category/candidate conflict; 429 wait and retry; 503 unavailable with sanitized error. Unknown exceptions remain sanitized. No draft text/source/private exception is logged or reflected by this implementation.

The [UNI-025 transaction](../architecture/poi-submission-transactions.md) rechecks canonical and pending candidates after taking its advisory lock and before saving. Same actor/key/body replays the receipt; altered validated payload conflicts. Metadata and receipt are committed atomically. A source/pending collision or incomplete matcher returns only `REVIEW_REQUIRED`, never another contributor's ID or point. Existing public records remain subject to current visibility checks even on cached replay. No automatic merge or source promotion.

## Server-assigned review states

`PENDING` and `NEEDS_EVIDENCE` are both private holds. Conservative English residence/ownership terms, contact-like text and external links set evidence risk flags. An absence of flags does not certify safe text, multilingual screening, real-world evidence or permission to publish. Risk flags and source notes are not returned publicly. Existing pre-006 held records receive default PENDING metadata, never approval. Database consistency checks reject unknown/publication states and inconsistent flags. Validation rejection and retryable transport errors are separate from persisted review states.

There is no approval/rejection dashboard, publication transition, media pipeline, evidence follow-up endpoint, owner verification or final registration. Those remain in their specified phases. Source notes may require review even when rejected by the UI guidance; all proposals are held and excluded from public list/map/detail APIs. Development data still requires care; no claim of a complete future free-text moderation system is made.

Migration 006 preserves rows and extension ownership. Down refuses non-default review/source metadata; RESTRICT prevents dependent-object loss, with atomic migration/history rollback. Use a reviewed forward migration if data exists. Never use CASCADE.

## Verification boundaries

[UNI-026 verification](../verification/UNI-026/README.md) separates mocked browser fixtures, real guarded API/PostGIS checks and real production Next/Nest/tmpfs E2E. Draft-map browser resources are repository-authored synthetic geometry, not a live-provider service certification. New human visual, screen-reader and physical-device acceptance are not inferred from axe/screenshots. The Phase 1 detailed manual accessibility carry-over remains deferred to Phase 6, not PASS.
