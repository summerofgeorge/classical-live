# Default social preview

The current asset is `dist/social-card-v2.jpg`, 1200 × 630 pixels. It combines Classical Watch typography with an actual photograph of a violin and bow, without generative image editing. The full photographed instrument and bow remain visible.

Photo: [Violin, Bow, Musical Instrument, Music](https://pixabay.com/photos/violin-bow-musical-instrument-music-924349/), by **ml991** on Pixabay, published September 8, 2015. The source page identifies a Canon EOS 350D Digital photograph. [Pixabay content license](https://pixabay.com/service/license-summary/), checked September 28, 2026. The photograph is incorporated into a branded design rather than redistributed as a standalone stock asset.

The editable composition is `docs/social-card-layout.html`. Render it at 1200 × 630 with a device scale factor of 1, wait for the photo to decode, then save a quality-92 JPEG. Georgia and Arial are used. The delivered asset was rendered on Windows. The original v1 filename remains for cached links, while the homepage metadata and sharing preview use v2.

Open Graph and X large-image metadata are present in initial HTML. The same generic image serves performance query links; it does not depict a particular school or performer. Platforms may cache previous previews or omit an image. No homepage-only canonical or og:url overrides event links.

Share actions: Email and Text message include an editable introduction, full performance name, school, date, explicit school time zone, viewing note and ClassicalWatch event URL. They open the visitor’s own app with no recipient selected. Facebook receives the event URL; the visitor adds their message on Facebook. X receives the editable short introduction and URL. Copy details & link and the native share sheet are also supported. No message is sent automatically.
