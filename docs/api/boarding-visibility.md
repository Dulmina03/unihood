# Boarding visibility projection and owner preview — UNI-033

Implements specification §3.4, §4.8 UI-22, §5.4, §7.3/7.5 and exact §10 UNI-033, preserving [all five ADRs](../decisions/README.md). Depends on UNI-030 immutable property/visibility constraints, UNI-031 curated advertisements and UNI-032 guarded synthetic owner wizard. Public map endpoints/publication/revocation remain UNI-034; fee/vacancy/media/contact and final property proof remain later issues.

## Server visibility rules

`projectBoardingPublic` is a server-only whitelist, not a raw entity serializer or a free-text moderation service. It accepts current server policy and curated approved public text. It constructs each field explicitly; private fields, official price/vacancy inputs and arbitrary extras are never spread. HIDDEN emits null locality/entrance/distance/route, without inspecting any location. AREA_ONLY requires true locality consent and a selected broad label, emits null geometry/distance/route, and never reads a location. Community PUBLIC_MAP is denied. Owner variants require current LOCAL_TEST_AUTHORIZED metadata on synthetic data; real-data/production boarding publication is unavailable. Owner PUBLIC_MAP additionally requires true map consent and an explicitly selected public-entrance purpose bound to the same canonical property ID, with bounded coordinates; no verification/private-point fallback exists. Public mode emits only the selected entrance; no unsupported route/time/distance is manufactured. Price remains null and vacancy UNKNOWN until their owning issues.

Existing advertisement GETs retain their narrower synthetic AREA_ONLY/HIDDEN contracts and query rules. SQL still checks canonical ACTIVE/nonmerged BOARDING identity, current PUBLISHED revision, matching visibility and current consented locality, and never selects private geometry, raw text, media or inventory. Separate internal policy facts are passed to the shared projector; a public `ownerVerified` badge is not used as authority. Internal policy is never a response field. Production/staging continue excluding all synthetic previews. No map/search/cache capability is silently enabled.

## Protected synthetic owner preview

`POST /api/v1/owner/boardings/{boardingId}/visibility-preview`, JSON, no-store. Existing IdentityProvider/PermissionService/global guard require an issued local/test actor and management permission for that exact property. Requested PUBLIC_MAP also checks the separate exact-location capability. Guests, contributors, unrelated properties, remote/proxied requests and staging/production fail closed despite flags or identity headers. Only existing fictional property A is granted by the adapter; no new membership or real owner proof is added. Browser talks directly to the loopback API with credential omission, bounded timeout/abort and narrow configured loopback CORS; no public proxy promotes a request into a local actor.

Strict input variants:

- HIDDEN: `{ "visibility": "HIDDEN" }` only.
- AREA_ONLY: visibility and one explicitly fictional broad locality (`Synthetic North Quarter` or `Synthetic Garden District`). No point/address/contact fields.
- PUBLIC_MAP: visibility, `entranceFixture: "synthetic-courtyard-entrance"`, `publicMapConsent: true`, `externalCopiesAcknowledged: true`. No arbitrary coordinate, private-property ID or client verification claim.

Response is `{outcome:"PREVIEW_ONLY",published:false,provenance,preview}`. `preview` is derived by the server through the same public projection, not hidden by frontend masking. The response contract narrows it to owner-only synthetic template text, null price and UNKNOWN vacancy; unexpected community/unreviewed/official-inventory payloads are rejected. Provenance explicitly labels the template synthetic without encoding coordinates into private-mode metadata. Only public mode includes its selected fictional `(0,0)` entrance. The inherited owner DTO flag describes synthetic adapter authority; UI explicitly says it is not real owner verification. No canonical record, listing, publication, media/contact approval or database write occurs. Switching preview modes retains the same fictional adapter property identity. This pure operation needs no idempotency key because it has no persistent side effect.

Unreviewed wizard text is not promoted by consent or schema validity. The public preview deliberately uses a fixed curated fictional title; it is labelled as a template. Real content moderation/publication and identity/property proof are separate gates, not implemented by this preview.

## UI, state and local demo

Follow [UNI-032 local owner setup](../ui/owner-wizard.md#local-synthetic-demo), then select Location privacy in `/owner/new`. Hidden is default. Preview each private mode; Public map requires a deliberate fixture selection and both acknowledgements before a request. It warns that external copies of future public locations may not be retractable. The preview has keyboard-labelled fields, post-commit focus, busy/error/retry/clear states and responsive reflow.

Changing mode/locality unmounts the previous preview, aborts its request and clears its result before any new response. Changing the selected fictional entrance clears both acknowledgements, so consent is not carried onto another selection. A late public response cannot reappear after choosing Hidden. Client validation rejects wrong-property/mode/publisher/locality or extra/private fields. No preview/point/consent is saved in sessionStorage/localStorage, URLs, SEO or public share links. UNI-032 basic draft saving still records only a **planned** mode and synthetic basic fields; restoring it is not consent or publication. HTTP/no-store and UI cancellation do not retract external copies or promise deletion of historical developer-tools observations. Actual revocation/index/cache handling remains UNI-034/039.

[Actual verification and exclusions](../verification/UNI-033/README.md) distinguish synthetic mocked browser resources from real HTTP, PostGIS and E2E results. Existing guest map/list/advertisement behavior and privacy boundaries remain intact.
