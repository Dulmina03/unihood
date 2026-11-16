# UNI-003 asset provenance

- UI references: existing `docs/design/references/01_landing_editorial.png`, `02_explore_urban_map.png`, `03_advertisements_editorial.png`, `04_boarding_details_editorial.png`. Used for composition only; their sample content is not treated as factual inventory.
- Photo: `apps/web/public/design-system/illustrative-interior.webp`, downloaded 16 November 2026 from [Unsplash image CDN](https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=82&fm=webp), image identifier `photo-1522708323590-d24dbb6b0267`, transformed to WebP, 1400px wide. Governed by the [Unsplash license](https://unsplash.com/license), which permits downloaded commercial/noncommercial use without required attribution. Photographer identity was not verified; none is invented. The photograph is clearly labeled illustrative, never a claimed real UniHood/Sri Lankan property or owner-uploaded image. The demo footer links the license.
- Fonts: locked `@fontsource/fraunces` 5.3.0 and `@fontsource/manrope` 5.3.0, self-hosted Latin weights. SIL Open Font License text is distributed in each installed package's LICENSE file. No font files were modified; preserve upstream license when distributing outside the package workflow.
- Icons: simple repository-authored SVG path primitives, consistent 24px viewBox/currentColor. Decorative icons are hidden from assistive technology; controls carry text or accessible names.

No AI-generated or unlicensed listing photographs, logos, map tiles or location datasets were added. Font and image assets remain locally available after installation/build; no CDN request is required to render the page.

## UNI-011 landing extension

The landing adds illustrative campus/interior WebP photos and a responsive hero source. See the [exact asset manifest](landing-assets.json), [landing source/usage policy](landing.md#content-and-photography) and public /photo-credits page. The existing UNI-003 image/provenance above remains unchanged. New photos are stock illustrations, never a selected campus, a live boarding or owner content; no creator identity or campus association is invented.
