# UNI-003 verification evidence

Recorded 16 November 2026 (Asia/Colombo), Chromium headless 159.0.8154.6 / Playwright 1.65.1 against the production Next.js build at `/design-system`. No external listing, font, tile or route service was connected. Browser tests assert all HTTP resources use the local origin.

## Screenshots

Exact viewport captures:

- [390×844](design-system-390x844.png)
- [1440×900](design-system-1440x900.png)

The corresponding `-full.png` files capture the entire scrollable page at those viewport widths (their image height intentionally exceeds the viewport). They include owner-public AVAILABLE, owner-hidden UNKNOWN and community-area UNKNOWN cards, plus FULL and other badge states in the controls section. Additional viewport captures show `map-components-*`, `map-preview-*`, `visibility-dialog-mobile/desktop` and `collection-error-mobile/desktop`. All samples/fees/availability are explicitly synthetic. Screenshots are current evidence, not approved golden regression baselines.

Visual inspection covered the two hero screenshots, full desktop composition, mobile map fallback/property preview and visibility dialog. The small-label sizing and centered modal were corrected during review. The desktop layout retains the reference's photographic editorial split and navy header; mobile stacks content with an inline navigation disclosure. The map is an honest unavailable provider slot, with an accessible list alternative. See [reference differences](../../ui/screen-index.md#reference-interpretation).

## Actual checks

- `pnpm install --frozen-lockfile --offline`: **PASS**; lockfile current.
- `pnpm lint`: **PASS**, zero warnings.
- `pnpm typecheck`: **PASS**, including standalone UI package plus contracts/API/web.
- `pnpm test`: **PASS**, **23 tests**: 3 database tooling + 3 contracts + 7 API + 10 web. UI coverage includes field labeling/help/error, native search submit, disabled busy action, photo failure fallback, independent source/privacy/vacancy, save state, private/area/community map exclusion, forged community claims/precise-field DOM canaries, hidden locality, invalid fees, expired/future vacancy and approved token contrast. These are presentation tests; they do not establish server-side private data serialization.
- `pnpm build`: **PASS**, contracts/API plus statically generated `/`, `/design-system`, not-found.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/unihood-playwright pnpm test:ui`: **PASS**, **8 tests** (4 scenarios × 2 viewports). Axe WCAG A/AA tags through 2.2 return zero violations on the page and open dialog. Rule summaries are saved in `accessibility-mobile.json` and `accessibility-desktop.json`; final page audits have zero incomplete rules as well as zero violations; automated checks still do not certify full WCAG conformance.
- Browser interactions: skip link; mobile nav toggle/selection/Escape/focus; native modal Tab/Shift+Tab containment, Escape, default hidden choice, trigger focus restoration and centered bounds; source/search filters; saved state; loading/empty/error/retry; form invalid/accepted; map layers and list fallback. Horizontal overflow checked at **320, 390, 768, 1440px**, with tablet navigation focus also exercised. No runtime page error observed by the screenshot scenario listener.

Initial failures were resolved and rerun: inferred privacy literal type, unused import, typed image decode, required-label whitespace assumption, Node-only token fixture under jsdom, low-contrast teal-on-mint label, changing menu accessible-name locator, native modal focus cycling, standalone UI DOM iteration without DOM.Iterable, and an incomplete axe result for a labeled generic palette div (now an explicit group). The visual review found the CSS reset removed the default dialog centering margin; explicit margin:auto plus a browser bounds assertion fixes it. No accessibility rule was disabled or assertion removed to manufacture a pass.

## Reproduction and limits

From repository root: install frozen dependencies, install Playwright Chromium, run `pnpm build`, then `pnpm test:ui`. See root README for browser-cache setup. This environment used a `/tmp` browser cache because its default home cache was not writable. Elevated local execution allowed browser/server loopback sockets; no permission/socket setting was weakened. Playwright owns and stops the port-3180 server. Reports/traces remain under `/tmp/unihood-ui-test-results`.

Human screen-reader, Firefox/WebKit, full Sinhala/Tamil language coverage, remote CI and final visual approval: **NOT RUN**. Full product `pnpm test:e2e` remains the existing explicit UNI-015 placeholder and was **NOT RUN**; `test:ui` does not claim product E2E completion. Docker migration/rollback integration was **NOT RERUN for this UI-only issue**; UNI-002 results remain historical in PHASE-00.md. No database scripts, schema, volume, extension ownership or persistent data were changed. No publishing/authentication/provider/registration policy is implemented.
