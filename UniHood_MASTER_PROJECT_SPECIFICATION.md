# UniHood — Complete Project & Development Specification

> **Source of truth for product design, implementation, testing, delivery, and team collaboration**  
> **Version:** 2.1 — 16 November 2026 (Editorial Explorer + Urban Map UI revision)  
> **Product name:** **UniHood** (replaces CampusNest / Campus Boarding & Neighborhood Map)  
> **Brand palette:** **Campus Teal — APPROVED**  
> **Intended audience:** Five-member development team **or one solo developer**, including an AI coding assistant following this document  
> **Pilot:** University of Moratuwa area, Sri Lanka (practical default; extensible to all campuses)  
> **Status:** Implementation-ready baseline with **registration/owner verification intentionally UNFINALIZED and scheduled LAST**. Legal/provider feasibility must still be checked before public launch.  
> **Critical Git rule:** **The human project owner alone creates branches, stages, commits, pushes, opens and merges PRs. Assistants must NEVER perform Git mutations.**

---

## 0. READ THIS FIRST — execution contract

### 0.1 Mission and one-sentence pitch

**UniHood** is a mobile-first, QR-accessible student accommodation and neighborhood discovery website for Sri Lankan universities. People find boarding advertisements and owner-approved map listings, compare vacancies and facilities, discover nearby pharmacies/clinics/restaurants/hardware shops/transport, inspect walking routes and community observations, and contribute accurate information without generating duplicate places or exposing private residences.

### 0.2 Agreed product decisions (do not silently reverse)

1. **Open browsing:** anyone may search, view eligible listings, compare, and explore public map information without registration.
2. **Student/community boarding contributions appear ONLY as advertisements/recommendations.** Students cannot create an exact boarding map pin, even if they know the address.
3. **Only an appropriately verified owner or authorized property manager may publish an exact boarding map location**, and only after explicitly choosing public visibility.
4. Owners may choose **(A) map + advertisement**, **(B) approximate general-area advertisement**, or **(C) entirely location-hidden advertisement**. Switching visibility must never create a new canonical boarding record.
5. **Only an authorized owner/manager may publish official fees, deposits, vacancies, and their verified contact details.** Community submissions must not impersonate official information.
6. **Community members can suggest public points of interest (POIs)** such as pharmacies, clinics, restaurants, groceries, hardware, laundries, ATMs and bus stops. Apply duplicate/abuse checks.
7. One real-world place has **one canonical identity**. Several real businesses may legitimately occupy one building. Multiple community submissions should attach to or update the same record, not duplicate it.
8. Avoid routine administrative approval for ordinary activity. **No day-to-day Admin Dashboard or university-specific admin requirement.** Use automated risk checks and independent community confirmation. Keep a narrow **exceptional human escalation channel** for privacy, ownership disputes, abuse, security and wrongful merges.
9. Route information describes **observed conditions**, not a guaranteed "safe route." Separate day/night evidence and show confidence/recency.
10. **Approved visual direction is Editorial Explorer + Urban Map, using the unchanged Campus Teal palette.** Guest discovery is editorial, photo-led and premium; map discovery uses an edge-to-edge map and layered controls. Owner flows stay simple. Accessible, responsive and low-bandwidth; no gimmicky visual effects.
11. **Final account registration, student verification, owner authorization evidence, identity-provider choice and production authentication are intentionally postponed until the final development phase.** Build secure contract interfaces and mocks now; never ship protected write endpoints without production authorization.
12. Git operations **always belong to the human user**. Each phase must display a clear pause/checkpoint: branch before work, commit/push/PR after tests. Do not carry out these operations for the user.
13. Any sample addresses, prices, travel durations, coordinates, success metrics or review scores in development are **synthetic** and visibly labeled. Never present example data as live Sri Lankan listings.

### 0.3 Decisions deliberately postponed or subject to later validation

- **DEFERRED FINAL PHASE:** exact student signup methods (email / Google / phone), student enrollment verification, owner proof-of-authority mechanism, claim dispute process, identity provider, production sessions and recovery.
- **PROPOSED DEFAULT:** no account is needed to browse; when auth goes live, contributions require a verified account; owner actions require property-specific verified authorization.
- Pilot university/entrances, supported locality boundaries, exact provider costs and legal/privacy notices require field/provider validation before public deployment. Work with the defaults in this document until evidence requires change; log deviations in `docs/decisions/`.
- Future monetization and optional native app are out of initial scope.

### 0.4 How a coding assistant must use this file

1. Read **Sections 0, 4, 5, 7, 8, 9, 10, 11, 12 and 14** before writing code. Treat this file as the primary prompt and implementation contract.
2. Do the next item in the ordered **phase/task checklist**; do not redesign the permission model or ask for generic requirements already stated here.
3. At **every Git checkpoint**, clearly print the **branch name, suggested commands, files affected, acceptance tests, commit message and PR target**; the human performs all Git operations. Pause before beginning work that depends on that branch being created.
4. **Never run** `git init`, `git checkout`, `git switch`, `git branch`, `git add`, `git commit`, `git push`, `git merge`, `git rebase`, or `gh pr create` as an assistant. Reading repository status/log is allowed if user permits.
5. Edit only owned module paths unless a cross-module change is explicitly specified; use shared schema/contracts and documented interfaces.
6. For every task: implement → run tests → record evidence → update docs → announce the Git checkpoint → stop for the human's Git action. Never state that a commit or PR exists unless the human has completed it.
7. If a dependency, API key or external provider is unavailable, implement an adapter/mock and record the blocker; **do not invent live service responses**. Keep the project runnable in local development without paid keys.
8. Before registration is finalized, use an **explicit development-only actor adapter**, disabled outside local/test environments. All owner writes must be blocked in deployed environments until real auth is integrated.
9. Record build/test outcomes and unresolved caveats in `docs/progress/PHASE-XX.md`. Keep the document executable without requiring another requirements prompt.
10. If a technical choice must be made, use the defaults in §7 and create an ADR describing the tradeoff. Do not pause for routine implementation choices.

### 0.5 Delivery definition

A phase is **DONE** only when its vertical workflow is operable in the browser, API/database integration works or is intentionally mocked in the documented way, automated tests pass, relevant accessibility/error states exist, data authorization/privacy boundaries are checked, documentation is updated, and the **human** completes the associated Git checkpoint. A screenshot alone is **not** a completed phase.

---

## 1. Why UniHood exists

### 1.1 Problems faced by students

- Housing information is scattered across word of mouth, posters, groups and classifieds; many boards are missing.
- Advertisements rarely distinguish official rent, deposits, meal costs, occupancy rules, and verified vacancies.
- Students may not know where nearby clinics, pharmacies, food outlets, hardware shops, printing services, bus stops or groceries are located.
- Incorrect map pins and straight-line distance can misrepresent the real walk from a campus entrance.
- Poor lighting, flooded paths, narrow sidewalks and traffic exposure are hard to assess in unfamiliar areas.
- Outdated photos, manipulated reviews, fake properties and duplicate listings can waste time and money.
- Some owners don't want their residence publicly pinned, but still want inquiries.

### 1.2 Problems faced by owners and community contributors

- Limited access to digital advertising and less familiarity with complicated dashboards.
- Too many inquiries about already-full rooms and difficulty refreshing vacancy information.
- Concern over public disclosure of exact property location or personal contact details.
- Unauthorized users may post the wrong photos, price, phone number or location.
- Several people may separately post the same boarding; business POIs may also be duplicated.
- Centralized moderation for every campus will not scale or fit an open platform.

### 1.3 Proposed value

- One trustworthy **boardings + neighborhoods** discovery surface.
- Owner-controlled map visibility, official fees and availability.
- Public/community-contributed boarding advertisements clearly marked **unverified** until claimed.
- Public service POIs, route conditions and neighborhood comparisons with source/freshness indicators.
- Duplicate prevention, change history, corrections and transparent moderation state.
- Shareable links and university-specific QR codes; not dependent on a native mobile app.

### 1.4 Differentiation (claim only after validation)

Many housing directories list rooms, rent and contacts. UniHood's differentiator should be the **combined** privacy-aware ad/map system, contributor-to-owner claim flow, canonical deduplicated POIs, owner vacancy freshness, nearby amenities and evidence-based walking observations. Do not promise that all listings are verified or all routes are safe.

### 1.5 Out of scope for MVP

- Rental payments, deposits, escrow, rental agreements or housing contracts.
- Guaranteeing safety, accessibility, emergency response, or legitimacy of every boarding.
- Live buses, verified pharmacy medicine stock, automatic personal safety scoring.
- AI-generated reviews or fabricated properties; AI-based detection is optional later.
- Native mobile app; PWA is enough initially.
- University-specific administrators and mandatory partnerships.

---

## 2. Users, permissions, trust and governance

### 2.1 Actors

| Actor | Capabilities | Authentication decision |
|---|---|---|
| Guest visitor | Browse, filter, compare, view eligible public map POIs and listings | No signup |
| Community contributor (student or otherwise) | Submit/attach boarding recommendations **only as advertisements**; suggest public POIs; report, review, route observations | Verified login **later**; mock in local development |
| Verified boarding owner / authorized manager | Manage their own canonical boarding, public location consent, official fees, bed availability, contact, media | Property-specific verification **later** |
| Exceptional support operator | Handle urgent privacy/security takedowns, ownership conflicts, appeals and false merges | Restricted audit-logged access; not routine administration |
| Institutional/community partner (later) | Promote QR campaign and assist with field research | No privileged access by default |

A person may be both a contributor and an owner; permissions attach to **specific properties**, not a permanent `user_type=owner` boolean. A student label is not proof of enrollment.

### 2.2 Non-negotiable permission matrix

| Operation | Guest | Contributor | Authorized owner | Exceptional support |
|---|---:|---:|---:|---:|
| Browse listings and POIs | Yes | Yes | Yes | Yes |
| Save publicly visible places locally | Yes | Yes | Yes | Yes |
| Submit boarding recommendation/ad | No | Yes (nonofficial, privacy checked) | Yes | Case-only |
| Add exact boarding pin | **No** | **No** | **Yes, explicitly opted-in** | **No routine edit** |
| Set official rent/deposit/vacancy | No | No | **Yes on managed property** | Suppress/dispute, never impersonate owner |
| Suggest public pharmacy/restaurant/etc | No | Yes | Yes | Case-only |
| Suggest correction to public POI | No | Yes | Yes | Resolve exception |
| Publish someone else's private contact/address | **No** | **No** | **No** | **No** |
| Route observation / review | Read | Submit | Submit except conflicted self-review | Exceptional review |
| Force-merge canonical records | No | No | No | Limited reversible action with audit |
| Handle privacy/ownership dispute | Report | Report | Report | Yes |

**Authorization enforcement is on the API/server**, not only hidden buttons. `property_id` must be checked on every owner action. Private coordinates, unpublished media, claims and personal identifiers may not appear in public DTOs, API errors, logs or page metadata.

### 2.3 Trust and publication labels

Use independent states, not a single 'verified' boolean:

- `community_submitted`: unverified recommendation; no official price/vacancy/location/contact claim.
- `source_checked`: public POI identity supported by approved source/evidence; not guaranteed open now.
- `owner_verified`: control of this specific boarding was checked under final registration rules.
- `availability_confirmed`: owner has refreshed current room/bed availability within configured interval.
- `needs_confirmation`: stale/missing/uncertain.
- `disputed`: affected claims temporarily suppressed or marked contested.
- `closed` / `moved`: recorded with evidence/history.

### 2.4 Administration-free routine operation

- Ordinary low-risk POI submissions may appear as **community-submitted** after server validation, duplicate checks and media moderation.
- Sensitive submissions (residential addresses, private contact numbers, ownership claims, exposed personal details, high-confidence duplicate collisions) **remain held** for evidence or exceptional escalation.
- Community confirmations can raise confidence but **not by a simple vote count alone**. Check independence, recency, source, suspicious patterns and conflict of interest.
- No one automatically gains support powers through reputation points.
- Operators must be reachable for privacy claims, appeals, security incidents and unresolved owner disputes. **Removing routine admins does not remove operator responsibility.**

---

## 3. End-to-end functional requirements and workflows

### 3.1 Requirements index

| ID | Requirement | Priority | Module |
|---|---|---|---|
| F-001 | Open landing page and university picker; QR deep links | Must | M1 |
| F-002 | Responsive map/list boarding discovery with category filters | Must | M1+M2 |
| F-003 | Vacancy badges: confirmed / full / unknown / stale | Must | M3 |
| F-004 | Campus entrance-based distance and walking directions when available | Must after map | M2 |
| F-005 | Owner public map listing OR private/area-only ad | Must | M3 |
| F-006 | Community boarding recommendation as **ad only** | Must | M4 |
| F-007 | Owner-controlled official rent, deposits, rooms/beds, vacancies | Must | M3 |
| F-008 | Public essential POI categories, map layers and details | Must | M2 |
| F-009 | Radius/name/source/photo/contact-assisted dedup | Must | M2+M3 |
| F-010 | Suggest update/attach evidence, never blind duplicate insertion | Must | M2+M4 |
| F-011 | Privacy-safe media and contact controls | Must | M3+M4 |
| F-012 | Ownership claim/authorization workflow | **Finalized last** | M5 |
| F-013 | Review/report/appeal and transparent information freshness | Must | M4 |
| F-014 | Nearby-services neighborhood profile | Must | M1+M2 |
| F-015 | Day/night walking-condition reports, source confidence | Should / phased | M4 |
| F-016 | Saved places and comparison | Should | M1 |
| F-017 | Simple, multilingual-friendly owner dashboard | Must | M1+M3 |
| F-018 | Exception-only privacy/ownership escalation | Must before launch | M4+M5 |
| F-019 | Authentication, sessions, recovery, account linking, student status | **Final phase only** | M5 |
| F-020 | Monitoring, backups, privacy retention, deployment & tests | Must | M5 |

### 3.2 Workflow W-01 — visitor finds accommodation

1. Open `/`, follow `Find Boarding`, or scan a university QR such as `/u/moratuwa`.
2. Select campus and one of its actual gates (user may change at any time).
3. See a **map of only consented owner-published boarding pins** and public POIs; separate listing cards include community ads/private-location owner ads.
4. Filter `Map listings / All adverts`, vacancy freshness, budget (only owner prices), facilities, room type and category.
5. Open listing. See publisher status, source/freshness, media, official pricing if present, last-updated details and applicable house rules.
6. For visible precise pins, view actual walking route/time and nearby services; for private/area-only ads, show no exact route, precision distance, inferred pin or revealing link.
7. Compare or save places, contact via owner-approved method, request location if hidden, and optionally report incorrect information.
8. Do **not** pay a deposit solely on the basis of a listing; show a nonintrusive fraud-safety reminder.

**Edge cases:** no vacancy, no price, stale vacancy, no map tiles, no pedestrian route, slow internet, unverified ad, inaccessible contact, abandoned listing, no matching results.

### 3.3 Workflow W-02 — student submits boarding recommendation (AD ONLY)

1. `Contribute` → `Recommend Boarding` (not `Place pin on map`).
2. Enter a display title, optional public general locality, permitted description, allowed photos/videos, known facilities and context.
3. Do **not** request/require an exact coordinate; strip GPS metadata; warn not to post private phone/address or unconsented interior photos.
4. Search possible duplicates using approximate locality, name, authorized contact fingerprints if any, image hashes, existing boardings/ads and current drafts.
5. If an existing record matches, `Add information / Suggest correction` rather than new canonical property.
6. Submit as `community_submitted` after safety, abuse and duplicate checks. Hold questionable private/sensitive content.
7. The resulting ad **never** shows an official fee, official vacancy, owner-verification badge or exact map pin supplied by the student.
8. Owner can later claim this **same** canonical record during final authorization flow; maintain contribution attribution/history.

