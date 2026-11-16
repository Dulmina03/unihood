# Urban Map responsive shell — UNI-012 / UI-03

The guest `/explore` route follows the approved [Urban Map reference](../design/references/02_explore_urban_map.png) and Campus Teal tokens. It reuses SiteHeader, Button, Chip, Field, Badge, Notice, EmptyState, Skeleton, Modal and Icon; primary exploration labels/headings extend the typed English dictionary (reviewed Sinhala/Tamil rollout is deferred); screen-specific responsive composition lives in `apps/web/src/app/explore.css`. The generic foundation MapCanvas/MapPropertyPreview/ListingResultsRail remain demonstrations of boarding presentation; their boarding-only wording/types are inappropriate for the real public entrance directory, so this screen composes the reusable lower-level primitives instead.

Desktop has a 380px scrolling search/results rail, an edge-to-edge remaining work surface, floating filters/view/share controls and a grounded selected-entrance preview. At tablet widths the rail is 330px and collapsible. Mobile has compact floating controls, a nonmodal results bottom sheet that toggles by button/keyboard or vertical handle drag, and a scrollable list. List mode exposes the full results work surface and preserves all selections/filters. Collapsing the sheet hides its content from keyboard navigation. Preview selection focuses the preview; closing it focuses the result heading. Native dialogs contain focus and restore their trigger on Escape/close. The header's privacy link opens the landing privacy section, including when the rail/sheet is hidden.

## Data, routes and URL contract

UNI-010 universities, campuses and public entrances are read through the existing strict, same-origin UNI-011 GET adapters. No fallback dataset ships in runtime. Landing `Explore Map` opens `/explore`, preserving its route university when present. `Explore selected campus` carries the picker's university, campus and entrance. Guest QR `/u/[slug]` and the exploration rail's university-page link remain usable without an account.

Supported query fields:

- `university`: shared validated university slug.
- `campus`: shared public UUID, requiring university.
- `entrance`: shared public UUID, requiring campus and university; also selects the preview.
- `category`: `entrances` (default), `boardings` or `essentials`.
- `q`: trimmed public entrance-name filter, 1–100 characters when supplied; controls rejected.
- `view`: `map` (default) or `list`.

Unknown, repeated, empty, invalid or incomplete query parameters produce an explicit invalid-selection state. Raw invalid values are never echoed. Coordinates, radius, price, identity and arbitrary destination parameters are unsupported. Valid UUIDs/slugs are also resolved against the current public parent hierarchy; absent/archived/foreign selections stay invalid rather than silently selecting another entry. Reset selections clears the URL. Changing university clears campus/entrance/search; changing campus clears entrance/search. Category and Map/List retain the selected campus/gate; a selected gate preview is shown only in its entrance category. Name filtering does not silently replace the chosen starting gate.

`exploreHref` emits encoded canonical links, omitting defaults. Native `history.pushState` integrates with Next 16 `useSearchParams` as described in the installed framework guide. Each committed filter/selection/view change creates a history entry; URL-derived state handles reload, sharing and Back/Forward. Search drafts submit explicitly and remount from URL state on history changes. Sheet expansion and tablet rail visibility are local presentation state, not shared geography. Share offers clipboard copy and a selectable read-only link when clipboard permission is denied.

The exploration directory loader validates every page with shared Zod contracts, follows public pagination at 100 records/page and never treats page-two records as absent. An overall ten-second abort and 100-page ceiling fail visibly rather than silently truncating. No cookies/identity headers are sent. Selection changes abort requests and ignore stale responses; failed and empty results remain distinct. The existing server adapters retain strict parent/schema validation, no-store/redacted errors and fixed upstream configuration. No new API, OpenAPI schema, SQL migration or environment setting is needed.

## States and privacy boundaries

Server-rendered Suspense fallback communicates the product, map limitation and return link before hydration. The client provides loading, university/campus/entrance emptiness, no-name-match, network retry and invalid-selection recovery. Retry repeats failed directory reads with the URL intact.

UNI-013 now supplies a configurable MapLibre integration; see [provider, licensing and lifecycle documentation](maps.md). The following fallback applies when the provider is disabled/missing. The background is a neutral abstract grid, not a geographic map; no tiles, pins, geolocation request, coordinates, spatial ranking, distance, walking route or direction link is rendered. Map-unavailable wording and a working list action replace fake geography. A provider retry would have nothing to reconnect before UNI-013; directory retry remains functional. The disabled-provider fallback makes no remote map request; configured maps follow UNI-013’s reviewed provider boundary.

Only public campus entrances populate results/previews. Their source labels are shown; synthetic university/gate fixtures are explicitly fictional. Boardings and Essentials category controls expose truthful empty-feed states with a working return-to-gates action. No live inventory, owner verification claim, official price/vacancy, community boarding pin or private contact is invented. Boarding-specific distance/radius/price/vacancy filters are explained as unavailable with their future verified data sources, rather than exposed as nonfunctional controls. All five [ADRs](../decisions/README.md) and existing server actor/property boundaries remain unchanged.

UNI-013 implements configurable MapLibre/tiles/attribution; UNI-014 owns full listing discovery/saving; UNI-015 owns the full product E2E workflow and broader assistive-technology checks. Registration remains final-phase work. See [actual verification and screenshots](../verification/UNI-012/README.md).
