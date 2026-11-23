# School map

The public [school map](https://classicalwatch.stringfestanalytics.com/map.html) is a static page in `dist/`. It uses the same `events.json` as the concert list. Map scripts and styles are served from this repository; detailed geography loads directly from OpenStreetMap's standard raster tile service. No Google Maps account, dashboard embed, geocoding API, API key or new scheduled job is needed. Existing production analytics continue to apply.

## Listings and facts

`map-data.js` joins sources to the existing `schools.js` metadata. Schools remain visible when no current concert is listed. The next concert must have safe HTTPS viewing/detail links, a valid start and future end, and pass `core.js` verification/expiry rules. An event already in progress is labeled “Scheduled now”; playback is not verified. Missing end times use the existing 90-minute estimate. Future events with expired verification are excluded. The browser reevaluates schedules every minute when controls are not focused.

The map displays visitor-local concert times and the school's original time when different. Music enrollment retains its source link, approximate label, year where available, and original review date. It is not total university enrollment. Unavailable figures are labeled “Not listed.” School links use `?school=ID` to open a filtered concert list; an explicit shared-event link takes precedence.

Search matches school, city and country (including accent-insensitive searches), with regional and upcoming-concert filters. Markers cluster and overlapping city locations separate when selected. The school picker opens a regional view at zoom 7 instead of implying that a city-center marker is an exact campus location. Visitors can zoom to level 14 for more geographic context. Hover/focus tooltips preview the school and concert; click/tap opens the detail panel. The school picker and expandable directory offer alternatives to map interaction. If map assets fail, the school picker, facts and directory still work.

## Geographic sources and scope

The primary basemap uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, including lakes, rivers, state/province boundaries, roads and place labels. CSS applies a neutral grayscale treatment only to the tile pane; school markers retain the Stringfest red/gray palette. OpenStreetMap attribution is visible on the map and below it, alongside a map-correction link and privacy disclosure.

Follow the [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/): ordinary browser requests with a valid origin referrer, default HTTP caching, viewport loading with a modest buffer, no proxy, no offline archive, no cache-busting or bulk tile downloads. There is no service guarantee. If a tile fails, a visible notice explains that some detail is unavailable; a bundled outline remains beneath the tiles, and school information remains usable. Failure of the optional outline must not block the primary map. Reassess the tile provider if traffic outgrows this service.

`school-locations.js` contains **city centers**, not campus entrances or performance venues. This is a discovery map, not a directions service. Each record includes its GeoNames identifier, viewable at `https://www.geonames.org/ID/`. Shared cities intentionally share coordinates. Locations were checked November 23, 2026 against city, country and US state:

- [GeoNames cities500 dump](https://download.geonames.org/export/dump/cities500.zip), [schema](https://download.geonames.org/export/dump/readme.txt), [license](https://www.geonames.org/export/): CC BY 4.0. Retain the public attribution and license link. The Annandale-on-Hudson entry (GeoNames 5107221) was checked against the [GeoNames search record](https://www.geonames.org/advanced-search.html?country=US&q=New+York&startRow=4800), because this hamlet is absent from cities500. Coordinates are rounded for display by the map projection; no live geocoding is performed.
- `world.json`: fallback only, Natural Earth **1:110m Admin 0 Countries**, version **5.1.2**, from [the versioned GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_countries.geojson). Retains country names and polygon geometry, rounds coordinate precision to four decimal places, and omits Antarctica. [Public domain terms](https://www.naturalearthdata.com/about/terms-of-use/). This generalized outline is unsuitable for detailed map browsing and is no longer the primary basemap.

When adding a school, add its existing metadata to `schools.js` and a reviewed city entry to `school-locations.js`; use the correct state/province and country, especially for duplicate city names. Keep the GeoNames identifier and update this review date if replacing the location dataset. No exact school location should be inferred from a city marker.

## Vendored map software

- [Leaflet 1.9.4](https://www.npmjs.com/package/leaflet/v/1.9.4): `dist/vendor/leaflet/`, BSD 2-Clause license in `LICENSE`.
- [Leaflet.markercluster 1.5.3](https://www.npmjs.com/package/leaflet.markercluster/v/1.5.3): `dist/vendor/cluster/`, MIT license in `MIT-LICENCE.txt`. Cluster styling is in `map.css`.

Files came from the versioned npm tarballs, checked against registry SHA-512 integrity. Only runtime files and licenses are included; source-map directives were removed because development source maps are not shipped. Upgrades should preserve licenses and be tested together. JavaScript requires no CDN; detailed map images require the OpenStreetMap tile service.

## Validation

Run `node --test`; map tests cover ended/in-progress events, stale verification, invalid links/dates, filtering and location coverage. Preview with `node scripts/serve.mjs`, then open `/map.html`. Check a red marker, gray marker, same-city group, search, regional/upcoming filters, school picker, calendar download, filtered-list link and narrow screen layout. Around Cleveland, confirm Lake Erie, the other Great Lakes when zoomed out, state boundaries and city labels are visible. Check on-map attribution and a useful map when the optional outline fails. The production workflow treats these frontend changes as a website-only deployment and preserves the last collected calendar.