**If a student is also a verified authorized manager**, use the owner's explicit map-publishing flow, not student permissions.

### 3.4 Workflow W-03 — owner publishes map or advertisement

1. Start `List My Boarding`. In development, local-only mock owner actor is allowed; on public systems, owner publishing remains disabled until M5 authorization is complete.
2. Search existing community advertisements and owner listings to avoid duplicate property creation. Claim/reuse an existing canonical boarding if possible.
3. Enter property info, rooms/beds, amenity list, consented photos, public contact preferences, price and vacancies.
4. Choose visibility:
   - `PUBLIC_MAP`: exact entrance selected and owner explicitly consents; eligible public map pin + advertisement card.
   - `AREA_ONLY`: owner chooses public locality; no exact coordinate, route, or precision distance in public response.
   - `HIDDEN`: no public locality/address, no coordinates, no area-specific distance or route; ad card only.
5. Store any verification-only coordinates (if required by future policy) in strictly private storage; never expose through browser payloads, client bundles, analytics or map API.
6. Preview student-facing ad, explicitly confirm visibility, publish when property authorization passes, and update later without duplicate records.
7. Revoke map consent at any time; **remove from public map/search spatial index/cache promptly** and refresh canonical/share previews.

**Crucial:** Area-only is not a random blurred marker placed near the residence. Show a locality label or broad non-revealing area polygon only if owner selected and its privacy risk was reviewed.

### 3.5 Workflow W-04 — owner updates vacancy and fee

1. Owner opens `My Boardings` → property → `Rooms & Availability`.
2. Change unit count/status or tap `Still Available / Full / Unknown`.
3. Server checks property-specific authorization and write permission, stores actor, reason, timestamp and prior value.
4. Refresh `last_confirmed_at`; public status expires into `unknown` after sample **14-day** interval unless reconfirmed (configurable).
5. Change official monthly fee/deposit/other recurring fees in LKR with clear unit and effective date; show a history summary if configured.
6. Student-submitted observations may trigger a discrepancy flag but never overwrite official fee or vacancy.

### 3.6 Workflow W-05 — contribute a public essential service

1. Select `Add Public Place`, choose pharmacy/medical/restaurant/grocery/hardware/laundry/printing/repair/transport/ATM/other.
2. Type name, use consented device location or map pin and confirm business entrance (not forced GPS).
3. Frontend queries nearby canonical matches **before submit**; show exact/category/name candidates and `Suggest update instead`.
4. Backend rechecks name, radius, external IDs, same-building-unit and submitted/pending duplicates transactionally.
5. If low risk, publish clearly as community-submitted or queued per policy; uncertain/high-risk stays pending.
6. Allow closure/moved/category/contact/hour corrections with dated evidence and audit trail.

### 3.7 Workflow W-06 — route comparison and reports

1. Choose owner-published boarding with exact public entrance and select campus gate.
2. Request one or more pedestrian routes. If unavailable, show honest fallback (`route unavailable`), never a made-up time.
3. Route cards show distance, estimated walking time, observed lighting/sidewalk/traffic/flooding reports and evidence recency.
4. Contributor may submit structured observations on a named route **segment**, time context `day / night`, date and optional evidence.
5. Display `better lighting reported`, `limited evidence`, etc. Never label a route `safe`, `safest`, `guaranteed`, or infer security from low report count.
6. Never route to a hidden-location boarding.

### 3.8 Workflow W-07 — report, correct, request takedown

1. User chooses `Report issue`: duplicate, wrong details, stale vacancy, inappropriate media, private data exposed, fake ownership, closure, harassment, route information issue.
2. Server creates a traceable case with risk classification and minimal evidence; do not publicly surface reporter identity.
3. For obvious private data exposure, temporarily hide affected field/media pending review; high-risk claims route to exceptional support.
4. Automated checks can propose edits or change confidence labels but cannot transfer ownership or force-merge contested records automatically.
5. Record the resolution, notify involved parties where safe, and offer an appeal path.

### 3.9 Workflow W-08 — owner claim (FINAL PHASE SPEC ONLY)

1. Existing user selects `Claim this boarding` or `List my boarding`.
2. Server performs registration/authentication, contact verification and **property-specific** authority check using the policy finalized in Phase 8.
3. Conflicting ownership claims remain pending for exceptional review; phone OTP alone **never** proves ownership.
4. Grant role/membership only for the verified property, optionally delegated manager permissions.
5. Reuse an existing community record; preserve prior community contributions and privacy settings.
6. No production owner write operation may be enabled before this workflow has real server-side controls.

---

## 4. User interface & visual design specification — FINALIZED DESIGN DIRECTION: Editorial Explorer + Urban Map / Campus Teal

### 4.1 Brand and color tokens

| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#0D2940` | Navigation, dark brand headers, high-contrast text |
| `teal-600` | `#087E79` | Main action, active map layers, links, focus states |
| `mint-100` | `#DDF4EA` | Quiet highlights, informative accents |
| `canvas` | `#F7F9F6` | Main light background |
| `amber-500` | `#E9AA40` | Caution, unknown freshness, duplicate warning |
| `coral-500` | `#F16A50` | Critical issues / destructive actions with accessible text |
| `surface` | `#FFFFFF` | Cards and form panels |
| `text-muted` | `#566B75` | Supporting copy, timestamps |
| `divider` | `#DCE5E4` | Subtle borders and dividers |
| `ink` | `#173544` | Default body text |

All colors are starting brand tokens; test actual foreground/background combinations to WCAG 2.2 AA. Never rely on color alone to convey `Available`, `Full`, `Unknown`, or `Unverified`. Icons + labels always accompany pins/status. Dark mode can be built later from semantic tokens; **do not change the approved light palette**.

### 4.2 Design rules

- **Visual direction approved 16 November 2026: `Editorial Explorer + Urban Map`.** Not a generic dashboard, heavy-table application, or repetitive uniform-card layout. Visual language is premium, photographic, editorial and geographically grounded.
- **Keep the Campus Teal palette in §4.1 unchanged.** Deep navy navigation, Campus Teal interactions, off-white main canvas, mint only for subtle panels, restrained amber/coral for semantic warnings.
- **Landing/detail/advertisement pages:** editorial typography (e.g., Fraunces or a carefully selected display serif for feature headings plus Manrope/Inter for UI), authentic property photographs, asymmetrical media galleries, carefully differentiated type hierarchy, tasteful white space and crisp information grouping.
- **Explore map:** full-height map; desktop results/filter rail at left and optional contextual floating detail preview over the map. Filters appear as small chips and controls instead of a large static grid. On mobile, edge-to-edge map + draggable results sheet, visible map/list toggle and bottom safe-area consideration.
- **Owner workflows:** do not force the editorial marketing layout into owner administration. Use a clean, task-based, low-complexity form/dashboard with large buttons, stepper and clear preview of visibility rules.
- **No gratuitous gradients, glowing effects, AI-themed decoration, excessive colored cards, fake-map data or decorative metrics.** A photographic hero is intentional, but must never prevent immediate search/access to map.
- **Light mode is the initial release.** Dark mode is an optional later theme that must preserve semantic pin/status distinctions.
- Mobile-first: bottom navigation for public discovery (`Explore`, `Ads`, `Saved`, `Contribute`, `Account`); desktop: persistent slim navy top navigation, contextual search/filter rail only where necessary.
- Suggested desktop viewport prototype: 1440×900; mobile prototype: 390×844; tablet 768×1024. Components flex/adapt, not fixed screenshot layouts.
- Use accessible semantic HTML and adequate targets (~44px touch area), field labels, inline help, progressive disclosure, keyboard navigation, visible focus, loading/empty/error/retry states.
- Content in **English initially** with i18n-ready dictionaries for Sinhala and Tamil (language rollout by field research). Do not assume owners are fluent in English.
- Media: prefer owner-consented authentic local photos, strong property photography and properly licensed campus/neighborhood imagery; use explicit illustrative placeholders during design. **Never publish image-generation mockup photos, names, prices, reviews, universities, routes or mapped geography as real listings.**
- Map pins cluster by zoom and use both icon/category and vacancy state (not only colored dots).
- Contact details are masked or omitted if not consented; no fake reviews or live listings.

### 4.3 Navigation tree

```text
Public
 ├── Home / University selection
 ├── Explore
 │    ├── Boarding map (owner-published only)
 │    ├── Public essentials map (POIs)
 │    └── List/search + filters
 ├── Advertisements
 │    ├── Owner official advertisements (public map/area/hidden)
 │    └── Community boarding recommendations (unverified)
 ├── Boarding / service detail
 │    ├── Neighborhood essentials (if public exact entrance)
 │    ├── Routes (only exact public entrance)
 │    ├── Reviews, reports and updates
 │    └── Save / Compare
 ├── Contribute
 │    ├── Recommend boarding (advertisement only)
 │    ├── Add public place
 │    └── Suggest update / Report error
 └── Account [implemented in FINAL phase]
Owner [gated until final authorization]
 ├── My Boardings
 ├── Create / Claim
 ├── Listing preview & location privacy
 ├── Rooms, prices, vacancies
 ├── Photos, house rules and contact
 └── Inquiries / alerts [optional MVP]
Exceptional-support operations [private, not a public admin dashboard]
 ├── Privacy/abuse cases
 ├── Ownership conflicts
 └── Reversible duplicate merges / audit
```

### 4.4 Screen-by-screen designs (canonical screen IDs)

**Every screen below must include empty, loading, validation, network-error and mobile behavior where relevant.**

| Screen | Route / component | Essential layout, content and interactions | Module |
|---|---|---|---|
| UI-01 Home | `/` | **Editorial photographic hero**, large display headline, immediate university/location search, compact filters, primary Explore Map + secondary Browse Ads, 3 photo-rich featured cards, nearby essentials strip, trust/privacy explainer and QR awareness | M1 |
| UI-02 University selector | `/universities` | Search universities, campuses, entrance picker, known region; no GPS requirement | M1+M2 |
| UI-03 Explore map | `/explore` | **Edge-to-edge urban map** with left search/results rail on desktop, floating chip filters, category toggles, campus entrance, owner-only boarding map pins, POIs, clustered markers, legend and anchored property-preview card; mobile bottom sheet | M1+M2 |
| UI-04 Search/list | `/search` | Cards including **all** eligible ads; badge `Owner`, `Community`, `Location private`, price only if owner confirmed | M1 |
| UI-05 Filters | overlay | Vacancy status, rent range for owner-priced items, amenities, room type, distance for exact-map listings | M1 |
| UI-06 Ad feed | `/advertisements` | **Editorial photo grid**, restrained photographic banner, explicit tabs All / Owner-posted / Student recommendations, spacious property cards, owner/community/hidden-area labels, search and filtering, no private map pins | M1+M3 |
| UI-07 Boarding detail | `/boardings/:slug` | **Asymmetrical photo gallery** (large primary + secondary photos), strong title and trust badges, sticky price/contact sidebar, room types and fees, facility chips, privacy-aware location & routes, nearby POI column, reviews and freshness | M1+M3 |
| UI-08 Private ad detail | detail mode | Reuse elegant detail composition, replace map/routes panel with clear location-private information and owner-controlled Contact / Request Location; **no geolocation hint, precise route/distance or vicinity calculation** | M3 |
| UI-09 POI detail | `/places/:slug` | Category, verified source, last updated, hours/contact if validated, directions, suggest correction | M2 |
| UI-10 Nearby essentials | boarding detail tab | Pharmacy/clinic/food/groceries/hardware/transport with routing only for public exact boards | M1+M2 |
| UI-11 Compare | `/compare` | 2–3 selected boardings; fees, availability freshness, amenities, known route info, no fabricated hidden-location scores | M1 |
| UI-12 Walking routes | `/routes?boarding=...` | Multiple pedestrian options, condition observations, time-context selector, uncertainty notice | M2+M4 |
| UI-13 Reviews & reports | listing tab | Structured evidence, time labels, owner response, report buttons; no unverified accusation badges | M4 |
| UI-14 Saved list | `/saved` | Favourites stored locally for guests, authenticated sync optional in final phase | M1 |
| UI-15 Contribution hub | `/contribute` | Clearly separate `Recommend Boarding` vs `Add Public Place`; explain permission difference | M4 |
| UI-16 Recommend boarding | `/contribute/boarding` | Title, locality optional, facilities, photo consent, community-only notice, no exact pin | M4 |
| UI-17 Add POI + pin | `/contribute/place` | Category, name, map pin adjustment, entrance, source, validation | M2+M4 |
| UI-18 Duplicate warning | modal/step | Similar names, distance where public, candidate matches, `Update existing` vs `Distinct place — explain` | M2 |
| UI-19 Suggest correction | `/places/:id/edit-suggestion` | Field-specific correction, reason/evidence, preview and submission status | M4 |
| UI-20 Owner start | `/owner` | Big `List My Boarding` and `Manage Boarding` buttons; gated in nonlocal until auth is finalized | M1+M3 |
| UI-21 Owner wizard | `/owner/new` | Search existing → details → visibility → rooms → fees → review; simple steps with save draft | M3 |
| UI-22 Location visibility | owner wizard | `PUBLIC_MAP`, `AREA_ONLY`, `HIDDEN`; exact public preview and privacy implications | M3 |
| UI-23 Owner dashboard | `/owner/boardings` | Simple cards: Vacancies, Fees, Photos, Contact/Rules, Visibility; large touch targets | M3 |
| UI-24 Rooms & availability | `/owner/boardings/:id/rooms` | Count/types, `Still available`, `Full`, update dates; confirm action | M3 |
| UI-25 Fees & deposit | `/owner/boardings/:id/pricing` | LKR per room/bed/month, deposit, utility/meal disclosure, effective date, history | M3 |
| UI-26 Contributions history | `/contributions` | Draft/pending/published/rejected/needs-evidence states, duplicate suggestion links | M4 |
| UI-27 Issue report | modal/route | Structured report, privacy guidance, receipt/status; critical takedown path | M4 |
| UI-28 Sign-in / profile | `/auth/*`, `/account` | **Placeholder flow only until last phase**; fields/provider finalized later | M5 final |
| UI-29 Claim / verification | `/owner/claim/:id` | **Final-phase provisional**: property-specific verification, pending claims, disputes | M5 final |
| UI-30 About / Help / Policies | `/about`, `/help`, `/privacy`, `/terms` | Trust labels, disclaimers, contact, correction rights, legal notices | M1+M5 |

### 4.5 Explicit screen connection rules

- Home → Explore → Listing → Nearby/Routes (only if exact public location) → Save/Contact/Report.
- Home → Advertisements → Ad Detail → Request Location or Contact (owner-configured); **never** silently enter map mode for hidden ads.
- Contribute → Recommend Boarding → Similar Ads → Attach information / Submit recommendation → Contribution status.
- Contribute → Add Public Place → Pin → Duplicate alert → Suggest edit or submit → Status.
- Owner → property search → choose Existing claim/New → privacy selection → preview → gated publish.
- Every form has Back, Cancel, Save draft (where appropriate) and clear validation; no dead-end controls. All routes share one navigation model. Visual composition must comply with §§4.7–4.11.

### 4.6 Public wording and sample labels

- Use: `Owner-verified`, `Community-submitted`, `Location private`, `Price not provided by owner`, `Availability last confirmed 5 days ago`, `Availability unknown`, `Limited route reports`.
- Avoid: `Guaranteed safe`, `Officially verified by university` without evidence, `100% genuine`, `Students confirmed this rent`, or exact area measurement for private ads.
- Show dates with timezone (`Asia/Colombo`) and accessible absolute timestamp in addition to relative freshness.


