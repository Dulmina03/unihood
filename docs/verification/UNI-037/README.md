# UNI-037 — Media upload validation, private contact safety and audit events

18 November 2026 (Asia/Colombo).
Branch: `feat/uni-037-media-contact-privacy` branched from clean synchronized `dev` (`4041385ac7ae606a3283d32f709e87986702e4af`).

## Scope & Implementation Summary

UNI-037 implements private owner media validation, metadata stripping, encrypted private contact handling, and property audit logs under all five privacy ADRs (0001–0005):

1. **Private Media Validation & Quarantine**:
   - Strictly bounded upload constraints: maximum 5 MiB file size, maximum 20 assets per property, JPEG/PNG/WebP format enforcement.
   - EXIF/XMP stripping via Sharp (`rotate()`, metadata stripped) converting inputs into sanitized WebP derivatives stored exclusively in a private dedicated storage directory outside web root.
   - Strict quarantine lifecycle:
     - `STAGING`: Registered upon initiation with unique client `requestKey`; enables recovery and idempotent retry if interrupted.
     - `ACTIVE`: Once metadata stripping and derivative generation succeed; private owner preview enabled via sanitized WebP blob streaming.
     - `REVOKED`: Upon owner consent withdrawal; derivative deleted from storage and record marked revoked.
   - EXIF/XMP canary tests verify GPS tags, camera metadata, and proprietary markers are completely excised from derivatives.
   - No malware scanning or virus clearing is claimed; all images remain flagged `PENDING` moderation and quarantined privately.

2. **Private Fictional Contact Protection**:
   - Strictly fictional telephone numbers in the reserved NANPA 555-0100 range (`+12025550100`).
   - Private AES-256-GCM authenticated encryption at rest using property-scoped keying; tag and initialization vector stored alongside ciphertext.
   - Masked projection (`•••0100`) presented in owner UI; raw telephone numbers never transmitted to browser or stored in plaintext.
   - Verification state remains `UNVERIFIED`; no carrier SMS or telephony claims made.
   - Sharing intent toggle defaults to false; sharing remains blocked until future identity/verification phases (Phase 7); no public contact exposure.
   - Tampered ciphertext or corrupted authentication tag fails closed and presents a dedicated recovery notice without silent replacement or exposure.

3. **Privacy Audit Event Ledger**:
   - Property-scoped immutable event ledger tracking `MEDIA_UPLOAD_STAGED`, `MEDIA_QUARANTINED`, `MEDIA_CONSENT_REVOKED`, `PRIVATE_CONTACT_SET`, and `PRIVATE_CONTACT_REMOVED`.
   - Linked to asset ID (where applicable) and timestamped in ISO 8601 UTC.
   - Paginated and accessible only to authorized property actor (`owner-a`).

4. **Owner-Facing Web Interfaces**:
   - `/owner/boardings/[id]/media`: Private image upload with explicit consent checkbox, incomplete staging recovery, private WebP preview modal, consent withdrawal modal, and paginated audit history.
   - `/owner/boardings/[id]/contact`: Fictional contact reference selection, private storage acknowledgement, optional sharing intent toggle, masked display, withdrawal action, and unreadable key recovery notice.

## Verification Results

### 1. Repository & CI Quality Gates
- `node scripts/check-repository.mjs`: **PASS** (1 workflow, security policies, isolated Compose test storage).
- `bash scripts/check-workflows.sh`: **PASS** (actionlint 1.7.12 checksum verified).
- `pnpm run lint`: **PASS** (0 errors, 0 warnings across whole workspace).
- `pnpm run typecheck`: **PASS** (0 errors across contracts, ui, api, web).
- `pnpm run build`: **PASS** (Nest.js API and Next.js Turbopack web production builds succeed).

### 2. Unit and Integration Test Suite
Command: `pnpm test`
- Root test runner: **13/13 passed**
- Contracts (`@unihood/contracts`): **75/75 passed**
- API (`@unihood/api`): **169/169 passed**
- Web component & unit tests (`@unihood/web`): **181/181 passed**
- **Total: 438 passed** (0 failed, 0 skipped)

