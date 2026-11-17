# Screen and component index

## Implemented routes

- `/`: UI-01 Editorial Explorer landing, implemented in UNI-011.
- `/design-system`: responsive, noindex synthetic component demonstration. Header anchors lead to `#foundations`, `#collection`, `#map-components`, `#controls`. A skip link focuses main content. On mobile the same navigation expands inline, closes on selection/Escape and restores toggle focus on Escape. Bottom navigation is not needed for this single demo route; actual discovery navigation belongs to Phase 1.

UI-01, UI-03 with configurable MapLibre, and guest UI-14 are implemented below. UNI-031 adds the scoped UI-06/UI-07/UI-08 synthetic read preview below; later boarding publication workflows, registration and owner writes remain future work.

## Reusable library

`packages/ui/src/index.ts` exports Button (primary/secondary/quiet/danger, disabled/busy), Chip, Field, SearchField, Badge, SourceBadge, PrivacyBadge, VacancyBadge, Notice, EmptyState, Skeleton, Photo, SiteHeader, Modal, FeaturedListingCard, AdvertisementGrid, ListingResultsRail, MapLayerControls, MapCanvas, MapPropertyPreview and Icon. Public TypeScript props are inferred from the exported functions; listing types/presentation helpers are exported separately.

`/design-system` demonstrates source filters, native search submit, local save toggles, ready/loading/empty/error/retry states, source/privacy/vacancy badges, validated fields with linked hint/error, disabled publishing, native dialog visibility choices, map layers, selected property preview and list fallback. All data is synthetic, fixed to the documented demo clock. State resets on reload; no persistence or backend publication is implied. There is one illustrative photograph shared across sample variants, not three claimed properties.

Images have dimensions, object-fit, alt text, lazy loading (hero eager), optional consumer-supplied srcset and failure fallback. The included local WebP is ~153KB; no remote image dependency at runtime. The reference assets are style guidance, not listing inventory.

## Boarding privacy contract

Components require **already sanitized public DTOs**. Never pass private coordinates, contact evidence or raw domain objects into a client component: React serialization can expose props even when the DOM hides them. The helper is presentation defense only, not authorization or server-side redaction.

`ListingView` deliberately has no coordinates, routes or contact fields. Community recommendations cannot type official owner price/vacancy, verification/consent or PUBLIC_MAP visibility. Runtime presentation also rejects forged community owner claims. Hidden locality is omitted; unknown/invalid public permission fails closed. MapPropertyPreview renders only for owner source + verified owner + PUBLIC_MAP + explicit consent. Community and private examples appear solely in the ad collection. No exact pins, directions links, distances or inferred locations are generated. Prices require a verified owner and finite nonnegative value; vacancy requires a nonfuture confirmation and unexpired timestamp. Source, visibility and vacancy remain separate signals. Future APIs must enforce property authorization, public serialization and freshness centrally.

## Reference interpretation

The four images under `docs/design/references/` informed the compact navy header, serif editorial headings, photographic cards, spacious grid, results rail and restrained layered map controls. Differences are deliberate: no generated reference geography/currency copied, no invented campus distances/ratings/live inventory, no private map pins, no unsupported contact or navigation actions. In the UNI-003 foundation/demo, the map slot honestly reports unavailable and the native dialog replaces any decorative overlay. See [verification evidence](../verification/UNI-003/README.md).

Human screen-reader, translated-language and cross-browser approval are not implied by automated Chromium/axe checks. UNI-015 adds integrated Phase 1 guest E2E and records broader assistive-technology/visual smoke evidence; real screen-reader completion and human visual approval remain separate gates.

## UNI-011 implemented routes

`/` now implements UI-01 Editorial Explorer with inline university/campus/entrance selection; `/u/[slug]` is the guest university/QR entry; `/photo-credits` records image context and license. Loading/empty/error/retry/not-found states and targeted keyboard/browser/accessibility tests are included. See [landing behavior and scope](landing.md) and [evidence](../verification/UNI-011/README.md). Actual map/provider, real advertisement/discovery and final registration features remain deferred to their specified issues; no placeholder link claims those features work.

## UNI-012 implemented route