### 4.7 FINAL visual reference set — four new screen concepts (16 November 2026)

The files listed below are **design references only, not deployable production assets**, and are delivered together with this Markdown in the companion `UniHood_Design_References/` folder (or in the optional ZIP bundle). If viewing this standalone Markdown without the images, the requirements in §§4.1–4.11 are the canonical instructions.

| Screen | Reference image | Design purpose |
|---|---|---|
| UI-01 Landing / Editorial Explorer | `UniHood_Design_References/01_landing_editorial.png` | Spacious two-tone header; large editorial headline; photograph-led university-neighborhood hero; immediate search + map/ad calls-to-action; curated boarding photography, nearby-essentials categories, privacy/trust explanation |
| UI-03 Explore / Urban Map | `UniHood_Design_References/02_explore_urban_map.png` | Map-focused desktop work surface with left results rail, chip filters, colorful icon-coded POIs, selected pin and floating detail preview; directions only for authorized map listings |
| UI-06 Boarding Advertisements | `UniHood_Design_References/03_advertisements_editorial.png` | Editorial image cards, tabs for owner vs student submissions, clearly differentiated location-visibility and source badges, owner contact actions |
| UI-07 Boarding Details | `UniHood_Design_References/04_boarding_details_editorial.png` | Hero gallery + title, sticky action/price rail, room breakdown, nearby POIs, permitted route panel, reviews and informational tabs |

**Caution about generated examples:** These images contain illustrative room photographs, fictional listings, sample labels, foreign-looking place names, non-LKR currency marks, and map-like art that can be inconsistent with Sri Lankan geography. **Do not reproduce their data.** Production must use verified local place names, `LKR`/`Rs.` pricing, `Asia/Colombo` timestamps, validated university/campus/entrance coordinates, real routes/POIs from licensed providers, consented photographs, source/verification notices and the permission matrix from §0.2. In particular, **do not copy any advertisement-only marker onto the real exact map** even if it appears in a concept image.

#### Design composition: landing page (UI-01)

1. Header: left UniHood wordmark + concise links (`Explore Map`, `Advertisements`, `Nearby Essentials`, `For Owners`) and an unobtrusive provisional sign-in link. Sticky after scrolling, accessible in compact/mobile form.
2. Hero: two-line editorial heading, one clear value statement, authentic university-area photo with properly licensed/consented provenance; search input is above the fold. Do not hide a mandatory location choice deep below the hero.
3. Search: university, campus, locality, or boarding autocomplete backed by vetted data; filters expandable but not compulsory. `Explore Map` is the primary CTA, `Browse Advertisements` secondary.
4. Featured listings: photo-forward 3-card desktop layout, 1-card scrollable mobile pattern; show canonical availability/source status, prices only if owner-confirmed, locality or exact distance only when appropriate.
5. Neighborhood services: horizontal discovery chips for healthcare, pharmacies, groceries, restaurants, hardware, transport; they open map with relevant category query state.
6. Privacy explainer: visually distinguish `Owner map listing`, `Owner private advertisement`, and `Community recommendation`. Explain that community submissions never publish boarding pins.
7. Footer: help, report a problem, privacy, terms, contact and accessible language selection (language rollout deferred).

#### Design composition: Explore Map (UI-03)

1. Desktop layout: compact navy top navigation, left filter/results rail (about 320–420px in a 1440px viewport), map uses all remaining space. Do not surround the map with a thick dashboard grid.
2. Filters: university entrance, search query, distance/radius, vacancy status, price filters only for official owner pricing, POI categories; filter state reflected in URL and browser history.
3. Marker system: distinct silhouettes/icons for owner-confirmed boarding vs pharmacy/health/food/grocery/hardware/bus/ATM; boardings only render in exact-map layer if `PUBLIC_MAP` and authorized. Categories have an accessible legend and keyboard-accessible equivalents in list view.
4. Selection: clicking a valid pin opens one grounded floating summary card with photo, source, availability freshness, permitted route estimate, directions/contact. Selecting another replaces previous preview, preserving current filters.
5. **Privacy enforcement:** `AREA_ONLY` and `HIDDEN` advertisements are accessible from the advertisement/list results but never as private-coordinate pins, inferred walking-radius rings, exact distance, or map-routing targets.
6. Mobile: edge-to-edge map, compact floating search/filter control and draggable/expandable results sheet; list-only fallback when tile/routing provider fails.
7. Geo facts (walk durations, distances, route polylines, nearest POIs) come from supported routing/geometry providers or are explicitly unavailable, never guessed.

#### Design composition: Advertisements (UI-06)

1. Photo-led banner/header with search field; use a clean 3–4-column desktop grid depending on width and responsive 1–2 columns on small screens.
2. Segments/tabs: `All advertisements`, `Owner posted`, `Student recommendations`; badges always identify source and verification status independently from location visibility.
3. Distinguish `Map listing by owner` / `Advertisement only` / `Location private` / `Community recommendation`. A community recommendation must not display official owner rent, owner-confirmed vacancy or unauthorized phone/photo.
4. Each listing card uses real approved image, title, approximate location if voluntarily disclosed, permitted owner price only, verified status, save and details/inquiry action. Avoid invalid ad-specific distance if no exact public location exists.
5. Duplicates: suggest existing listing while composing an advertisement, showing `Update existing` or `Different place` with evidence flow.
6. Right editorial column or embedded help section can explain privacy/trust; on mobile fold it below results rather than narrowing cards excessively.

#### Design composition: Boarding Details (UI-07 and UI-08)

1. Wide asymmetrical image gallery; accessible lightbox, mobile carousel and a consent-aware image/video policy.
2. Heading region: title, source badge (`Owner verified` vs `Community-submitted`), privacy badge, availability freshness. Avoid unverified five-star summaries.
3. Main information: room/unit types with capacities and *official* prices only when provided by authorized owner, occupancy rules, amenities, deposit/utility/meal disclosure, most recent update date.
4. Desktop sidebar with primary `Contact Owner` or `Request Location` (depending on consent) and sticky price/vacancy summary; mobile sticky bottom action must not obscure content.
5. For `PUBLIC_MAP` listings only, show licensed map route to chosen campus entrance and nearby service walking access. For `AREA_ONLY`/`HIDDEN`, replace geographic panels with a privacy note and owner contact workflow.
6. Display nearby essentials as useful factual POI cards with real supported walking routes, plus recency and uncertainty. Student reviews follow moderation/verified-stay design decisions and must never invent trust claims.
7. Tabs or anchors such as Overview / Rooms & Rent / Facilities / Rules / Nearby / Reviews; keyboard focus order and back/forward navigation verified.

#### Reference image previews (illustrative, not production content)

![UniHood Editorial Explorer landing page](UniHood_Design_References/01_landing_editorial.png)

![UniHood Urban Map exploration page](UniHood_Design_References/02_explore_urban_map.png)

![UniHood boarding advertisement grid](UniHood_Design_References/03_advertisements_editorial.png)

![UniHood photo-led boarding details](UniHood_Design_References/04_boarding_details_editorial.png)

### 4.8 Extended UI language for all remaining screens (UI-02, UI-04–05, UI-08–30)

- **University picker/search:** searchable text with vetted campus entries, optional illustrated map preview, predictable entrance selector. This remains a utility panel, not an elaborate marketing hero.
- **Private ad detail:** preserve refined visual composition from UI-07 but use a clear area-only or hidden-location state; no fake mini-map.
- **POI and nearby essentials:** balanced list/map with real categorized map markers, one-screen correction action, useful freshness and source metadata, and clear service-hours uncertainty.
- **Compare:** editorial information comparison on desktop; mobile horizontal swipe or stacked comparison with anchored property headings. `Not shared` / `Unknown` are visible values, not blanks.
- **Routes:** visually strong map with alternate walking routes and condition observations, separate day/night feedback, source recency and no guaranteed safety claims.
- **Contribute + add public place:** 3–5-step guided wizard, large map pin adjustment, clear photo permissions, high-visibility duplicate suggestion before final submission; on mobile use full-width steps.
- **Recommend a boarding:** advertisement-only flow with optional locality; explicitly block precise residential pins and unauthorized contact/photography.
- **Owner onboarding and property tools:** simplify to task-focused pages; huge click/tap targets, short labels, grouped steps, save draft, official fee and vacancy update. A marketing-style hero is inappropriate here.
- **Owner privacy selection:** side-by-side previews of `Public map`, `Area only`, `Hidden`; explain what visitors can actually see. Preview must be derived from server-safe public DTOs, not just masked frontend values.
- **Community activity, reports and corrections:** straightforward chronological cards and evidence states, with reversibility and rejection reasons. No publicly visible routine admin console.
- **Registration and owner verification:** continue to show *provisional placeholders only* until Phase 7; do not lock fields or an authentication provider now.

### 4.9 Design system and implementation tokens

- Set semantic tokens centrally in `apps/web/src/styles/tokens.css` or equivalent: background, surface, foreground, muted, primary, secondary, accent, warning, danger, focus ring and border. Keep approved palette hex values from §4.1 as source values.
- Suggested display font: `Fraunces` for the editorial H1/H2 or a licensed close alternative, while `Manrope` or `Inter` handles body, buttons and forms. Confirm Sinhala/Tamil script support and use appropriate fallback fonts; do not sacrifice readability for serif styling.
- Heading scale (guideline): desktop hero 52–72px, inner H1 36–48px, H2 26–34px; mobile hero 36–44px, inner H1 28–34px. All sizes fluid via `clamp` and verified against real strings.
- Layout grid: max page content width ~1280–1440px for editorial pages, gap ~16–28px, cards with consistent 12–20px rounded corners, subtle 1px dividers and restrained shadow. Map view intentionally bypasses the content max-width.
- Component names: `SiteHeader`, `UniversitySearch`, `FeaturedListingCard`, `AdvertisementGrid`, `SourceBadge`, `PrivacyBadge`, `VacancyBadge`, `MapCanvas`, `MapLayerControls`, `ListingResultsRail`, `MapPropertyPreview`, `NearbyEssentials`, `PhotoGallery`, `PropertyActionRail`, `RoomUnitCard`, `LocationVisibilityPicker`, `DuplicateCandidates`, `OwnerQuickActions`, `ContributionStatusTimeline`.
- Motion: <=200ms interactions unless reduced-motion preferred; no intrusive scroll animation. Keep interactions stable under slow connections.
- Images: responsive `srcset`/Next Image, explicit dimensions, appropriate alt text, compression, blur placeholder only where allowed, lazy load below fold. No synthetic photos presented as real accommodation.
- Accessibility: WCAG 2.2 AA target, 44px touch targets where practical, no color-only statuses, keyboard map alternative through result list, meaningful label and focus restoration after modals/sheets.

### 4.10 Mobile, tablet and desktop behavior — QA contract

| Viewport | Landing | Explore map | Ads | Detail | Owner forms |
|---|---|---|---|---|---|
| 360–430px phone | condensed editorial hero/search, full-width CTAs, swipe cards | full-screen map + draggable results sheet and list toggle | 1-column cards | stacked gallery, sticky contact bar | single-column stepper |
| 768–1024px tablet | 2-column responsive sections | collapsible list rail | 2-column cards | gallery + compact info sections | 1–2-column panels |
| 1280–1600px desktop | hero with image/text balance, 3-column featured list | full-height map and 320–420px side rail | 3–4-column cards | asymmetric gallery + sticky action rail | spacious but task-based |

No horizontal overflow at 320px. Search/filter state must survive changing from map to list. All touch controls and map attribution remain accessible. When a map provider is down, browsing listings must still work. When client-side hydration is delayed, the public page still communicates the product and has meaningful loading controls.

### 4.11 Visual approval and handoff gates

1. **Phase 0 / UNI-003:** implement typography, semantic tokens, header, button, search, chip, badge, card, image and map control foundations; story/demo states must label sample content.
2. **Phase 1 / UNI-011–015:** approve UI-01 and UI-03 separately at mobile and desktop sizes. Compare against their reference compositions (not literal fake names, prices or maps). Screenshot review is required in addition to accessibility, unit and E2E tests.
3. **Phase 3 / owner listings:** approve UI-06 / UI-07 / UI-08 at mobile and desktop. Privacy regression test: never render protected coordinates or directions for private ads.
4. **Phase 4 / community:** visually test conflicting badges, duplicate warning, long names and unverified source states.
5. **Phase 5 / routing:** verify map readability, alternate route differentiation and genuine data provenance; never invent a route.
6. **Phase 7 / registration:** only then finalize visual designs for signup, claim and verification screens; current visual placeholders are not binding authentication choices.
7. For each related issue, attach a screenshot at 390×844 and 1440×900 to the issue/PR evidence directory, list divergences from visual reference, and complete the **human-only Git checkpoint** from §9.

---

## 5. Canonical domain model and database design

### 5.1 Modeling rules

Do **not** equate a coordinate, building, property, advertisement, room, owner account, or community contribution. These are different entities:

```text
University (1) → Campuses (N) → CampusEntrances (N)
Building (1) → PhysicalPlaces (N)
PhysicalPlace → PublicService / BoardingProperty (subtype)
BoardingProperty (1) → BoardingUnits (N)
BoardingProperty (1) → Listing (1 current canonical publication, revisions N)
BoardingProperty (1) → OwnerMemberships (N) [authorization postponed]
BoardingProperty (1) → CommunityContributions (N)
PublicService (1) → CommunityContributions (N)
PhysicalPlace (1) → ExternalSourceReferences (N)
PhysicalPlace (1) → Alias/Redirect (N)
RouteSegment (1) → ConditionReports (N)
Reports / Evidence / AuditEvents reference canonical IDs
```

A building can contain a ground-floor pharmacy and multiple separately managed boarding floors. They may share a building coordinate while representing distinct businesses/properties. A single boarding can have multiple independent room/bed units and multiple ads over time, but **only one current canonical boarding identity**.

### 5.2 Suggested PostgreSQL schema (implementation contract)

Use SQL migrations stored in version control. Prefer immutable UUID primary keys, UTC `timestamptz`, constraints and spatial indexes. `geography(Point,4326)` supports approximate meter-based proximity; use carefully validated geometry for routing/entrances. `PostGIS` and `pg_trgm` extensions are required.

