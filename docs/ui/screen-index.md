# Screen and component index — UNI-003

## Implemented routes

- `/`: existing engineering preview, now sharing the Campus Teal header and fonts; links to the component library. It is not the final UI-01 discovery landing page.
- `/design-system`: responsive, noindex synthetic component demonstration. Header anchors lead to `#foundations`, `#collection`, `#map-components`, `#controls`. A skip link focuses main content. On mobile the same navigation expands inline, closes on selection/Escape and restores toggle focus on Escape. Bottom navigation is not needed for this single demo route; actual discovery navigation belongs to Phase 1.

UI-01/UI-03/UI-06/UI-07 remain reference destinations, not implemented product routes. No university selector, real map provider, registration flow, owner write endpoint or future-route dead link is introduced here.

## Reusable library

`packages/ui/src/index.ts` exports Button (primary/secondary/quiet/danger, disabled/busy), Chip, Field, SearchField, Badge, SourceBadge, PrivacyBadge, VacancyBadge, Notice, EmptyState, Skeleton, Photo, SiteHeader, Modal, FeaturedListingCard, AdvertisementGrid, ListingResultsRail, MapLayerControls, MapCanvas, MapPropertyPreview and Icon. Public TypeScript props are inferred from the exported functions; listing types/presentation helpers are exported separately.

`/design-system` demonstrates source filters, native search submit, local save toggles, ready/loading/empty/error/retry states, source/privacy/vacancy badges, validated fields with linked hint/error, disabled publishing, native dialog visibility choices, map layers, selected property preview and list fallback. All data is synthetic, fixed to the documented demo clock. State resets on reload; no persistence or backend publication is implied. There is one illustrative photograph shared across sample variants, not three claimed properties.

Images have dimensions, object-fit, alt text, lazy loading (hero eager), optional consumer-supplied srcset and failure fallback. The included local WebP is ~153KB; no remote image dependency at runtime. The reference assets are style guidance, not listing inventory.

## Boarding privacy contract

Components require **already sanitized public DTOs**. Never pass private coordinates, contact evidence or raw domain objects into a client component: React serialization can expose props even when the DOM hides them. The helper is presentation defense only, not authorization or server-side redaction.

`ListingView` deliberately has no coordinates, routes or contact fields. Community recommendations cannot type official owner price/vacancy, verification/consent or PUBLIC_MAP visibility. Runtime presentation also rejects forged community owner claims. Hidden locality is omitted; unknown/invalid public permission fails closed. MapPropertyPreview renders only for owner source + verified owner + PUBLIC_MAP + explicit consent. Community and private examples appear solely in the ad collection. No exact pins, directions links, distances or inferred locations are generated. Prices require a verified owner and finite nonnegative value; vacancy requires a nonfuture confirmation and unexpired timestamp. Source, visibility and vacancy remain separate signals. Future APIs must enforce property authorization, public serialization and freshness centrally.

## Reference interpretation

The four images under `docs/design/references/` informed the compact navy header, serif editorial headings, photographic cards, spacious grid, results rail and restrained layered map controls. Differences are deliberate: no generated reference geography/currency copied, no invented campus distances/ratings/live inventory, no private map pins, no unsupported contact or navigation actions. Only the foundation/demo is shipped; the map slot honestly reports unavailable and the native dialog replaces any decorative overlay. See [verification evidence](../verification/UNI-003/README.md).

Human screen-reader, translated-language and cross-browser approval are not implied by automated Chromium/axe checks. UNI-015 still owns full product E2E and broader assistive-technology smoke testing.

## UNI-011 implemented routes

`/` now implements UI-01 Editorial Explorer with inline university/campus/entrance selection; `/u/[slug]` is the guest university/QR entry; `/photo-credits` records image context and license. Loading/empty/error/retry/not-found states and targeted keyboard/browser/accessibility tests are included. See [landing behavior and scope](landing.md) and [evidence](../verification/UNI-011/README.md). Map, real advertisement/discovery and final registration routes remain deferred to their specified issues; no placeholder link claims those features work.
