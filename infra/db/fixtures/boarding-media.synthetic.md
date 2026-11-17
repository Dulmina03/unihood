# UNI-037 metadata privacy fixture

`boarding-media.synthetic.jpg` is an original programmatically generated 24×16 flat Campus Teal image, not a photograph, property, person or real listing. No third-party photographic asset is used. The JPEG intentionally contains EXIF GPS and XMP `SYNTHETIC_PRIVATE_CANARY` metadata at arbitrary fictional coordinates, solely to verify stripping. Never use the input as public media.

Generator: `create-boarding-media.synthetic.mjs`, using the already pinned Sharp 0.35.5 API dependency. Reproduce into a new path with `node infra/db/fixtures/create-boarding-media.synthetic.mjs /tmp/boarding-media-recreated.jpg`; it refuses overwrites. Test sanitization re-encodes to WebP and verifies EXIF/XMP/ICC/IPTC/orientation absent. Sanitization does not certify the visible content or malware clearance; all uploaded derivatives remain private PENDING quarantine.

Contact fixtures separately use NANPA's fictional non-working 555-0100 range: [official NANPA reference](https://www.nanpa.com/numbering/555-line-numbers), checked 17 November 2026. No calls/SMS, real phone collection, ownership verification or public contact delivery is performed.
