# Default social preview

The current asset is `dist/social-card-v3.jpg`, 1200 × 630 pixels. It combines Classical Watch typography with a cello photograph by Ri_Ya, without generative image editing. The complete portrait composition remains visible.

Photo: [Cello, Musical Instrument, Music](https://pixabay.com/photos/cello-musical-instrument-music-6942912/), by **Ri_Ya** on Pixabay, published January 18, 2022. The source page identifies a Nikon D5600 photograph. [Pixabay content license](https://pixabay.com/service/license-summary/), checked September 28, 2026. The photograph is incorporated into a branded design rather than redistributed as a standalone stock asset.

The editable composition is `docs/social-card-layout.html`. Render it at 1200 × 630 with a device scale factor of 1, wait for the photo to decode, then save a quality-92 JPEG. Georgia and Arial are used. The delivered asset was rendered on Windows. The previous v1 and v2 filenames remain for cached links, while the homepage metadata and sharing preview use v3.

Open Graph and X large-image metadata are present in initial HTML. The same generic image serves performance query links; it does not depict a particular school or performer. Platforms may cache previous previews or omit an image. No homepage-only canonical or og:url overrides event links.

Share actions: Email and Text message include an editable introduction, full performance name, school, date, explicit school time zone, viewing note and ClassicalWatch event URL. They open the visitor’s own app with no recipient selected. Facebook receives the event URL; the visitor adds their message on Facebook. X receives the editable short introduction and URL. Copy details & link and the native share sheet are also supported. No message is sent automatically.

## Brand accents (site chrome)

Classical Watch keeps Georgia/Arial system fonts (no Aliens & Cows). Brand tokens: red `#CF3338`, ink `#3D3935`, white. Masthead and favicon use a small parallel-diagonal chevron/staff motif inspired by the Stringfest mark — subtle calendar chrome, not a full Stringfest wordmark lockup. Delivered social JPGs were not regenerated in the P1 motif pass; re-render `social-card-layout.html` if a future card should pick up the warmer ink.
