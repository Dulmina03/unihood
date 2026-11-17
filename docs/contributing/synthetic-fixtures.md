# Synthetic fixture guidelines

Local development/CI uses clearly synthetic records. No fixture is a real Sri Lankan listing, campus entrance, owner identity, verified contact, live vacancy, route duration, review or production metric unless a later issue explicitly obtains and documents consent/licensing for its own pilot scope. Public demo text, fees, places and screenshots must visibly say synthetic/sample/illustrative. [Privacy ADRs](../decisions/README.md) apply to fixtures as well as implementation.

## Determinism and identity

Keep stable named fixtures and canonical API UUIDs; do not use randomness for expected business assertions. A UI-only demo identifier is not a canonical boarding ID. Random UUIDs/ports are appropriate for isolated temporary containers/resources to prevent collisions, not for invented live identities. Use fixed injected clocks/timezones for freshness; exercise past, future, exact expiry and invalid timestamps. Do not depend on today's date, network geocoding or a paid provider to make a test pass. Shared JSON schemas, runtime refinements and UI demo clocks have different purposes; state which validation is under test.

Re-use a canonical property when visibility or ownership state changes. Different businesses/operators in one building remain distinct; fixtures must cover that distinction rather than make coordinates globally unique. The existing synthetic 0,0 infrastructure probe is not a campus/boarding location. Sample geometry must never become production inventory.

## Privacy and authorization cases

Use explicit public-map owner, area-only owner, hidden owner and community ad cases; vary source and vacancy independently. Include current AVAILABLE/FULL, UNKNOWN, stale/future confirmation, missing price, explicit/revoked consent, unrelated property IDs and rejected community owner claims. Private canary strings/coordinates may exist only in isolated negative-test input and must not appear in public output/evidence. Never use real private data as a canary.

Identity fixtures are server-selected, explicitly local/test, disabled by default, and bound to the established synthetic adapter. No public header, cookie, account role or self-selected owner profile may grant property authority. Test staging/production/unknown configuration denials and property A/B/action separation. Fixtures do not finalize signup methods, student proof, owner evidence or sessions, and do not justify production write access.

No actual phone/address, credential, NIC/student ID, owner claim proof, unpublished media, reporter identity or private coordinate belongs in fixtures, logs, commits, screenshots or public bug reports. Use reserved/example values and synthetic labels without copying real people. Free text/media can disclose location even when structured coordinates are absent; tests must inspect nested payloads, errors, SEO/share data, routes, sorting and relevant derivatives. A checked schema alone is not full moderation or privacy proof.

## Storage, seeds and cleanup

Keep database fixtures isolated from development volumes. `pnpm db:test` must assert tmpfs/no persistent mounts, use its own test database/credentials/container and clean only resources it creates. Never point a test at production or delete/reset development data. Seeds must remain explicit, local/test guarded, idempotent and non-overwriting on conflicts. Preserve migration checksums, rollback ownership and PostGIS infrastructure; a fixture failure is not permission to cascade extensions or wipe data.

Always stop child servers/containers in finally and bound waits. Forced CI cancellation may interrupt cleanup, so use disposable hosted resources and never attach persistent data. Do not cache database directories or .env. A runner-only .env may be created from .env.example after checking it is absent; local runs preserve the user's existing file.

## Assets and evidence

Use licensed/consented illustrative media with provenance; strip GPS metadata and do not describe an illustrative interior as a real property. See [UI asset provenance](../ui/assets.md). Test evidence must remain synthetic and sanitized. CI browser evidence goes to UI_EVIDENCE_DIR in temporary storage; generating a new CI screenshot does not approve/replace a checked-in design reference. No automatic artifact upload is configured. Humans review logs/traces/screenshots before public sharing or committing evidence, particularly once real pilot data exists in a later phase.

Record fixture purpose, source/provenance, expected decision, privacy mode and clock assumptions alongside the owning test or fixture file. Keep samples minimal enough to understand why a boundary should pass or fail. Report actual results and untested cases honestly; community observations must never masquerade as owner-confirmed vacancy or price.

UNI-023's `infra/db/fixtures/poi-matching.synthetic.json` is an isolated integration dataset, not a persistent development seed or provider import. The owning harness proves tmpfs/loopback/database identity before inserting fictional shared buildings/public POIs/private exclusion placeholders. Meter drift/boundary points are generated with PostGIS; date-line/polar points are explicitly fictional. Cleanup targets only owned fixture UUIDs. A row temporarily marked VERIFIED tests environment filtering only and is not evidence of a real business verification. The broader private-boarding/media/submission matrix remains deferred as documented in the matching architecture; do not label rejected/unsupported workflows as implemented matches.

UNI-025 transaction fixtures are generated only inside the owning proven disposable DB harness. Names/actors are explicitly synthetic; public-business points at arbitrary coordinates are fictional, never real campus or business locations. A private boarding canary has no geometry. Private pending/source/reason rows never become public results. Cleanup affects only that initially empty fixture storage and owned canonical test IDs; production/persistent cleanup is not an issue command.

UNI-026 uses only Synthetic-prefixed in-memory drafts and fictional points. The seed expansion adds taxonomy codes, not new live inventory. Source text is illustrative; contact-hold canaries use an intentionally invalid +00000000000 number and example.invalid URL. Both PENDING and NEEDS_EVIDENCE remain private holds. Browser upstream receipts are bounded test-only mocks; separate owned contributor API/tmpfs tests prove persistence. No real free-text moderation certification or actual private contact/boarding data belongs in these tests.