| Entity/table | Essential fields | Key constraints / privacy |
|---|---|---|
| `universities` | `id`, `slug`, `name`, `city`, `country`, `status` | unique slug; no university endorsement implied |
| `campuses` | `id`, `university_id`, `name`, `public_area`, `status` | has many entrances |
| `campus_entrances` | `id`, `campus_id`, `name`, `geo`, `is_primary` | public vetted coordinates |
| `buildings` | `id`, `public_geo?`, `address_label?`, `status` | shared location not unique business; residential private data separated |
| `places` | `id`, `kind` (`POI`/`BOARDING`), `canonical_name`, `normalized_name`, `building_id?`, `category?`, `status`, `created_at`, `updated_at`, `merged_into?` | unique ID; name+geo not hard unique |
| `public_place_locations` | `place_id`, `entrance_geo`, `source`, `last_confirmed_at` | ONLY public POIs or authorized PUBLIC_MAP boardings are queryable here |
| `private_boarding_locations` | `boarding_id`, `exact_geo?`, `address_enc?`, `retention_policy` | restricted access only; **no public serializer** |
| `boarding_properties` | `place_id`, `description`, `general_locality?`, `visibility`, `authorization_status`, `last_updated` | `visibility` enum; do not expose private coordinate |
| `boarding_units` | `id`, `boarding_id`, `label`, `room_type`, `capacity`, `available_beds?`, `occupancy_rules?` | capacity >=0; availability not inferred from reports |
| `boarding_official_prices` | `id`, `unit_id`, `currency='LKR'`, `period`, `rent_amount`, `deposit_amount?`, `utility_terms`, `effective_at`, `author_membership_id`, `recorded_at` | official owner-scoped permission; preserve revisions |
| `vacancy_confirmations` | `id`, `unit_id`, `status`, `available_beds?`, `confirmed_at`, `confirmed_by`, `expires_at` | latest unexpired owner assertion determines `confirmed_available`; stale → unknown |
| `listings` | `id`, `boarding_id`, `publisher_kind`, `publication_status`, `title`, `description`, `visibility_snapshot`, `published_at` | community ads cannot include public exact pin/official fee |
| `community_submissions` | `id`, `target_place_id?`, `kind`, `content_json`, `actor_id?`, `source`, `risk_status`, `submitted_at`, `decision_at?` | proposal ≠ canonical mutation |
| `place_source_refs` | `id`, `place_id`, `provider`, `external_id`, `source_version`, `license_tag` | unique(provider, external_id), where external ID exists |
| `place_aliases` | `id`, `place_id`, `alias`, `normalized_alias` | search and multilingual aliases |
| `place_redirects` | `old_place_id`, `canonical_place_id`, `reason`, `created_at` | preserve share links and reversible merge context |
| `duplicate_candidates` | `id`, `submitted_place_id?`, `match_place_id`, `signals_json`, `confidence`, `resolution`, `created_at` | candidate evidence separate from automatic destructive merge |
| `merge_events` | `id`, `survivor_id`, `removed_id`, `before_snapshot_ref`, `actor`, `timestamp`, `reverted_at?` | restricted operation, rollback tested |
| `media_assets` | `id`, `object_key`, `uploader_id?`, `consent_status`, `moderation_status`, `mime`, `bytes`, `checksum`, `width`, `height`, `created_at` | no EXIF GPS, signed upload/display rules |
| `contact_methods` | `id`, `boarding_id`, `contact_type`, `protected_value`, `public_consent`, `verified_at?` | unconsented private data not public |
| `place_reviews` | `id`, `place_id`, `author_id`, `stay_verification_state`, `ratings_json`, `text`, `status`, `created_at` | no review by owner of own property |
| `route_segments` | `id`, `geometry`, `source_version`, `public_status` | no claim of objective safety |
| `route_condition_reports` | `id`, `segment_id`, `reporter_id`, `time_context`, `observed_at`, `condition_codes`, `evidence_ref?`, `confidence_state` | structured, limited retention, not user travel history |
| `user_reports` | `id`, `report_type`, `target_type`, `target_id`, `reporter_id?`, `severity`, `status`, `created_at`, `closed_at?` | confidential evidence, protected reporter |
| `audit_events` | `id`, `event_type`, `actor_ref`, `target_ref`, `old_json?`, `new_json?`, `occurred_at` | redact sensitive values from logs |
| `feature_flags` | `key`, `enabled`, `scope` | `owner_public_writes_enabled=false` until final auth |
| `user_accounts` / `auth_identities` / `property_memberships` / `property_claims` | reserved IDs + interfaces | **Schema and final verification mechanics belong to M5 last** |

**Implementation simplification:** `community_submissions`, review/report schemas and private locations may be split further. Maintain the same invariants regardless of physical table normalization. A `listings` row is *not* an alternative canonical place ID; it belongs to one boarding property.

### 5.3 Required enum contracts

```ts
type PlaceKind = 'BOARDING' | 'POI';
type BoardingVisibility = 'PUBLIC_MAP' | 'AREA_ONLY' | 'HIDDEN';
type PublisherKind = 'OWNER_OFFICIAL' | 'COMMUNITY_RECOMMENDATION';
type PublicationStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'DISPUTED' | 'ARCHIVED';
type VacancyStatus = 'AVAILABLE' | 'FULL' | 'UNKNOWN';
type SourceConfidence = 'COMMUNITY_SUBMITTED' | 'SOURCE_CHECKED' | 'OWNER_VERIFIED' | 'DISPUTED';
type SubmissionRisk = 'LOW' | 'NEEDS_EVIDENCE' | 'HIGH_RISK' | 'REJECTED';
type RouteTimeContext = 'DAY' | 'NIGHT';
```

Keep enums centrally in `packages/contracts`. The public `AVAILABLE` state must be calculated from a current owner confirmation, not a student observation or expired record.

### 5.4 Spatial privacy requirements (must pass tests)

- For `PUBLIC_MAP`: expose only the owner-consented entrance coordinate via a public-facing DTO; routing and proximity eligible.
- For `AREA_ONLY`: expose only a broad owner-approved locality label; no exact lat/long, geohash, precise distance, proximity ordering, map marker, entrance image metadata, hidden geocoding key or route result.
- For `HIDDEN`: expose neither exact location nor locality (unless owner explicitly shares generic city separately); no map marker/distance/route/reverse lookup.
- Map vector features, HTML metadata, structured SEO data, server logs, analytics events, thumbnails, error payloads and browser caches must also honor visibility.
- Visibility revocation invalidates public cache/search indexes and removes old public point listings; existing third-party copies may not be retractable, so warn owners before consenting.

### 5.5 Relational consistency and migrations

- Foreign keys must reference canonical UUIDs; duplicate pending entries must also be scanned.
- Unique `(provider, external_id)` for imported source references; do not make `(lat, lng)` globally unique.
- `CHECK available_beds <= capacity` and nonnegative money/counts.
- Concurrency safe submission: transaction/advisory lock for candidate scope; re-run candidate matching at insert; support idempotency key to prevent double tapping.
- Merges are restricted **exceptional** operations only, never automated on a fuzzy score. Store mapping, pre-merge state and reverse action; do not transfer prices/owner privileges by default.
- Build reversible SQL migrations and backup strategy; test clean setup and rollback in CI.

---

## 6. Duplicate prevention and information reliability

### 6.1 Mandatory match process

1. Normalize name (Unicode normalization, trim punctuation, lowercase for matching, aliases in Sinhala/Tamil/English where available); retain original text.
2. Select candidate source: exact external provider ID; same public spatial area (initial **50 m** candidate search as a *tunable example*); known shared building; private boarding ads by general locality + safe fingerprints/aliases; pending entries too.
3. Compare category, unit/floor, business identity, contact **only when authorized** and privacy-safe normalized fingerprints, image perceptual hash (with opt-in/consent), and source provenance.
4. Return ranked `possible_matches` to UI; let user `suggest_update`, `continue_as_distinct_with_reason`, or `cancel`.
5. Server repeats checks on final submission and handles concurrent insert/idempotency.
6. Confident matching redirects proposals to existing canonical record **without silently deleting user data**.
7. Ambiguous candidate stays pending for more evidence/exceptional intervention. Reject attempt to auto-merge two different same-building pharmacies or floors.
8. On owner claim, match community recommendations to existing property; update permissions and publication state of same canonical record rather than creating a new boarding.

### 6.2 Example matching signals (tune against labeled pilot dataset)

| Signal | Illustrative role |
|---|---|
| Exact same canonical/source ID | Strong identity evidence |
| High normalized name similarity | Moderate evidence; multilingual/transliterated variants matter |
| Nearby public POI entrance | Candidate generator, **not proof** |
| Same authorized verified owner + property descriptor | Stronger boarding evidence |
| Same public contact | Supporting, but several businesses can share a number |
| Same approved property photo | Supporting, but stock/reused photos exist |
| Same building but different unit or operator | **Counterevidence** against a merge |
| Conflicting category/entrance | Requires review and contextual checking |
| No public coordinates for hidden ad | Use nonspatial signals; **never infer and publish a private location** |

An example policy is `likely duplicate`, `possible duplicate`, `apparently new`; calibrate score thresholds from manually labeled examples. Do not call an arbitrary 90% similarity a verified 90% probability.

### 6.3 Required duplicate test dataset

Create synthetic fixtures covering at least:

- Same pharmacy with spelling/punctuation differences and 12m GPS drift.
- Same pharmacy name in two separate towns.
- Two different pharmacies in adjacent units with nearly identical coordinates.
- One building with restaurant downstairs, boarding upstairs.
- Two separate boarding operators sharing one building.
- Same boarding submitted by two students with slightly different names.
- Hidden advertisement and owner map claim for the same property.
- One owner contact managing two different properties.
- Duplicate imported source ID with changed provider geometry.
- Concurrent submissions sent within the same second.
- Two photos of same place with recompression; different places using same generic image.
- A previously merged canonical place that must be restored.

**Acceptance:** every fixture produces the expected candidate/decision and **zero unintended destructive merges**.

### 6.4 Vacancy and source freshness

- Source of truth for official vacancy: owner-authorized latest confirmation **per unit**.
- Proposed `VACANCY_TTL_DAYS=14` (example, adjust after real owner interviews); stale owner assertion displays `UNKNOWN` rather than `AVAILABLE`.
- If `FULL`, preserve confirmed date and allow owner to change status.
- Public POI hours and existence can similarly age into `needs confirmation` if not refreshed.
- Each visible fact has `source_type`, `verified_at` or `observed_at`, and optionally `confidence`.
- Where rent is absent, show `Price not provided by owner`, not a guessed current rate.

### 6.5 Review authenticity and conflict controls

- Separate general observations from verified-stay review eligibility (the latter implemented only if privacy-preserving verification later feasible).
- Owners/managers cannot submit a review of a property they manage; do not automatically suppress negative feedback.
- Flag patterns of bulk new accounts, identical text and collusive reports; rate-limit submissions.
- Sensitive allegations are not displayed as established public facts and may require exceptional review.
- Allow dispute/appeal and a public owner reply that does not expose reporter identity.

---

## 7. Technical architecture and repository blueprint

### 7.1 Chosen implementation defaults (implement unless blocked)

| Layer | Default | Notes |
|---|---|---|
| Web | **Next.js** (stable App Router) + **TypeScript** | Responsive SSR/CSR as appropriate |
| Design | **Tailwind CSS**, reusable accessible components, CSS variables | Campus Teal semantic tokens |
| Forms | React Hook Form + Zod | Shared validation contract |
| Data fetching | TanStack Query where client caching needed | Explicit cache invalidation on visibility change |
| Maps | **MapLibre GL JS** with configurable licensed tile/style provider | Do not assume OSM public tiles are unlimited |
| API | **NestJS** + TypeScript REST API | Domain modules, guards, validation and OpenAPI |
| Database | **PostgreSQL + PostGIS + pg_trgm**, SQL migrations | Spatial + fuzzy identity |
| Query access | Kysely or parameterized `pg` queries; prefer Kysely for typed queries | Spatial queries as parameterized SQL; avoid ORM hidden spatial pitfalls |
| Media | S3-compatible storage via adapter; local storage for development | Upload size/type scanning, EXIF stripping, signed delivery |
| Routing | Pedestrian-capable adapter to Valhalla/GraphHopper or licensed provider | Never invent route metrics; route unavailable fallback |
| Auth (last) | `IdentityProvider` + `PermissionService` interfaces | Provider and proof process **not chosen yet** |
| Tests | API Jest/Supertest, UI Vitest/Testing Library, Playwright E2E | Testcontainers or Dockerized test DB |
| Local infra | Docker Compose for DB and optional supporting services | `.env.example`, no committed secrets |
| Observability | Structured server logs + error reporting + health checks | Do not log private coords/tokens |
| Deployment | Managed static/web + API + PostgreSQL + object store | Adapter-driven and documented per environment |

Do not pin undocumented versions in this file. At bootstrap, use current stable compatible releases, lock the dependencies, run baseline tests, and document versions in `docs/architecture/stack.md`.

### 7.2 Monorepo structure

```text
unihood/
├── README.md
├── UniHood_MASTER_PROJECT_SPECIFICATION.md
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── docker-compose.yml
├── apps/
│   ├── web/                         # M1 owns app shell/UI routes
│   │   ├── src/app/
│   │   │   ├── (public)/
│   │   │   ├── explore/
│   │   │   ├── advertisements/
│   │   │   ├── boardings/
│   │   │   ├── places/
│   │   │   ├── contribute/
│   │   │   ├── owner/
│   │   │   └── auth/                  # M5; stub only until final
│   │   ├── src/components/
│   │   │   ├── ui/
│   │   │   ├── map/
│   │   │   ├── boarding/
│   │   │   ├── poi/
│   │   │   ├── contribution/
│   │   │   └── route/
│   │   ├── src/lib/api/
│   │   ├── src/lib/feature-flags/
│   │   ├── src/styles/
│   │   └── tests/
│   └── api/                         # Backend features owned by M2–M5
│       ├── src/modules/
│       │   ├── universities/
│       │   ├── geo/
│       │   ├── places/
│       │   ├── duplicates/
│       │   ├── boarding/
│       │   ├── listings/
│       │   ├── availability/
│       │   ├── prices/
│       │   ├── contributions/
│       │   ├── reports/
│       │   ├── routes/
│       │   ├── auth/                 # FINAL phase
│       │   └── operations/
│       ├── src/common/
│       └── test/
├── packages/
│   ├── contracts/                    # Shared REST DTOs/types/schemas
│   ├── ui/                           # Design-system components/tokens
│   └── config/                       # lint, TS, test presets
├── infra/
│   ├── db/migrations/
│   ├── db/seeds/                       # synthetic data only
│   ├── docker/
│   └── deployment/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── api/
│   ├── ui/
│   ├── policies/
│   ├── progress/
│   ├── verification/
│   └── git-checkpoints.md
└── .github/workflows/               # CI (not auto-deployment without consent)
```

Monorepo package manager: **pnpm workspaces**. Commands below assume root scripts `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm db:migrate`, `pnpm db:seed`. Bootstrap defines these scripts and ensures they actually work.

### 7.3 API response rules

- Prefix `/api/v1` and create OpenAPI docs from server code; all public DTOs have Zod/TypeScript schemas in `packages/contracts`.
- Response envelope for errors:

```json
{
  "error": {
    "code": "DUPLICATE_CANDIDATE_FOUND",
    "message": "A similar place may already exist.",
    "details": [{ "candidateId": "example-uuid", "reason": "similar_name_nearby" }],
    "requestId": "example-request-id"
  }
}
```

- Never serialize `private_boarding_locations`, verification files, hidden phone numbers, internal match fingerprints or exact coordinates for non-`PUBLIC_MAP` records.
- Validate pagination/sort/filter fields and enforce max limits; use RFC-style structured error codes and expected HTTP statuses.
- For write requests, use idempotency keys where double taps/slow networks are likely.
- Public anonymous endpoints are read-only; contributors and owner endpoints are protected/disabled until final auth integration outside localhost/test.

### 7.4 Proposed endpoint contract