`/explore` implements the UI-03 responsive shell with real public university/campus/entrance selection, validated URL state, floating filters and selected gate preview, a collapsible tablet rail, mobile results sheet and Map/List toggle. No map provider or listing feed is fabricated. See [shell behavior and boundaries](explore.md) and [screenshots/verification](../verification/UNI-012/README.md).


## UNI-013 map integration

`/explore` now conditionally renders MapLibre with configured OpenFreeMap Liberty/Bright, public gate markers, visible attribution, keyboard controls and list fallback for configuration/network/WebGL/context-loss failures. Existing guest/QR/URL/selection/sheet behavior is retained. See [provider and interaction boundaries](maps.md) and [verification](../verification/UNI-013/README.md). No boarding/POI feed or later workflow is introduced.

UNI-014 refines UI-03 public-gate result cards and URL filters and adds guest UI-14 `/saved`. Browser-only canonical-ID favourites, fresh public-data resolution, storage recovery and share/focus behavior are documented in [guest favourites](favourites.md). No boarding/POI feed or account sync is added.


UNI-021 extends `/explore` Essentials with bounded public POI/category reads, distinct category glyphs, functional name/category/sort/page controls, basic public selection preview and validated share/reload/history state. Existing responsive rail/sheet/Map/List and public-gate favourites stay in place. [API/UI boundaries](../api/places.md), [verification](../verification/UNI-021/README.md). No boarding pins, private origin/distance, POI detail/nearby calculation, public write or registration flow is introduced.


## UNI-022 public POI detail (UI-09 / service cards)

`/places/[id]` adds the public POI detail: serif heading, source/confirmation/record-update facts, responsive mint public-point panel and canonical Share dialog. Result cards and previews in UI-03 link to it with validated return state; direct UUID links work for guests. Hours/contact/walking routes are honestly unavailable. Unknown/unpublished/private IDs share a generic not-found view, network errors have retry/list return, and loading has a status announcement. Correction guidance is expandable but sends no report; contribution work remains deferred. See [API/navigation boundaries](../api/places.md) and [actual verification](../verification/UNI-022/README.md).

## UNI-024 duplicate review

`/places/check-duplicates`, linked from public POI results, uses existing Campus Teal header, editorial heading, fields/buttons/badges/notices. Public business name/category/entrance input → guarded read-only preflight → candidate/context review → prepare update-existing or distinct-with-reason choice, or cancel. Choices are in-memory only; no actual update/proposal is sent. Loading/error/retry, rate/authorization/unavailable/empty/incomplete states preserve public browsing. [Behavior/local setup](../api/duplicates.md), [verification and screenshot review](../verification/UNI-024/README.md). No private boarding geometry/owner authority or future contribution wizard is added.

## UNI-026 public-service draft (UI-17)

`/contribute/place`, linked from Essentials and duplicate review, composes the existing Campus Teal fields/buttons/notices and editorial header into a public-entrance draft, matching review and private held receipt. Source/category/coordinates, explicit synthetic-public-business confirmation and optional consent-based map placement are functional. Keyboard coordinate adjustments remain usable without MapLibre. No localStorage/URL draft snapshots, publication/owner assertions, correction submissions or residential pins. [API/local demo](../api/poi-proposals.md), [verification](../verification/UNI-026/README.md). New human visual/AT approval is not claimed.

## UNI-031 advertisement previews

`/advertisements` implements the responsive editorial feed with source/privacy/title filters, nonspatial ordering, pagination and useful states. `/boardings/[id]` exposes canonical curated synthetic detail with private-location messaging, source/uncertainty and canonical sharing. The landing CTA/header and explorer boarding-category link reach the feed. No real owner, photo, fee, vacancy, contact, map, nearby or review claim is made. [UI/reference differences](boarding-advertisements.md), [API](../api/boarding-advertisements.md), [actual verification](../verification/UNI-031/README.md). Human approved the current synthetic-only feed/private-detail layouts on desktop/mobile; later owner/media/publication features and manual AT are outside that approval.

## UNI-032 owner draft (UI-20/UI-21/UI-22 foundation)

`/owner` and `/owner/new` provide task-focused synthetic draft planning, existing public-ad search, basic fields, three planned visibility choices, media acknowledgement and guarded session save/restore. No publish, claim, uploads, coordinates, prices or vacancy workflows. [Scope/setup](owner-wizard.md), [actual verification](../verification/UNI-032/README.md).
