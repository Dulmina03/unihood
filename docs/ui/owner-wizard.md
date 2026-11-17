# Owner draft wizard — UNI-032

Specification §3.4, §4.2/4.8 owner task-based UI, UI-20/21/22 and exact §10 UNI-032. Depends on the canonical UNI-030 foundation, UNI-031 public advertisements and UNI-005 issued actor/property permissions. Five ADRs remain unchanged.

`/owner` offers List My Boarding and resume/manage session draft. `/owner/new` uses short steps: check existing public advertisements → basic fictional title/description/facilities → planned visibility → optional media acknowledgement → review/check authority/save. Search uses the real public `/api/boardings` adapter and shows its first bounded page. Inspect opens canonical public details in a new tab. Search results never confer ownership, clear duplicates or create/claim properties. Only the existing fictional adapter property A is addressed; unrelated canonical advertisement IDs are never substituted into owner capabilities.

Hidden is the default. Switching away from Area only clears its label. Area only allows two explicitly fictional broad labels. Public map remains an **unpublished planned choice**. No residential coordinate or private entrance is collected for publication. UNI-033 adds a separately guarded server-derived synthetic template preview: only an explicitly selected fictional public entrance and both acknowledgements permit its fictional coordinate in that preview; private modes contain no point. Explain external-copy limits. [Preview data/consent rules](../api/boarding-visibility.md). UNI-034 implements actual public map publication/revocation; UNI-035/036 inventory/pricing/vacancy; UNI-037 safe uploads/contact; final property proof/authentication remains Phase 7. There is no dead Publish, Upload, fee or vacancy control.

## Local synthetic demo

Keep existing `.env` and persistent data. No additional migration or database seed is required for the draft check. Existing optional UNI-031 advertisement fixtures can supply search suggestions; an empty public-ad response is also usable. In one terminal:

```sh
APP_ENV=local NODE_ENV=development ENABLE_SYNTHETIC_ACTORS=true SYNTHETIC_ACTOR=owner-a API_HOST=127.0.0.1 pnpm dev
```

Open `http://localhost:3000/owner` (or your configured WEB_PORT). Existing API base and WEB_PORT must agree with local configuration; use loopback only. Check advertisements, continue with fictional property A, use the fictional example, choose privacy, review and save. Reload, then explicitly choose Restore session draft and check advertisements again to resume. Do not enter real property details or personal information. Stop the simulator before sharing or deploying a server. `.env.example` keeps actor enablement false; no credentials/settings are changed by this issue.

## Server and storage boundary

`POST /api/v1/owner/boardings/{boardingId}/draft-check` is a **pure, no-store local/test validation operation**, not persistence or publication. It uses the existing IdentityProvider/PermissionService/global guard and requires an issued local/test actor with management permission for that exact property. Requested PUBLIC_MAP also checks exact-location capability; this is not actual map consent. Guests, contributor-only actors, unrelated properties, proxied/remote requests and staging/production fail closed. Arbitrary role/user headers grant nothing. There is no proxy forwarding browser requests into local owner privileges. Browser requests go directly to the loopback API with no credentials and bounded timeout/abort on editing/unmount; narrow existing loopback CORS applies to this exact route shape. No database writer, synthetic grant, canonical property, private location or publication is created.

Strict shared draft schema permits only version, Synthetic-prefixed bounded title, bounded description, deduplicated facility enums, planned visibility, fixed fictional locality or null, and media acknowledgement. Coordinates, address/contact fields, assets, authority claims, official fees and vacancy fields are rejected. Runtime cross-field checks also apply beyond JSON Schema/OpenAPI. Free-text schema checks are **not a moderation/private-text detection service**; the whole tool is restricted to fictional development input, never public publication.

After a successful check, only that validated draft is saved under `unihood:synthetic-owner-draft:v1` in **sessionStorage**, not localStorage, URLs, public responses or database. Restore validates again and discards corrupt/extra-field data; saving rechecks server authority. Storage failure leaves an honest in-memory fallback; no persistence success is claimed. Clear attempts to remove the session draft and reports unavailable storage accurately. Closing the browser session normally expires it; browser recovery settings can retain session storage, so do not use real/private content. A media acknowledgement neither grants rights to future files nor authorizes contact disclosure. There is no file input or upload.

## Accessibility and evidence

Native labelled fields, radios/fieldset legends and checkboxes, large task buttons, current-step semantics, post-commit heading focus, skip link, keyboard search and privacy choices. No marketing photo hero or new photographic assets: approved Campus Teal task-based owner direction, not an unapproved dashboard. Responsive single-column phone/tablet and desktop form/privacy rail. [Actual checks, screenshots and exclusions](../verification/UNI-032/README.md) distinguish mocked browser check receipts from actual Nest permission tests and isolated database regression. Existing UNI-031 approval does not approve this new wizard or certify manual assistive technology.