| HTTP | Path | Purpose | Public? |
|---|---|---|---|
| `GET` | `/api/v1/health` | Liveness/readiness, no secrets | Yes |
| `GET` | `/api/v1/universities` | University/campus list | Yes |
| `GET` | `/api/v1/universities/:id/entrances` | Approved gates | Yes |
| `GET` | `/api/v1/places` | Public POI list + bbox/category query | Yes |
| `GET` | `/api/v1/places/:id` | Public POI detail | Yes |
| `GET` | `/api/v1/boardings` | Public boarding/ad list with visibility-safe fields | Yes |
| `GET` | `/api/v1/boardings/:id` | Public listing details | Yes |
| `GET` | `/api/v1/boardings/map` | **PUBLIC_MAP ONLY** map coordinates | Yes |
| `GET` | `/api/v1/boardings/:id/essentials` | Nearby essentials only for visible-map boarding | Yes if eligible |
| `GET` | `/api/v1/routes` | Pedestrian route from approved public origin to public destination | Yes if eligible |
| `POST` | `/api/v1/duplicates/check` | Privacy-safe candidate check; rate-limited | Contributing actor only |
| `POST` | `/api/v1/contributions/boarding` | Student ad suggestion, never exact pin | Verified contributor (last phase) |
| `POST` | `/api/v1/contributions/poi` | Public-service place suggestion | Verified contributor (last phase) |
| `POST` | `/api/v1/contributions/correction` | Suggest existing-place edit | Verified contributor (last phase) |
| `POST` | `/api/v1/reports` | Report a place/review/issue | Verified user, urgent safe fallback |
| `POST` | `/api/v1/boardings` | Owner official property draft | Verified property owner (last phase) |
| `PATCH` | `/api/v1/boardings/:id/visibility` | Consent mode; retract public map point | Authorized owner only |
| `PATCH` | `/api/v1/boardings/:id/units/:unitId/availability` | Owner vacancy state | Authorized owner only |
| `POST` | `/api/v1/boardings/:id/prices` | Official price revision | Authorized owner only |
| `POST` | `/api/v1/route-reports` | Segment/time observation | Verified contributor (last phase) |
| `POST` | `/api/v1/property-claims` | Start owner proof process | **Final phase** |
| `GET` | `/api/v1/me` | Account context and memberships | **Final phase** |

All final-phase/protected endpoints can be fully implemented and tested with injected local actors earlier, but must return `401/403` or `FEATURE_NOT_AVAILABLE` in production-like modes until M5 is complete.

### 7.5 API payloads and privacy contracts

**Sample owner-public boarding (illustrative data):**

```json
{
  "id": "sample-boarding-001",
  "title": "Sample Boarding A",
  "publisherKind": "OWNER_OFFICIAL",
  "visibility": "PUBLIC_MAP",
  "entrance": { "lat": 6.0000, "lng": 79.9000 },
  "vacancy": { "status": "AVAILABLE", "confirmedAt": "2026-11-15T10:00:00Z" },
  "price": { "currency": "LKR", "rentMonthly": 18000, "verifiedSource": "OWNER" }
}
```

Coordinates/prices above are **synthetic test fixtures, NOT a real boarding**.

**Private owner advertisement must have neither exact address nor geometry:**

```json
{
  "id": "sample-boarding-002",
  "title": "Sample Private Boarding",
  "publisherKind": "OWNER_OFFICIAL",
  "visibility": "HIDDEN",
  "locationLabel": null,
  "entrance": null,
  "distanceMeters": null,
  "route": null,
  "price": { "currency": "LKR", "rentMonthly": 17000, "verifiedSource": "OWNER" }
}
```

**Community advertisement:**

```json
{
  "id": "sample-boarding-003",
  "title": "Community-recommended boarding",
  "publisherKind": "COMMUNITY_RECOMMENDATION",
  "visibility": "HIDDEN",
  "entrance": null,
  "price": null,
  "vacancy": { "status": "UNKNOWN", "confirmedAt": null },
  "disclaimer": "Community-submitted, not owner-verified"
}
```

Do not include empty private fields elsewhere in the payload or return exact coords in nested geo, map feature properties, links or computed metrics.

### 7.6 Infrastructure and external service constraints

- OSM data has ODbL attribution/licensing duties. An OSM-based provider, commercial tile provider or self-hosted tiles may be used only under the relevant terms; use a swappable map provider adapter.
- The **public Nominatim** instance is **not** a permissible shortcut for bulk POI extraction or client-side autocomplete; acquire licensed extracts or an appropriate geocoding provider instead.
- Routing provider must support pedestrian travel in the pilot and document unsupported paths. Cache where contract permits, set provider quota/timeouts and retry policy.
- **Do not scrape Google Maps** to populate UniHood or imply that Google results are licensed for this dataset.
- Upload media only after consent checks, MIME/type validation, size limits, malware/content controls and GPS metadata removal.
- Set environment-dependent storage, map tile, routing and rate limiting defaults; no production secret or paid service required for mock local acceptance.

---

## 8. Five-module ownership — team of five OR solo developer

### 8.1 Module boundaries (one primary owner each)

| Module | Name | Team member | Core responsibility | Shared dependencies |
|---|---|---|---|---|
| **M1** | Product UI, Design System & Discovery | Member 1 | Campus Teal UI, responsive routes, public search and comparison, owner-friendly screens | Contracts from M2/M3/M4 |
| **M2** | Geographic Places, Maps & Duplicate Engine | Member 2 | PostGIS, universities/entrances, public POIs, spatial/name matching, map/search/routing adapters | Shared schema and frontend integration |
| **M3** | Boarding Inventory, Advertisements & Privacy | Member 3 | Canonical properties, owner and community ad variants, visibility, rooms, official prices, vacancy freshness, media safety | Dedup M2, auth abstraction M5 |
| **M4** | Community, Trust, Reviews & Route Observations | Member 4 | Student recommendations, corrections, reports, risk policy, reputation signals, walking-condition reports | M2 POIs, M3 listings, auth abstraction M5 |
| **M5** | Integration, QA, Security, Operations & FINAL Registration | Member 5 | CI/deployment, contracts, app integration, exception escalation, privacy/observability, **auth and property authorization last** | All modules |

This is **division of development responsibility**, not a promise that each can develop independently of APIs. Each module owns its directories; shared APIs and schema changes must be coordinated through versioned contracts.

### 8.2 Five-member workflow

1. **All members agree on the initial data model/contract baseline** in Phase 0. M5 maintains the root repository/tooling, M2 database primitives, M1 UI shell.
2. Members use **separate task branches**. Never ask five people to edit the same page, migration or API definition simultaneously.
3. Parallelize API and mocked UI after contracts stabilize: M1 UI, M2 geo/POI, M3 boardings, M4 contributions, M5 CI/test harness.
4. Cross-module endpoints/types require a small documented contract change first; the owning member implements the server, and M1 integrates the client.
5. M5 assembles integration tests and release gates; it does **not** silently gain owner privileges or create a routine admin feature.
6. **Registration is integrated last**, after features operate under test-only actor adapters. This is a scheduling decision, not permission to expose unprotected writes in production.
7. Each member requests the human project owner to create branch, stage, commit, push and PR; code assistants do not do Git mutations.

### 8.3 Solo-developer workflow

A single developer uses the **same five modules** as ordered work packages:

**M1 foundation/UI shell → M2 spatial/POIs/dedup → M3 boarding/ad/privacy → M4 community/routes → M5 integration/security/FINAL registration.**

Do not try to complete a whole module to production perfection before integrating. Follow the phase plan in §10, which cuts vertical slices across modules. Finish one issue, test and manually commit before the next issue. Keep `main` deployable/readable after every merge.

### 8.4 Module M1 deliverables and acceptance

**Owns:** `apps/web/src/app`, `apps/web/src/components`, `packages/ui`, `docs/ui`, frontend tests. **Must produce:**

- Responsive app shell, university selector, landing, accessible navigation, Campus Teal tokens.
- Map/list/ad distinction in UI. Owner-published pins only on map; private ads appear in lists without inferred markers.
- Functional search/filter panels; selected university/gate; URL-synced filters and stable listing links.
- Boarding and POI details, nearby essentials, compare, saved places, error/empty/loading states.
- Owner wizard and dashboard screens with clear low-tech labels; owner writes gated in production.
- UI for duplicate warning, community contribution and reports integrated via M2/M4 contracts.
- Prepared i18n keys (English strings first), no hardcoded UI price/location assumptions.

**Definition of done:** at 390px/768px/1440px, nav works; keyboard and accessible labels pass; private ads never show map affordances; all actions produce a meaningful page, state change or documented disabled status. Visual tests cover vacancy/visibility/publisher states. UI documentation includes screen routes and consistent header/bottom navigation.

### 8.5 Module M2 deliverables and acceptance

**Owns:** API `universities`, `geo`, `places`, `duplicates`, provider adapters; `infra/db/migrations` geographic tables; spatial tests. **Must produce:**

- Universities/campuses/gates with seed data (synthetic/university-verified only).
- POI canonical records and categories with public geo, source metadata and last-updated status.
- `GET /places` by bbox/category/text, detail and walking-distance adapters.
- Duplicate candidate search: `ST_DWithin`, `pg_trgm`, external source IDs, explicit same-building distinction and pending proposals.
- Server-side second-check, concurrent insert protection, idempotency, aliases/redirects/merge metadata.
- Map provider abstraction; visible license attribution; routing timeout/error handling.
- OSM import plan for licensed extracts only (no public Nominatim bulk search).

**Definition of done:** all §6.3 duplicate fixtures pass including concurrent submission; no false merges; POIs filter correctly; map provider failure does not crash page; no private boarding geometry returned by M2 routes.

### 8.6 Module M3 deliverables and acceptance

**Owns:** API `boarding`, `listings`, `availability`, `prices`, `media`; boarding/units/ad data migrations; owner task tests. **Must produce:**

- One boarding property identity, linked community recommendation and official owner publication.
- `PUBLIC_MAP`, `AREA_ONLY`, `HIDDEN` visibility model; privacy-safe responses, cache invalidation and toggles.
- Community-recommended ad vs official owner ad, clearly separate publisher/status.
- Owner-managed units/beds, official rent/deposit/other charges, LKR formatting, price revision history.
- Availability confirmations with configurable expiry; status transitions and public freshness.
- Media upload API with EXIF removal, consent, size limits and appropriate moderation statuses.
- Property management APIs use `PermissionService.canManageProperty(actor, boardingId)` from M5 adapter; no hardcoded global owner boolean.

**Definition of done:** a hidden ad leaks no location via any public endpoint; student account cannot set official rent or map point in tests; two properties with same owner remain separate; stale availability expires to unknown; switching publication mode doesn't duplicate property.

### 8.7 Module M4 deliverables and acceptance

**Owns:** API `contributions`, `reports`, `route-reports`; moderation policy definitions; contribution and route UI data integration; privacy/abuse tests. **Must produce:**

- Student boarding recommendation form that **never** offers exact-pin submission.
- Suggest new POI, correction, close/moved report, duplicate proposal, contributor submission history.
- Privacy-safe report workflow and high-risk escalation records; no public moderator UI requirement.
- Structured ratings (water, sanitation, noise, study environment, Wi-Fi, rules) with verified-stay label **only when proof exists**.
- Walking report model by segment and day/night with evidence/freshness/confidence; avoid safety guarantees.
- Anti-spam: rate limits, suspicious mass posting, restricted abusive content, no automatic owner-transfer by voting.
- Community information labeling and appeal/resolution states.

**Definition of done:** contributor cannot write official fee/vacancy/boarding coordinate, fake self-review blocked, private information report can suppress a field, route shows evidence caveat, high-risk case is escalated without pretending an algorithm verified it.

### 8.8 Module M5 deliverables and acceptance

**Owns:** root scripts/CI, infrastructure, auth/permission abstractions and **final auth**, system E2E, deployment, observability, release docs, exception support access. **Must produce:**

- Workspace setup; `.env.example`; Docker PostGIS dev/test; CI lint/typecheck/unit/integration/build/E2E.
- `IdentityProvider`/`PermissionService` interfaces, dev actor adapter restricted to local/test, production **deny-by-default** until finalized.
- Shared API contracts and OpenAPI smoke tests; health/readiness; basic rate limiting, safe logging, backups and restore exercises.
- Moderation exception route for privacy/claim/security/merge issues (small operator-only access, not general university admin).
- Feature flags and privacy regression suite; legal/license notice and deployment checklist.
- **Only in the final phase**, choose and implement student signup, identity provider, owner verification, property memberships/delegations, sessions, account recovery, appeals and production write access.

**Definition of done:** full local E2E works; public reading requires no login; all protected writes reject anonymous/unverified actors; correct owner may manage only authorized properties; no development bypass available in production; rollback and data backup verified; source license/attribution displayed.

### 8.9 Cross-module integration contracts

| Source | Consumer | Contract | Integration test |
|---|---|---|---|
| M2 | M1 | Campus gates, public POIs, bbox and duplicate candidate DTOs | Map pins and duplicate warning reflect real API |
| M3 | M1 | Boardings, ads, owner privacy-safe DTOs, availability, price state | List/Map shows correct visibility and freshness |
| M2 | M3 | Canonical-place identity and duplicate links | Owner claim doesn't create duplicate property |
| M3 | M4 | Owner-controlled fields vs proposed community changes | Student contribution never mutates official field |
| M2 | M4 | POI and route-segment identities | Reports attach to canonical place/segment |
| M5 | M1–M4 | Auth actor and property authorization interfaces | Unauthorized writes denied in real mode |
| M1–M4 | M5 | E2E routes, test fixtures and privacy invariants | Release gate passes all flows |

**Ownership arbitration:** if M2/M3 both need a new boarding-place column, M2 owns core `places` schema, M3 owns boarding detail tables, and shared migration changes get explicit review. Avoid two simultaneous migrations targeting the same structural invariant.

---

## 9. Git & GitHub — mandatory human-only workflow

### 9.1 Rules for all development sessions

**ONE ISSUE = ONE BRANCH = ONE PR.** `main` is always protected from unreviewed direct feature commits (even for a solo developer). Prefer feature branches against current `main` with descriptive names.

**Only the human user performs:** creating branches, staging, committing, pushing, opening PRs, merging and deleting branches. A coding assistant can **suggest** exact commands but **must never execute them**. If asked to automate development, it still stops at Git handoff boundaries.

At the beginning of each issue, assistant MUST print:

```text
GIT CHECKPOINT — BEFORE IMPLEMENTATION (HUMAN ACTION REQUIRED)
Issue: UNI-### — <task title>
Suggested branch: feat/uni-###-<short-name> [or chore/fix/docs/test]
Run yourself:
  git status
  git switch main
  git pull --ff-only origin main
  git switch -c feat/uni-###-<short-name>
Assistant will touch: <exact paths>
Acceptance/test command: <exact commands>
After you create the branch, development of this issue can proceed.
```

At the end of an issue, assistant MUST print:

```text
GIT CHECKPOINT — AFTER IMPLEMENTATION (HUMAN ACTION REQUIRED)
Issue: UNI-### — <task title>
Implementation summary: <files + behavior>
Tests performed: <command and honest PASS/FAIL>
Unresolved limitations: <if any>
Suggested commit: <type(scope): description>
Run yourself:
  git status
  git diff --check
  git diff
  git add <only files for this issue>
  git commit -m "feat(scope): <specific change>"
  git push -u origin feat/uni-###-<short-name>
Open PR into main; review and merge it yourself after checks pass.
Next issue: UNI-### (begin only after handoff).
```

Never claim a branch exists until confirmed. Avoid `git add .` when unrelated files exist, and never force-push shared branches without explicit human decision.

### 9.2 Commit and branch naming

- Branches: `chore/uni-001-bootstrap`, `feat/uni-010-university-search`, `feat/uni-024-public-pois`, `feat/uni-036-boarding-privacy`, `feat/uni-048-community-recommendations`, `feat/uni-062-walking-observations`, `feat/uni-082-owner-verification`, `test/uni-071-privacy-regressions`, `docs/uni-003-ui-contracts`.
- Commits: conventional `feat(web): add campus selector`, `feat(geo): implement POI duplicate candidates`, `fix(boarding): prevent hidden coordinate leak`, `test(auth): deny unauthorized fee changes`, `docs(project): update progress checklist`.
- Scope names: `web`, `geo`, `boarding`, `community`, `routes`, `auth`, `ops`, `db`, `project`.
- PR description includes issue link, scope, screenshots for UI, migration notes, tests, privacy impacts, and reviewer checklist.
- In team mode: at least one teammate review critical authorization/migrations; solo mode: run all checks and self-review diff before merge.