### 3. Isolated Docker Database Suite
Command: `pnpm run db:test`
- Isolated PostgreSQL/PostGIS container run on tmpfs.
- All 35+ test groups **PASSED**.
- Migration `012_boarding_media_contacts` up/down rollbacks verified: clean DDL rollback, ledger integrity, refusal on populated tables, idempotency.
- Media upload validation, EXIF/XMP stripping, WebP derivation, staging interruption recovery, AES-GCM encryption/tag corruption, and audit events tested against real PostGIS database.

### 4. Playwright Browser Acceptance Suite
Command: `pnpm --filter @unihood/web test:ui`
- **94/94 browser tests PASSED** across mobile and desktop viewports.
- Tested `boarding-privacy.spec.ts`:
  - Quarantined image preview without public delivery.
  - Incomplete upload recovery and retry.
  - Image consent withdrawal and modal controls.
  - Fictional contact selection, masked display, and withdrawal.
  - Responsive reflow at 320px, 768px, and desktop widths.
  - Zero axe accessibility violations against WCAG 2.0/2.1/2.2 AA.
- Artifacts generated:
  - `owner-contact-desktop.png`, `owner-contact-desktop-full.png`, `owner-contact-desktop-axe.json` (0 violations)
  - `owner-contact-mobile.png`, `owner-contact-mobile-full.png`, `owner-contact-mobile-axe.json` (0 violations)
  - `owner-contact-tablet.png`
  - `owner-media-preview-desktop.png`, `owner-media-preview-desktop-full.png`, `owner-media-preview-desktop-axe.json` (0 violations)
  - `owner-media-preview-mobile.png`, `owner-media-preview-mobile-full.png`, `owner-media-preview-mobile-axe.json` (0 violations)
  - `owner-media-tablet.png`

### 5. Remote GitHub Actions CI Verification
Exact commit: **`f83e1f80a09e91ed0c99b6df4b974fe059694d1f`**
Workflow: `.github/workflows/ci.yml`

1. **Issue Run #59** (branch `feat/uni-037-media-contact-privacy`):
   - URL: [https://github.com/Dulmina03/unihood/actions/runs/44162588471](https://github.com/Dulmina03/unihood/actions/runs/44162588471)
   - Status: **SUCCESS** (all three jobs passed)
     - `Isolated PostGIS integration` in 1m27s: SUCCESS
     - `Workspace quality` in 1m25s: SUCCESS
     - `Component browser acceptance` in 6m10s: SUCCESS
   - Metadata recorded in [issue-run-59.json](./issue-run-59.json).

2. **Integration into `dev`**:
   - Clean synchronized `dev` was fast-forward integrated with `git merge --ff-only f83e1f80a09e91ed0c99b6df4b974fe059694d1f` and pushed to `origin/dev`.

3. **Dev Run #60** (branch `dev`, exact commit `f83e1f80a09e91ed0c99b6df4b974fe059694d1f`):
   - URL: [https://github.com/Dulmina03/unihood/actions/runs/44163872475](https://github.com/Dulmina03/unihood/actions/runs/44163872475)
   - Status: **SUCCESS** (all three jobs passed)
     - `Workspace quality` in 1m32s: SUCCESS
     - `Isolated PostGIS integration` in 1m27s: SUCCESS
     - `Component browser acceptance` in 7m7s: SUCCESS
   - Metadata recorded in [dev-run-60.json](./dev-run-60.json).

## Limitations & Carry-overs
- Remaining Phase 1 detailed manual assistive technology checks remain explicitly deferred to Phase 6.
- No production phone verification, SMS OTP, or carrier validation is implemented (deferred to Phase 7).
- No malware or antivirus scanning engine is configured (`scanner: NOT_CONFIGURED`).
- All media remain quarantined; no public media or contact delivery endpoint exists (`publicMediaDelivery: DISABLED`, `publicContactDelivery: DISABLED`).
