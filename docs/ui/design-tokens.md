# Campus Teal foundations — UNI-003

The approved specification palette remains unchanged in `packages/ui/src/tokens.css`. Import `@unihood/ui/tokens.css` and `@unihood/ui/styles.css` once; import components from `@unihood/ui`. Next consumers transpile the source package (`transpilePackages`). React 19 is a peer dependency. Library classes use the `uh-` prefix; showcase styles use `ds-`.

## Color and meaning

- Navy `#0D2940`: navigation, strong text; white/mint foreground on navy.
- Campus Teal `#087E79`: primary actions, links and focus; white foreground on teal.
- Mint `#DDF4EA`: quiet panels, verified source background; navy/ink/muted foreground. **Small teal text on mint fails AA (4.26:1)** and is not used.
- Canvas `#F7F9F6`, surface `#FFFFFF`: page and cards.
- Amber `#E9AA40`, coral `#F16A50`: warning/danger accents with navy text; never white text.
- Ink `#173544`, muted `#566B75`: body/supporting text. Divider `#DCE5E4` is decorative; controls use muted borders for perceptible boundaries.

Semantic aliases include background, foreground, primary, secondary, muted, accent, warning, danger, border, control-border and focus-ring. Source, privacy and vacancy have separate text/icon badges. Color never substitutes for a label. Token tests calculate contrast for actual text pairings; browser axe checks the rendered composition.

## Typography, spacing and behavior

Fraunces 500 display and 400 italic provide editorial character; Manrope 400/600/700/800 supports controls and body text. Fontsource packages serve Latin WOFF files locally and include OFL licenses. No runtime font-provider request is made. Georgia/Arial and declared Sinhala/Tamil system fallbacks remain; those languages and their full font coverage are not implemented or verified in this issue. English dictionary scaffolding lives in `apps/web/src/lib/i18n/en.ts`; component labels are English defaults and localization remains future work.

Hero headings use fluid sizing; small labels have a 12px floor. Space tokens span 4–72px, controls use 0.6rem radius, cards 1rem, chips pills. Shadows are restrained; no gradients/glow. Standard control targets are at least 44px, inputs 48px (search input 44px), focus uses a visible 3px ring (mint in the navy header). Consumers must retain focus styling. Disabled/busy actions are explicit. Reduced motion disables spinner animation and transitions; forced-color mode retains control outlines.

Layout: 1280px editorial container; 3/2/1-column cards; mobile navigation below 700px; map rail bypasses the editorial width. The map provider slot has a real list alternative and a clear unavailable state. No faux map is drawn. Native dialogs provide modal semantics/inert background, explicit Tab wrapping, Escape close and trigger focus restoration.