### 9.3 Repo bootstrap — HUMAN ONLY

Create your remote GitHub repo and choose whether to initialize it with README. Exact commands depend on existing remote; check `git status` and `git remote -v` before following commands. In a new local project with no repo, the human may run:

```bash
mkdir unihood && cd unihood
git init -b main
# Copy this specification to the repo root, then create the bootstrap files.
git add README.md UniHood_MASTER_PROJECT_SPECIFICATION.md
git commit -m "docs(project): initialize UniHood specification"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

**Do not run these commands automatically.** If the remote already exists, clone/open it instead of reinitializing. A coding assistant should not create or mutate the Git repository for the user.

### 9.4 Git checkpoints are phase gates, not implementation tasks

Implementation can be done by one developer/assistant, but **the human retains Git control**. A documented check is not a Git operation. The development plan therefore includes explicit handoffs both before and after every task. If the user hasn't created the requested branch, do not assume you're on it and modify unrelated shared branches.

---

## 10. Development roadmap — complete ordered phases

> **Execution principle:** Follow these phases in order. Five people may parallelize tasks inside a phase if shared contracts exist; one person can perform them sequentially. Every numbered task has a branch checkpoint under §9. Avoid writing throwaway mocks that look like production data. **Identity/owner registration is the FINAL feature phase.**

### Phase 0 — scope freeze and engineering bootstrap (M1+M5, M2 review)

**Outcome:** reproducible monorepo, approved rules and UI tokens, contracts baseline.

- [ ] **UNI-001** Create repository structure, pnpm workspace, Next.js app, NestJS API, shared contracts, `.env.example`, `.gitignore`, README.
- [ ] **UNI-002** Docker Compose PostGIS development/test DB, migration/seed tooling, `health` endpoint, test scripts.
- [ ] **UNI-003** Implement Campus Teal semantic tokens plus **Editorial Explorer + Urban Map** UI library: typography, responsive site header, photo-led listing cards, search/chips, map rail/popup, buttons/inputs/modal/status/privacy badges.
- [ ] **UNI-004** Record product ADRs for privacy modes, `student ad only`, owner official fields, exception-only governance, final registration deferral.
- [ ] **UNI-005** Define REST DTOs/enums, OpenAPI baseline and development actor adapter (local/test only; external writes denied).
- [ ] **UNI-006** CI setup for lint/typecheck/test/build, shared branch/PR template, synthetic fixture guidelines and coding conventions.

**Manual Git handoffs (examples; one branch per item):**

| Issue | Suggested branch | Suggested commit message |
|---|---|---|
| UNI-001 | `chore/uni-001-workspace-bootstrap` | `chore(project): bootstrap UniHood monorepo` |
| UNI-002 | `chore/uni-002-postgis-dev` | `chore(db): add reproducible spatial database` |
| UNI-003 | `feat/uni-003-campus-teal-design-system` | `feat(web): add Campus Teal design system` |
| UNI-004 | `docs/uni-004-product-decisions` | `docs(project): lock privacy and role boundaries` |
| UNI-005 | `feat/uni-005-api-contracts` | `feat(api): add typed contracts and actor abstraction` |
| UNI-006 | `chore/uni-006-ci` | `chore(ci): add quality gates and PR template` |

**Checks:** `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, Docker database starts, migration applies and rolls back, web/API health pages load; CI checks pass. **Do not call this phase complete if commands exist but fail.**

### Phase 1 — public discovery shell and university navigation (M1+M2)

**Outcome:** guests can navigate the real app and select a university/campus/gate.

- [ ] **UNI-010** Seed university/campus/entrance model and APIs; verify pilot data or clearly label demo fixtures.
- [ ] **UNI-011** Editorial Explorer landing page (UI-01), university selection and university-specific QR URL routing, including photo provenance and responsive hero/featured cards.
- [ ] **UNI-012** Urban Map responsive shell (UI-03): desktop results rail, floating filters/selected preview, mobile bottom sheet, map/list toggle, URL query state and standard loading/empty/error states.
- [ ] **UNI-013** MapLibre integration with licensed/configurable tile provider and attribution; graceful list fallback.
- [ ] **UNI-014** Refined listing/search/filter shell with editorial cards, saved favourites in local storage (client-only guests), stable share links.
- [ ] **UNI-015** Keyboard/screen-reader/mobile smoke tests, first Playwright happy path, and visual review at 390×844 and 1440×900 against approved UI-01/UI-03 concepts.

**Git:** one `feat/uni-01x-...` branch per issue; suggested example `feat/uni-011-landing-university-picker` → commit `feat(web): build campus-first landing workflow` → user pushes and opens PR.

**Checks:** guest opens QR URL without signing in, changes campus entrance, sees appropriate map+list shell, no real unsupported distance claims, navigation works at mobile/desktop, map failure has retry/list fallback.

### Phase 2 — public POIs and canonical duplicate engine (M2+M1)

**Outcome:** community essential-service discovery works on the map; duplicate candidates are identified without false merges.

- [ ] **UNI-020** SQL migrations for `buildings`, `places`, POI categories, source refs, aliases, public locations; spatial/text indexes.
- [ ] **UNI-021** Public category layers and `GET /places` bounded search, sorting, pagination.
- [ ] **UNI-022** POI detail and nearby-service result card with source/freshness labels.
- [ ] **UNI-023** Name normalization and `ST_DWithin`/`pg_trgm` candidate scoring with synthetic dataset.
- [ ] **UNI-024** Duplicate warning API and UI; choosing `update existing` vs `distinct with reason`.
- [ ] **UNI-025** Backend idempotency, transactional double-check, pending source references and concurrency tests.
- [ ] **UNI-026** Public-service addition draft/proposal path (local mock actor only until final registration), with robust moderation states.
- [ ] **UNI-027** Provider/license documentation and import strategy; do **not** batch request OSM public Nominatim.

**Git:** examples `feat/uni-020-place-geography`, `feat/uni-023-duplicate-matcher`, `test/uni-025-concurrent-poi-submission`; commit after each passing vertical slice.

**Checks:** pharmacy, restaurant, clinic and hardware examples filter correctly; same-place typo creates candidate; two real businesses sharing a building remain distinct; second concurrent submit doesn't produce a duplicate; no auto-destructive merge.

### Phase 3 — boardings, advertisements, privacy and vacancy (M3+M1+M2)

**Outcome:** students can browse all advertisement kinds, while exact map pins are restricted to owner-public-mode records.

- [ ] **UNI-030** Canonical boarding/property, unit, listing and media schema; `boarding` public DTO with all visibility variants.
- [ ] **UNI-031** Advertisement feed, community recommendation vs official owner ad badges, detail page, list filters.
- [ ] **UNI-032** Owner listing wizard UI (local-only actor and publish disabled outside dev), basic property fields, media consent.
- [ ] **UNI-033** `PUBLIC_MAP` / `AREA_ONLY` / `HIDDEN` data rules, serializer filters and owner preview.
- [ ] **UNI-034** Map pins endpoint yields **owner-consented PUBLIC_MAP only**; revoke/visibility switch clears cache and map.
- [ ] **UNI-035** Rooms/beds inventory and owner official pricing (LKR, period, deposit, revision history) behind `PermissionService`.
- [ ] **UNI-036** Vacancy confirmation, expiry/unknown logic, last-confirmed labels and owner controls.
- [ ] **UNI-037** Media upload validation, private phone controls, EXIF stripping and audit events.
- [ ] **UNI-038** Boarding details, comparison and nearby essentials only for eligible precise public locations.
- [ ] **UNI-039** Comprehensive privacy-contract tests across list, detail, map, route, SEO, cache, search and media.

**Git:** examples `feat/uni-030-boarding-model`, `feat/uni-033-visibility-controls`, `feat/uni-035-owner-pricing`, `test/uni-039-hidden-location-regressions`.

**Checks:** a community ad has no official fee/confirmed availability; student cannot publish an exact boarding point; map shows only authorized public boarding; hidden ads reveal no precise info; `AREA_ONLY` contains only selected nonrevealing locality; stale vacancy becomes unknown; owner price API refuses unauthorized actor in tests.

**Security gate:** if production authorization is not yet implemented (expected), keep public owner-write/contributor-write feature flags **OFF**. Continue local end-to-end simulations through test adapters only.

### Phase 4 — community recommendations, reviews and self-service corrections (M4+M1+M2+M3)

**Outcome:** a community contributor can suggest a boarding **ad**, suggest a public POI or correction, and report misinformation without bypassing owner controls.

- [ ] **UNI-040** Contribution hub and `Recommend Boarding` student flow (no exact pin field anywhere).
- [ ] **UNI-041** Detect duplicates for location-hidden/area-only advertisements using privacy-safe evidence; attach contributions to canonical record.
- [ ] **UNI-042** POI edit suggestion, wrong category, closure/moved reports and contribution status/history.
- [ ] **UNI-043** Structured review schema and UI, rate limits, self-review conflict prevention, confidence and source labels.
- [ ] **UNI-044** Structured reports, confidential evidence storage, privacy takedown process and appeals status.
- [ ] **UNI-045** Risk rules for routine auto-publication vs hold/escalate; do not treat vote threshold as proof.
- [ ] **UNI-046** Contact/Request Location UI for owner ads (mock request locally until auth/contact policy finalized).
- [ ] **UNI-047** Multi-contributor, multi-owner and false-claim regression scenarios (fixtures; final claim auth later).

**Git:** examples `feat/uni-040-community-boarding-ads`, `feat/uni-044-privacy-reporting`, `test/uni-047-role-boundary-cases`.

**Checks:** student contribution cannot change official fees, visibility, map pin or owner phone; duplicate community ads link to existing canonical record; inappropriate data held; route report unavailable if no segment; support escalation status works without a general admin dashboard.

### Phase 5 — walking routes, neighborhood profiles and advanced discovery (M2+M4+M1)

**Outcome:** reliable route-conditioned discovery for owner-published boarding locations, with honest uncertainty indicators.

- [ ] **UNI-050** Pedestrian routing provider adapter and local deterministic fixtures.
- [ ] **UNI-051** Campus gate → owner public boarding entrance routes, alternative paths where provider supports them.
- [ ] **UNI-052** Nearby essentials for a public boarding: provider walking time if available, else `unavailable` / explicitly tagged approximation.
- [ ] **UNI-053** Route segments and day/night structured observation reports; capture date, source/confidence and issue types.
- [ ] **UNI-054** Route card design (lighting, footpath, traffic, flooding, obstructions, activity); don't promise safety.
- [ ] **UNI-055** Neighborhood comparison filters and optional transparent convenience metric using only eligible public geo.
- [ ] **UNI-056** Route privacy, confidence, stale reports, cancellation, timeouts, alternate/no-route tests.

**Git:** examples `feat/uni-050-pedestrian-routing`, `feat/uni-053-route-condition-reports`, `test/uni-056-route-privacy`.

**Checks:** route unavailable does not turn into a guessed time; route results never accept hidden/area-only boarding as a public destination; day/night reports do not become an absolute safety grade; nearby-service comparison recalculates when campus gate changes.

### Phase 6 — end-to-end hardening before final registration (M5 leads, everyone supports)

**Outcome:** local/test app is coherent; security boundaries and deployment interfaces are ready for final account choices.

- [ ] **UNI-060** Cross-module E2E flows for guest search, POI add mock, community ad mock, owner map/ad mock, privacy toggles.
- [ ] **UNI-061** WCAG 2.2 AA audit, keyboard/screen reader passes, mobile and low-bandwidth tests; fix violations.
- [ ] **UNI-062** API validation, rate limiting, upload controls, log redaction, idempotency and access guards.
- [ ] **UNI-063** Backup/restore and migration rollback drill with synthetic database.
- [ ] **UNI-064** Monitoring/alerts/health checks, environment config, feature flag docs and no secret leakage.
- [ ] **UNI-065** Terms/privacy drafts, emergency correction contact, source licensing/attribution audit, no fake university endorsement.
- [ ] **UNI-066** Pilot usability scripts for student and owner tasks; track results, issues and acceptance criteria.
- [ ] **UNI-067** Owner registration decision worksheet completed for team approval (no implementation yet).

**Git:** examples `test/uni-060-cross-module-e2e`, `chore/uni-064-observability`, `docs/uni-067-registration-decision-log`.

**Checks:** full E2E suite, app builds, tests and licensing audits pass; external/public write operations still deny access absent final auth; backup actually restores data; no remaining high-severity hidden-location leaks.

### Phase 7 — FINAL feature development: registration, roles and owner authorization (M5, M3 integration)

> **MANDATORY ordering constraint:** Do **not** select provider or implement final signup/owner proof until the team is ready to resolve the OPEN questions in §11. The project may otherwise be built and tested with local-only actors. **Public contribution/owner publication cannot launch without this phase.**

- [ ] **UNI-070** Finalize signup policy: guest vs contributor, supported email/Google/phone providers, user account linking and session recovery.
- [ ] **UNI-071** Implement authentication provider with verified identities, CSRF/security protections as applicable and secure sessions.
- [ ] **UNI-072** Implement optional university/student verification (only if needed); do not require NIC/university ID for public search.
- [ ] **UNI-073** Finalize and implement proof-of-ownership/manager-authorization procedure, pending states and disputes.
- [ ] **UNI-074** Implement scoped `property_memberships`/permission guards (`canPublishMap`, `canSetPrice`, `canConfirmVacancy`, `canManageContact`) across all write endpoints.
- [ ] **UNI-075** Implement claim-existing community recommendation and canonical dedup preservation; no double property creation.
- [ ] **UNI-076** Implement account recovery, revoke access, optional co-manager invitation, account privacy/export/deletion process as applicable.
- [ ] **UNI-077** Connect UI account screens, contribution history, owner access states, logout/error handling and onboarding translations.
- [ ] **UNI-078** Security/E2E adversarial suite: account takeover, fake owner claim, one owner two properties, two owners one building, unauthorized location reveal, bulk signups, phone changes, disabled member, API IDOR.
- [ ] **UNI-079** Turn on production feature flags only after all tests, policy approvals and operator escalation contacts are ready.

**Git:** examples `feat/uni-071-identity-provider`, `feat/uni-073-owner-claims`, `feat/uni-074-property-permissions`, `test/uni-078-auth-adversarial`.

**Checks:** anonymous guests can browse; contributors cannot owner-manage; a verified property manager can edit only that property; a different owner cannot edit it; no contact-only claim grants ownership; account recovery does not bypass role revocation; mock actor adapter impossible to enable in production. No unresolved critical owner-dispute/privacy issues.

### Phase 8 — release, pilot and improvement loop (M5 coordinates all modules)

- [ ] **UNI-080** Deployment configuration, HTTPS/domain, staging and production environment separation, backups and restore.
- [ ] **UNI-081** Real-data pilot with consented boarding owners, public POI sources, verified campus gates and map provider quota limits.
- [ ] **UNI-082** Document local field audits, duplicate false positives, vacancy freshness, owner update time and student search task outcomes.
- [ ] **UNI-083** Campus QR campaign (permission secured, official domain printed, no false endorsement), SEO and share cards.
- [ ] **UNI-084** Release readiness: privacy/data handling review, source licenses, production auth, incident response, monitoring alerts, no fake demo facts.
- [ ] **UNI-085** Release tag/changelog (user creates it manually), version notes, backlog triage, post-launch correction process.

