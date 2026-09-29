# Default social preview

The current asset is `dist/social-card-v5.jpg`, 1200 × 630 pixels. It combines Classical Watch typography with a cello photograph by Ri_Ya, without generative image editing. The complete portrait composition remains visible. A larger official Stringfest seal overlaps the off-white title area and charcoal attribution panel; the seal itself is unchanged. The copy identifies Classical Watch as a livestream guide and credits the music schools as the source of the streams.

Photo: [Cello, Musical Instrument, Music](https://pixabay.com/photos/cello-musical-instrument-music-6942912/), by **Ri_Ya** on Pixabay, published January 18, 2022. The source page identifies a Nikon D5600 photograph. [Pixabay content license](https://pixabay.com/service/license-summary/), checked September 28, 2026. The photograph is incorporated into a branded design rather than redistributed as a standalone stock asset.

The editable composition is `docs/social-card-layout.html`. Render it at 1200 × 630 with a device scale factor of 1, wait for both images to decode, then save a quality-92 JPEG. Georgia and Arial are used. The delivered asset was rendered on Windows. Previous filenames remain for cached links, while the homepage metadata and sharing preview use v5. Treat published image filenames as immutable: new artwork gets a new filename. Newly generated performance links include `card=5` to distinguish them from previously shared URLs; the event ID and older links still work. Existing posts remain subject to each platform’s preview cache.

Open Graph and X large-image metadata are present in initial HTML. The same generic image serves performance query links; it does not depict a particular school or performer. Platforms may cache previous previews or omit an image. No homepage-only canonical or og:url overrides event links.

Share actions: Email and Text message include an editable introduction, full performance name, school, date, explicit school time zone, viewing note and ClassicalWatch event URL. They open the visitor’s own app with no recipient selected. Copy for Facebook copies the same full text, then presents an Open Facebook link and a paste reminder, with a manual-copy fallback. X receives the editable short introduction and URL. Copy details & link and the native share sheet are also supported. No message is sent automatically.

## Brand accents (site chrome)

Classical Watch keeps Georgia/Arial system fonts (no Aliens & Cows). Brand tokens: red `#CF3338`, ink `#3D3935`, white. Masthead, favicon, and the default social card use the official Stringfest seal PNG (and a horizontal lockup sparingly on Support) — real logo assets, not redrawn SVG approximations. Classical Watch remains the site name; this is calendar chrome, not a Stringfest Analytics wordmark takeover. Re-render `docs/social-card-layout.html` at 1200×630 when logo assets change.
