# Refined discovery and guest favourites — UNI-014

Roadmap: specification §10 UNI-014; UI-03 exploration and UI-14 `/saved`. M1 owns this frontend extension of UNI-010 public reads, UNI-011 routing, UNI-012 shell and UNI-013 MapLibre. All five ADRs remain unchanged. This issue adds no boarding/POI workflows, registration, identity verification or server synchronization.

## Discovery and links

`/explore` retains the desktop rail, collapsible tablet rail, mobile results sheet, Map/List controls, selected preview and MapLibre failure/list fallback. Editorial gate cards use approved Campus Teal/serif hierarchy and shared buttons/badges/icons. No unrelated stock photograph impersonates a real campus gate or boarding. Names/source labels come from strict public DTOs; synthetic fixtures are visibly labeled.

Name search matches every whitespace-separated token, case/accent-insensitively, against public entrance names only. Gate type supports all public gates or primary gates; ordering supports directory order or name A–Z, with canonical ID tie-breaking. There is no inferred distance, price, vacancy or owner filter without supported data.

Existing validated `university`, `campus`, `entrance`, `category`, `q`, `view` query state gains `gate=primary` and `sort=name`; default all/directory are omitted from canonical links. Unknown/repeated/spatial/identity parameters are rejected. Filters are available inline and in the accessible modal; reset clears result filters without losing the hierarchy. Map markers use exactly the filtered result membership; a previously selected starting gate may stay in the preview when filtered out, retaining UNI-012 semantics. Reload, share and Back/Forward use the same query contract. Favourites never enter the URL.

## Browser-only notebook

A save toggle on each result and its preview uses a stable accessible label (`Save <name>`) and `aria-pressed` state. `/saved` is reachable from exploration, landing/navigation and directly. It offers current public gate cards, explore/share actions, individual removal and clearing the collection. Removal and public-directory retry move focus to the stable Saved places heading. Storage recovery focuses its persistent status notice, so a removed recovery button does not strand keyboard focus. Share dialogs restore focus, provide canonical public gate links and support manual copying when clipboard access fails. A shared-device note explains that other users of this browser can see favourites.

Only `localStorage['unihood:guest-entrances:v1']` is used:

```json
{"version":1,"entrances":[{"universityId":"10000000-0000-4000-8000-000000000001","campusId":"20000000-0000-4000-8000-000000000001","entranceId":"30000000-0000-4000-8000-000000000001"}]}
```

The IDs above are synthetic fixtures. University/campus IDs are the minimal lookup context required by existing parent-scoped APIs; the entrance ID is the canonical deduplication identity. No name, slug, coordinate, locality, search history, photograph, owner/contact/price/identity field or sensitive payload snapshot is persisted. IDs are validated by the existing shared PublicIdSchema and normalized to lowercase. The versioned envelope and each entry reject unknown fields. Reads are capped at 15,000 characters and 50 entries; duplicate canonical entrance IDs collapse. The 50-entry bound also limits saved directory-resolution work. A full collection explains how to remove one before adding another.

React `useSyncExternalStore` supplies a storage-free loading snapshot during SSR and stable normalized snapshots in the browser. Same-tab subscribers and native cross-tab storage events refresh the UI. Each edit rereads persisted state before writing, preserving sequential changes from another consumer. This is not transactional multi-tab synchronization: simultaneous writes can still race under localStorage's last-write-wins semantics. There is no server account or cloud backup. Clearing site data removes the notebook.

Malformed, unsupported-version, oversized or sensitive-shaped stored data is rejected without rendering its contents or automatically overwriting it. An explicit Reset saved data action removes only the favourites key. Denied reads, SecurityError and quota/write failures show an unavailable state; no successful save/removal is claimed and no in-memory substitute is presented as persisted. Retry rechecks browser storage. Exploration remains usable. Raw exceptions never reach UI copy.

## Fresh public resolution and privacy

The Saved page resolves current universities, campuses and entrances through the existing paginated UNI-010 adapters and strict shared schemas, validating each parent relationship. No browser ID proves availability, ownership or permission. Aborted/stale requests retain the existing directory-hook protections. Empty notebooks send no directory requests. Loading and retryable directory/group failures are distinct from removed/unavailable entries. Missing universities/campuses/gates get generic removable cards without old metadata, ID text or invented map links; data is not silently replaced with a demo record. Clearing favourites remains available during upstream failures.

Only public campus gates are eligible. Boarding advertisements, community recommendations and generic map-provider features are not accepted by the save controls or saved DTO resolution. AREA_ONLY/HIDDEN data must remain absent from storage, search/proximity ordering, map inputs, links, share metadata, error messages and cached snapshots. Existing public consent/authority contracts remain mandatory for future boarding features; this notebook does not implement those workflows. No students gain boarding pin permission and no guest mutation reaches the server. Provider attribution, configuration, workers and cleanup remain [UNI-013's boundary](maps.md).

## Verification

[UNI-014 evidence](../verification/UNI-014/README.md) records actual checks, screenshot review and exclusions. New acceptance covers storage validation/errors/bounds/deduplication, public parent resolution, save/unsave/focus, cross-tab update, stable links/history, filtered real MapLibre markers, responsive widths and automated accessibility. Existing map/landing/exploration/permission/database regressions remain required. Mocked provider tests use explicitly synthetic resources, not real boarding/POI inventory. UNI-015's broader acceptance and full product E2E are not completed by these tests.