**Git:** examples `chore/uni-080-production-deployment`, `docs/uni-082-pilot-evaluation`; final release tag is a human Git action, e.g., after review `git tag v0.1.0 && git push origin v0.1.0` (human only).

**Checks:** staging smoke and regression pass, test record of public privacy visibility matrix, compliance review, owner authorization, no critical incident, monitoring and backup verified, incident operator reachable. If any gate fails, **do not publicly launch owner or community write features**.

### 10.1 Phase-level delivery map

| Phase | Main modules | Primary UI screens | Output | Public deployment policy |
|---|---|---|---|---|
| 0 Bootstrap | M1+M5 | Design shell | Runnable monorepo/CI | Internal only |
| 1 Discovery foundation | M1+M2 | UI-01..05, 14 | Public read prototype | Demo with synthetic data |
| 2 POIs/dedup | M2+M1 | UI-03,09,17,18 | Canonical public place map | Read-only pilot possible |
| 3 Boarding/ad/privacy | M3+M1 | UI-06..08,20..25 | Owner/ad model and local simulation | Write disabled without auth |
| 4 Community/trust | M4+M1 | UI-13,15,16,19,26,27 | Contribution/report workflows | Write disabled without auth |
| 5 Routes | M2+M4+M1 | UI-10,12,11 | Pedestrian/condition discovery | Read-only demo if data valid |
| 6 Harden | M5+all | All existing | Tested integrated product | No unprotected writes |
| 7 **Registration LAST** | M5+M3 | UI-28,29 | Actual identities/owners/claims | Write enable after security acceptance |
| 8 Release | All | End-to-end | Pilot/production | All gates pass |

---

## 11. Registration/owner verification — DECISIONS RESERVED FOR LAST PHASE

> **This chapter is a requirements placeholder, not approved authentication policy.** Its existence does **not** authorize developers to select an identity provider or force users to register now. Finalize as UNI-070 to UNI-079 in Phase 7, after public discovery, location privacy, advertisements, POIs, community proposals, and routes are built and tested with development-only actors.

### 11.1 Working assumptions (subject to team decision)

1. Guest browsing remains free/open; registration should not block QR entry.
2. One person can be a public contributor and an authorized owner of several properties. No duplicate account required.
3. Account verification (email/phone) is different from proving someone is a university student, and different again from proving permission to manage a boarding.
4. Official price, vacancy, exact map pin and public contact require **per-property authorized membership**, not a self-selected owner profile field.
5. Nobody can use the student contribution workflow to add a public precise boarding pin.
6. An owner can choose an ad without publicly revealing a location, even when the platform privately validates their connection to the property.
7. Any account claiming a property through a phone number alone must remain unverified for owner privileges; phone OTP proves access to a number, not ownership.
8. Claims/appeals need a low-volume exceptional human support mechanism; no daily university administrator required.
9. Collect minimum data, apply retention/deletion rules, store evidence privately and avoid blanket NIC collection.
10. Public owner writes stay disabled until final authorization and security tests pass.

### 11.2 Decision worksheet — complete just before Phase 7

| Decision to finalize | Default recommendation (NOT final) | Implementation consequence |
|---|---|---|
| Can guests contribute without accounts? | No; browsing remains open | Abuse/identity controls |
| Email, Google, phone OTP, or combination? | Email/Google first; consider phone flow for owners based on pilot | Provider, costs, account linking |
| Is university enrollment verification needed? | Optional, not required for basic participation | Avoid collecting unnecessary student IDs |
| How can an owner prove authorization? | Multi-evidence process with protected document/authorization checks | Secure claims store, support workflow |
| Can verified managers act on behalf of owners? | Yes with scoped delegation | Membership roles and revocation |
| Who resolves conflicting owner claims? | Restricted exceptional operator | Audited escalation and appeals |
| Can a verified owner manage multiple properties? | Yes | Property-specific ACL |
| What if an owner refuses all proof? | Allow only restricted unverified recommendation, no official owner privileges | Distinct publication status |
| How are verification files retained/deleted? | Minimum retention under reviewed policy | Encrypted object store, retention jobs |
| Contact exposure and location requests? | Owner consent; safe contact relay where feasible | Spam safeguards and consent tracking |
| Identity/account recovery methods? | Secure provider-based recovery with step-up for owner permissions | Prevent takeover of claimed properties |
| What is the minimum age policy? | Finalize with legal/privacy assessment | Child/minor treatment as applicable |
| How are affected contributors notified about claims/merges? | Private status notifications without doxxing | Notification templates |

### 11.3 Mandatory auth service interfaces available from Phase 0

```ts
export interface ActorContext {
  actorId: string | null;
  authStatus: 'GUEST' | 'VERIFIED_ACCOUNT' | 'LOCAL_TEST_ACTOR';
  memberships: Array<{ boardingId: string; permissions: string[] }>;
}

export interface IdentityProvider {
  resolveRequestActor(request: unknown): Promise<ActorContext>;
}

export interface PermissionService {
  canSuggestPlace(actor: ActorContext): Promise<boolean>;
  canManageProperty(actor: ActorContext, boardingId: string): Promise<boolean>;
  canPublishExactBoardingLocation(actor: ActorContext, boardingId: string): Promise<boolean>;
  canSetOfficialPrice(actor: ActorContext, boardingId: string): Promise<boolean>;
  canConfirmVacancy(actor: ActorContext, boardingId: string): Promise<boolean>;
}
```

**Security invariant:** in any non-test deployed environment before final registration, anonymous and unknown actors must fail all protected writes. A dev-only actor must require an explicit local/test environment, strong safeguards against accidental exposure and test isolation; never accept an arbitrary public `X-User-Id`/`X-Role` header as authentication.

### 11.4 Final-phase acceptance tests

- Guest searching requires no account; protected writes deny guest.
- Registered contributor can recommend an ad but cannot set official rent, `PUBLIC_MAP`, owner vacancy or other owner's contact.
- One owner can manage boarding A but cannot write boarding B, even when IDs are guessed directly via HTTP.
- Two managers can be authorized for the same property only through explicit delegation and revocable membership.
- A new/competing claim cannot hijack an already claimed property.
- An unauthorized owner claim never changes publication state or reveals private coordinates.
- Login/session expiry, user suspension, account recovery and ownership revocation all deny old authorizations.
- Consent withdraw/visibility hide works after an owner changes accounts or revokes manager access.
- Account deletion/privacy requests process correctly under the applicable policy.

---

## 12. Comprehensive problem, risk and solution register

Priority meanings: **P0** = must address before public launch; **P1** = strong MVP/early-post-launch requirement; **P2** = later enhancement. Owners refer to the modules in §8. Do not treat sample thresholds as proven industry standards.

| Risk | Problem / scenario | Proposed solution | Priority | Owner / evidence of completion |
|---|---|---|---|---|
| R01 | Fake boarding submitted as legitimate | Distinguish community vs official, owner verification and reports | P0 | M3/M4/M5; fake-owner test |
| R02 | Impersonated owner changes fees | Property-specific ACL + proof check + audit | P0 | M5/M3; API IDOR tests |
| R03 | Boarding owner doesn't want a map pin | Private/area ad options + explicit visibility consent | P0 | M3; privacy tests |
| R04 | Student exposes owner's exact residence location | No student map pins, EXIF strip, privacy classifier and removal | P0 | M3/M4; upload tests |
| R05 | Duplicate boarding ads | Canonical property and attach-new-contribution flow | P0 | M2/M3/M4; duplicate fixtures |
| R06 | Duplicate POIs with GPS drift | Spatial + fuzzy name + source IDs + recheck | P0 | M2; duplicate fixture suite |
| R07 | Two businesses same building wrongly merged | Unit/floor/operator distinction; no auto merge | P0 | M2; false-positive fixtures |
| R08 | One owner operates several properties | Property IDs not phone as identity, memberships per property | P0 | M3/M5; multi-property tests |
| R09 | Two owners claim same residence | Pending contested claim + exceptional escalation | P0 | M5; dispute tests |
| R10 | Stale vacancy marked available | Confirmation expiry to UNKNOWN, visible freshness | P0 | M3; clock-based tests |
| R11 | Unauthorized student edits official fee | Strict field ownership, server guards and price history | P0 | M3/M5; negative tests |
| R12 | Hidden listing reveals coordinates through API | Separate private geo storage/public DTO tests | P0 | M3/M5; privacy snapshot tests |
| R13 | Hidden address inferred from route/time | No routing/distance/local proximity on private ads | P0 | M2/M3; inference tests |
| R14 | Fake reviews / competitor harassment | Verified-state labels, self-review blocking, rate limits, reports | P0 | M4; abuse tests |
| R15 | Harmful allegations published automatically | Hold high-risk reports and allow appeals | P0 | M4/M5; moderation cases |
| R16 | Publicly exposed phone or verification document | Consent checks, access control, redaction, storage separation | P0 | M3/M5; leak tests |
| R17 | Unauthorized uploads/media rights | Consent statements, content checks, takedown | P0 | M3/M4; upload review |
| R18 | Route labeled objectively safe | Report conditions only, confidence and disclaimers | P0 | M4; copy and E2E tests |
| R19 | No route provider available | Error/timeout and fallback, never invent metrics | P0 | M2; provider-failure tests |
| R20 | Map/provider terms violated | Licensed provider/extract, attribution, no public API scraping | P0 | M2/M5; license checklist |
| R21 | QR codes used for phishing | Official domain visibly printed, HTTPS, controlled poster locations | P0 | M1/M5; campaign checklist |
| R22 | App demands signup before browsing | Guest public read paths and QR entry smoke tests | P0 | M1/M5; E2E |
| R23 | No human recourse for urgent privacy report | Narrow exceptional support workflow, contact, audit | P0 | M4/M5; escalation drill |
| R24 | Data breach and sensitive analytics | Minimize data, redact logs, access controls, retention policy | P0 | M5; security audit |
| R25 | Production exposes local mock login | Hard fail dev adapter outside test/local; deploy check | P0 | M5; deployment security test |
| R26 | Incorrect building entrance pin | Explicit entrance placement/verification; correction proposals | P1 | M2/M3; field audit |
| R27 | An owner has little technical confidence | Short owner wizard, large buttons, minimal mandatory fields | P1 | M1/M3; usability test |
| R28 | Student with poor internet access | Lightweight web, progressive images, list fallback | P1 | M1; throttled network test |
| R29 | Ambiguous neighborhood for hidden ad | No precise map claim; optional owner-selected locality | P1 | M3; privacy review |
| R30 | Different beds have different prices | Unit-level official prices and occupancy | P1 | M3; multi-unit tests |
| R31 | Rent excludes deposit/water/electricity | Itemized official charges, unknown fields not estimated as facts | P1 | M3; price UI check |
| R32 | Public place closed or relocated | Closure reports, source timestamps, moved history | P1 | M2/M4; state tests |
| R33 | Community verification manipulated | Source diversity, rate limits, signal analysis, no simple vote approval | P1 | M4; collusion tests |
| R34 | Incorrect campus starting point | Named gates, selection, route refresh, manual choice | P1 | M2/M1; multiple-gate test |
| R35 | Different language spelling breaks dedup | Unicode name normalization and alias storage | P1 | M2; Sinhala/Tamil fixture checks |
| R36 | False positive duplicate blocks legitimate addition | Distinct-place explanation and exceptional review | P1 | M2/M4; negative dataset |
| R37 | Concurrent adds create same entity | Idempotency and DB transaction recheck | P0 | M2; concurrency test |
| R38 | Wrongful merge destroys history | Survivor/redirect/snapshot/undo restricted merge | P0 | M2/M5; restore test |
| R39 | Users mistake community ad for official owner listing | Prominent publisher badges and official-field boundaries | P0 | M1/M3; usability test |
| R40 | No owner joins; map remains sparse | Public community ads + easy future owner claim flow | P1 | M3/M4; adoption measures |
| R41 | Missing nearby pharmacy/clinic information | Public POI submissions plus licensed seed data | P1 | M2/M4; field survey |
| R42 | Inaccurate service hours | Source/last-checked labels and closure reporting | P1 | M2/M4; freshness checks |
| R43 | Inferred neighborhood score biases choices | Transparent eligible inputs and per-user preference controls | P2 | M1/M2; explanation tests |
| R44 | Excessive review/POI spam | Abuse limits, statuses, report queues | P0 | M4/M5; load/abuse test |
| R45 | No funding for hosting or media | Budget, quotas, compression, paid-feature separation | P1 | M5; monthly spend review |
| R46 | Five members conflict in migrations/screens | Clear module ownership and contract PR process | P1 | All; integration PR checklist |
| R47 | Campus launch lacks accurate local data | Consent-based pilot and field audit | P1 | M2/M5; dataset report |
| R48 | Stakeholders mistake prototype for real service | Synthetic labels, test environment banner, honest demo claims | P0 | All; release gate |
| R49 | Changes to personal data law overlooked | Track DPA notices and legal readiness before release | P0 | M5; legal checklist |
| R50 | Public ads contain paid promotion disguised as ranking | Sponsorship transparency and no undisclosed ranking manipulation | P2 | Product/M5; future policy |
| R51 | Essential service and boarding share same coordinates | `Building` + distinct `Place` and category model | P0 | M2; building fixture |
| R52 | Private-area search filters leak position | No fine-grained bbox or exact distance of private ads; API regression | P0 | M2/M3; geolocation privacy tests |

### 12.1 Pilot measurement targets (examples; validate with actual field research)

| Measure | Initial proposed target / test |
|---|---|
| Duplicate active-place incidence | <2% in audited sample; investigate sampling bias |
| Wrong destructive merges | Zero in pilot |
| Map entrance accuracy | >=95% in field-checked sample of owner-public locations |
| Available status freshness | >=90% of displayed confirmed-available items have in-policy owner confirmation |
| Typical owner vacancy update | Under 30 seconds in observed usability tests |
| Search task success | Majority of test users identify a suitable *candidate* within 3 minutes |
| Critical privacy report response | Initial triage within 24 hours, with faster emergency suppression where warranted |
| Mobile accessibility | WCAG 2.2 AA targeted; documented testing failures/repairs |
| Route condition accuracy | Reports show time context and evidence recency; no safety guarantee |

These are team **target hypotheses**, not measured outcomes. Do not publish them as claims until a pilot confirms them.

---

## 13. Testing strategy and acceptance matrix

### 13.1 Test layers

1. **Unit:** name normalization, duplication signals, vacancy freshness, currency formatting, privacy policy guards, role permissions, visibility state machine, condition classifications.
2. **Database integration:** real PostGIS and `pg_trgm`, geometry index, migrations up/down, canonical references, concurrency, identical external source ID handling.
3. **API integration:** DTO validation, `401/403/404/409/422/429`, owner permissions, private field nonexposure, idempotency, stale state transitions, report lifecycle.
4. **UI component:** keyboard interactions, contrast, form errors, privacy previews, source badges, language width, no fake exact distances.
5. **Playwright E2E:** guest QR → map/list → detail; add public POI → duplicate warning; student boarding ad draft; owner visibility mode; report issue; route unavailable fallback; full registration flows only after final phase.
6. **Security/abuse:** IDOR, cross-property write, mass submission, sensitive file/media upload, XSS/CSRF where relevant, SQL injection, secrets/log leaks, account recovery and role revocation.
7. **Performance:** map/list with realistic-but-synthetic fixture volumes, low-end Android viewport, 3G-like connection, server pagination, tile budget and route cache miss.
8. **Field/usability:** verify sample campus entrances, community services and owner setup with actual consented participants.

### 13.2 Required privacy matrix

Test **each** public endpoint (`/boardings`, `/boardings/:id`, `/boardings/map`, `/routes`, `/essentials`, `/search`, preview metadata/SEO) under all three modes:

| Visibility | Public exact lat/lng | Public locality | Precise routes/distance | Map pin | Contact |
|---|---:|---:|---:|---:|---|
| `PUBLIC_MAP` | Owner-consented only | If approved | Yes if provider supports | Yes | Only if consented |
| `AREA_ONLY` | **Never** | Owner-selected broad area | **Never** | No exact pin | Only if consented |
| `HIDDEN` | **Never** | No locality unless separately authorized generic city | **Never** | No | Only if consented |
| Community boarding ad | **Never** | Only permitted general info | **Never** | No | No unconsented private phone |

Also inspect browser network responses, cache keys, media EXIF, QR links, HTML metadata, search autocomplete, sorting by location and rate-limited errors for inference leaks.

### 13.3 Golden E2E scenarios and expected results

| ID | Scenario | Expected |
|---|---|---|
| E2E-01 | Guest scans official university QR | Explore opens without login |
| E2E-02 | Switch campus entrance | Relevant public walking results refresh; unavailable shows properly |
| E2E-03 | Search owner-public boarding | Map pin and card agree; owner consent visible |
| E2E-04 | Browse hidden owner ad | No map pin, exact route, precise distance, address or inference leak |
| E2E-05 | Student recommends boarding | Advertisement-only workflow, no exact pin or official rent |
| E2E-06 | User enters known pharmacy | Duplicate suggestions, existing place update action |
| E2E-07 | Adjacent businesses added | Remain separate legitimate POIs |
| E2E-08 | Owner changes vacancy | Freshness update; later expiry → unknown |
| E2E-09 | Unverified actor edits fee | Denied server-side, not only by UI |
| E2E-10 | Owner toggles `PUBLIC_MAP` to `HIDDEN` | Removes pin, distances, routes, caches and share metadata |
| E2E-11 | Community feedback reports wrong fee | Official fee unchanged, discrepancy/report recorded |
| E2E-12 | Similar community recommendation twice | Reused canonical record and separate contribution events |
| E2E-13 | Routing service errors | Graceful unavailable, no made-up duration |
| E2E-14 | Two different owners in one building | Separate place/boarding records and permissions |
| E2E-15 | Negative review by real contributor | Reportable but not silently auto-deleted by owner |
| E2E-16 | Private data exposed in upload | Held/stripped/takedown route works |
| E2E-17 | Production feature flag before auth | Protected write endpoints disabled/denied |
| E2E-18 | Final verified owner of property A edits B | Denied and logged without leaking B private fields |
| E2E-19 | Conflicting owner claim | Pending, no privileged access granted |
| E2E-20 | PR checks after module integration | lint + typecheck + tests + build + E2E pass |

### 13.4 Definition of done for every issue

- [ ] Acceptance criteria from specific `UNI-###` issue met and manually smoke-tested.
- [ ] Required unit/integration/E2E tests added or reason documented.
- [ ] No new field exposure or owner-permission bypass; privacy review included.
- [ ] Accessible loading/empty/error states and responsive behavior included.
- [ ] Database migrations/rollback documented if schema changed.
- [ ] API/contract changes documented for other modules.
- [ ] `.env.example`, README and progress log updated for new runtime requirements.
- [ ] No secrets, fake live data, orphan code, unused endpoints or dead UI buttons.
- [ ] Assistant reports tests **honestly** including not-run cases.
- [ ] Human performs branch/commit/push/PR/merge following §9; assistant does not.

---

## 14. Operational launch, rollout and incident management

### 14.1 Local vs staging vs production

| Environment | Allowed data | Write access | Identity | Key restrictions |
|---|---|---|---|---|
| Local | Synthetic fixtures and explicit consented test entries | Local/test actor adapter only | Simulated actors permitted behind dev guard | Never exposed publicly |
| CI/test | Synthetic fixtures, disposable DB | Automated test actors | Test identity provider | No external owner data, no real outreach |
| Staging | Consented pilot content, no secrets in repo | Disabled until real auth; then restricted real test accounts | Production-like security | Prominent staging indication |
| Production | Licensed/consented real data | Only after Phase 7 passes | Final verified identity/authorization | TLS, monitoring, incident contact, backups |

### 14.2 Minimum deployment checklist

- [ ] TLS, approved domain, correct DNS/security headers and CORS policy.
- [ ] Server authorization and rate limits; local mock actor cannot be activated in production.
- [ ] Protected media buckets, signed URLs where needed, content/EXIF checks.
- [ ] DB automatic backups and documented restoration tested in staging.
- [ ] Database migration rollout/rollback strategy with no destructive uncontrolled merges.
- [ ] Tile/geocoding/routing provider license, attribution, quotas and caching confirmed.
- [ ] Consent statement, privacy notices, user reports/appeal channel, data deletion/retention procedure.
- [ ] Public search, ads, public POIs, location hiding, route fallback and owner ACL all tested.
- [ ] Synthetic sample data removed or unmistakably labeled; no fake university approval.
- [ ] Site-wide error monitoring with secrets/private location redacted.
- [ ] Ownership/dispute operator coverage exists even though routine admin roles don't.
- [ ] Release and rollback runbook; human manually creates Git release tag.

### 14.3 Incident workflow

1. Detect via user report, observability or support contact.
2. Classify: `P0 privacy leak / account takeover / invalid owner publish`, `P1 wrong active location / serious abuse`, `P2 minor data correction`.
3. Protect affected users first: disable relevant record/field, revoke access/session, stop publication as necessary.
4. Preserve minimal audit evidence without retaining unnecessary personal information.
5. Identify cause, rollback/revoke cache, repair schema/guard, run regression suite.
6. Notify affected people/regulators as required by applicable law and provider commitments; obtain legal advice if uncertain.
7. Log root cause and preventive action in `docs/verification/incidents/` without dumping private data.

### 14.4 Data lifecycle & retention

- Define explicit retention for ownership claims, contact verification, media, deleted ads, reviews, reports and analytics; review with applicable privacy law.
- Never store precise student walking history by default; route condition reports attach to segments, not daily movement profiles.
- Avoid including hidden coordinates in automated analytics. Use coarse aggregation only when compatible with consent and privacy.
- Provide clear account deletion, contribution removal/dispute and export options as applicable after registration is finalized.
- Privacy requests and urgent takedowns require a reliable support channel even in an automation-first model.

### 14.5 QR distribution strategy

- Campus-specific QR opens official `https://<your-domain>/u/<campus-slug>` (replace placeholder only after domain selected).
- Print the real official domain text beneath the QR and short trust explanation.
- Get permission before placing posters on university property; no inferred university endorsement.
- Include shareable web URL for students who can't scan or use desktop.
- Use privacy-preserving metrics (visits, completed searches, owner claims where consented); avoid exact GPS tracking.

### 14.6 Ethical sustainability ideas (later)

- Free core student discovery as baseline.
- Optional owner extras (availability reminders or enhanced management) only if they don't compromise user privacy or hide essential truth.
- Transparent sponsorship, never secretly rank unsafe/inaccurate ads above better matches.
- Possible university/community partnership if formally agreed; no automatic partnership assumed.

---

## 15. Project management, artifacts and documentation conventions

### 15.1 Minimum artifacts per module

| Module | Required files/docs |
|---|---|
| M1 | `docs/ui/screen-index.md`, `docs/ui/design-tokens.md`, responsive screenshots, keyboard/accessibility record |
| M2 | `docs/architecture/geo-data.md`, `docs/architecture/dedup-policy.md`, labeled duplicate fixture descriptions, provider/license memo |
| M3 | `docs/architecture/boarding-privacy.md`, visibility/public DTO tests, vacancy/price rules, media policy |
| M4 | `docs/policies/community-contributions.md`, `docs/policies/reviews-and-reports.md`, walking conditions methodology |
| M5 | `docs/architecture/system-overview.md`, `docs/verification/release-checklist.md`, registration decision record, auth tests, incident runbook |
| All | `docs/progress/PHASE-XX.md` and relevant ADRs/changes |

### 15.2 Issue template to create for every UNI task

```md
# UNI-### — <Short title>
Owner module: M#
Dependencies: UNI-### / none
Branch (human creates): feat/uni-###-short-name
Status: Not started | In progress | Tested | Awaiting human Git action | Merged

## Goal
<one verifiable outcome>

## Paths to change
<exact owned paths; note shared migration/contract reviews>

## Implementation steps
1. ...
2. ...
3. ...

## Acceptance criteria
- [ ] ...
- [ ] ...

## Tests
- Command: ...
- Expected: ...

## Privacy/role review
<what must not become public or user-editable>

## Git checkpoint (human only)
Suggested commit: feat(scope): ...
PR target: main

## Evidence and caveats
<screenshots/logs or test outputs, issues not run>
```

### 15.3 Team weekly integration cadence (suggestion, no fixed deadlines)

- Share completed PRs and changed contracts, not unfinished claims.
- Review privacy/permission impact of cross-module changes.
- Integrate smallest vertical workflows frequently, keep main green.
- Maintain one blocker/issues board and decisions log.
- Compare team progress to §10 checklists; avoid duplicate work and long-lived branches.
- Solo developer: do this review at each phase boundary instead of a meeting.

### 15.4 If the project is paused or resumed later

Before continuing, inspect repository state, read this file and `docs/progress/PHASE-XX.md`, identify last merged UNI issue, run baseline checks and then display the next human Git branch checkpoint. Never infer that pending branches/commits were completed just because code files exist. Never ask to re-specify settled product rules already documented here.

---

## 16. Research references and legal/provider notes

These are starting resources, not endorsements or guarantees of live product functionality.

### 16.1 Comparable accommodation services (review before claiming differentiation)

- [ezboarding.lk](https://ezboarding.lk/) — Sri Lankan accommodation marketplace / directory to compare.
- [CampusBodima](https://campusbodima.lk/) — candidate accommodation comparator; verify live state before referencing features.
- [BoardMe.lk](https://www.boardme.lk/) — candidate accommodation comparator; verify live state.
- [Rooma.lk](https://www.rooma.lk/) — candidate student housing comparator; verify live state.

### 16.2 Engineering and mapping references

- [OpenStreetMap copyright / ODbL](https://www.openstreetmap.org/copyright) — attribution and database reuse considerations.
- [Official OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) — public tile servers have limits; no unapproved bulk downloads.
- [Official Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) — no public-instance autocomplete or systematic POI extraction; use extracts/licensed or self-hosted services.
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html) — indexed distance-based candidate search.
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) — fuzzy text match and indexing.
- [MapLibre GL JS documentation](https://maplibre.org/maplibre-gl-js/docs/) — web map rendering.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — web authorization/authentication and application security checklist.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — accessibility success criteria.

### 16.3 Sri Lanka data protection as of 15 November 2026

The Sri Lankan Data Protection Authority and Extraordinary Gazette No. **2498/16** (22 July 2026) specify **1 January 2027** as the commencement date for sections 2–3 and Parts I and III of the Personal Data Protection Act as amended. Other parts have separate commencement status. **Check the official authority's latest notices before release and obtain qualified legal review for relevant obligations.** Do not imply the whole Act becomes operational on a single date.

- [Sri Lanka Data Protection Authority guidance](https://www.dpa.gov.lk/guidelines)
- [Official DPA privacy/legal commencement notice](https://www.dpa.gov.lk/privacy-notice)
- [Extraordinary Gazette No. 2498/16 (22 July 2026)](https://documents.gov.lk/api/content-file-proxy?file=%2Fextra-gazette-content%2F2498-16_E_1785745588.pdf)

No legal or mapping statement in this specification substitutes for current provider terms, license review or legal advice.

---

## 17. Acceptance summary — definition of a completed UniHood pilot

A pilot is complete **only when all of the following are demonstrated, not merely described**:

- [ ] A guest can scan an official QR, choose campus/entrance, explore a real interactive map and open a boarding advertisement without creating an account.
- [ ] Map shows only owner-authorized exact boarding locations, plus approved community/public service POIs.
- [ ] Students can submit boarding **ad recommendations** but cannot publish boarding map pins or official fees.
- [ ] Owners may publish map/ad/hidden modes with explicit consent and change them without duplicate creation.
- [ ] Owner pricing and vacancy are correctly property-scoped and show source + freshness.
- [ ] Public map pins and private ads cannot be deanonymized through API, UI, route, search, SEO, cache or image metadata.
- [ ] The backend detects duplicate POIs/boardings without merging different businesses in one building.
- [ ] Community can suggest POI edits, submit reports and see contribution status; high-risk cases have exceptional resolution.
- [ ] Nearby essentials and eligible walking routes are shown with honest availability and uncertainty.
- [ ] Students cannot manipulate owner-controlled details, and owner A cannot control owner B's property.
- [ ] Full registration and owner verification policy is **finalized last** and secured before any public write feature is enabled.
- [ ] Responsive Campus Teal screens, tested accessibility and low-bandwidth behavior exist.
- [ ] Provider licensing, legal/privacy reviews, monitoring, backup/restore, and human exception contact are in place.
- [ ] All applicable tests pass, evidence recorded; **all Git branches/commits/pushes/PRs were done manually by the human project owner**.

### Final product summary for README / pitching

> **UniHood** helps university students discover boarding advertisements, owner-authorized map listings, and nearby essential services in one accessible website. Students can recommend boarding places without exposing their exact locations, while verified owners control official fees, vacancies and optional map publication. Community-maintained POIs, duplicate detection, data-freshness labels and walking-condition observations make the neighborhood easier to understand without pretending that subjective ratings guarantee safety. The platform is open to browse, requires no routine university administrators, and protects sensitive cases through controlled escalation.

---

## 18. Quick-start checklist for the next developer or AI assistant

1. Read this entire specification; do not silently reintroduce CampusNest naming, student boarding map pins, required admin moderation, or early registration.
2. Identify whether you are in a new empty repo or an existing UniHood repo. Do not mutate Git; request human to execute `git status`, `git remote -v`, and start `UNI-001` branch as applicable.
3. Display **GIT CHECKPOINT — BEFORE IMPLEMENTATION** for the next incomplete issue using §9 template.
4. After human branch confirmation, work only on that issue, using the owned paths and acceptance criteria in §8/§10.
5. Use synthetic local content, stable typed contracts and privacy-safe DTOs. If final auth is unavailable, simulate actors locally/test only and keep deployed writes closed.
6. Run the prescribed tests; update `docs/progress/PHASE-XX.md`, record failures honestly, do not claim a completed workflow from UI screenshots alone.
7. Display **GIT CHECKPOINT — AFTER IMPLEMENTATION**; the human stages, commits, pushes and merges the issue PR.
8. Proceed to the next issue in §10 in dependency order. Five-member teams coordinate interface changes, solo developer proceeds sequentially.
9. Keep **Phase 7 registration/owner verification LAST**. Do not deploy public write workflows until it is complete.
10. When all phase gates are satisfied, perform a small consented pilot and measure real data quality before expansion.

**Final source-of-truth rule:** If an older CampusNest document or screenshot conflicts with this document, this **UniHood v2.0 specification** controls product functionality and permissions. Illustrative visuals are style references only; actual user flows and privacy checks in this document take precedence.

---

*End of UniHood master specification — version 2.0, dated 15 November 2026. Technical defaults can be implemented without asking for a new prompt; registration policy and legally sensitive provider choices remain explicitly reserved for the scheduled final phase. Human Git actions are always required at the checkpoints.*
