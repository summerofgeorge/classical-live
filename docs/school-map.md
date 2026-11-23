# School map

The public [school map](https://classicalwatch.stringfestanalytics.com/map.html) is a static page in `dist/`. It uses the same `events.json` as the concert list. Map scripts, styles and political geography are served from this repository. No Google Maps account, dashboard embed, external tile service, geocoding API, API key or new scheduled job is needed. Existing production analytics continue to apply.

## Listings and facts

`map-data.js` joins sources to the existing `schools.js` metadata. Schools remain visible when no current concert is listed. The next concert must have safe HTTPS viewing/detail links, a valid start and future end, and pass `core.js` verification/expiry rules. An event already in progress is labeled “Scheduled now”; playback is not verified. Missing end times use the existing 90-minute estimate. Future events with expired verification are excluded. The browser reevaluates schedules every minute when controls are not focused.

The map displays visitor-local concert times and the school's original time when different. Music enrollment retains its source link, approximate label, year where available, and original review date. It is not total university enrollment. Unavailable figures are labeled “Not listed.” School links use `?school=ID` to open a filtered concert list; an explicit shared-event link takes precedence.

Search matches school, city and country (including accent-insensitive searches), with regional and upcoming-concert filters. Markers cluster and overlapping city locations separate when selected. The school picker opens a regional view at zoom 7. Zoom is capped at 8 to suit the atlas geometry and city-center locations. Hover/focus tooltips preview the school and concert; click/tap opens the detail panel. The school picker and expandable directory offer alternatives to map interaction. If map assets fail, the school picker, facts and directory still work.

## Geographic sources and scope

`political-geography.json` contains Natural Earth **1:50m**, version **5.1.2**, country polygons, state/province boundary lines and lakes. White land, pale gray water and subdued borders keep the school markers prominent. There are no roads, terrain, land-use or building layers at any zoom. State/province boundaries appear from zoom 3.5. Country, lake, state/province and selected city names appear progressively; label placement avoids overlaps, school markers and viewport edges, with a maximum of 40 visible labels. Natural Earth's 50m state coverage is generalized and does not include every country's administrative divisions.

The data uses the following [versioned Natural Earth GeoJSON sources](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson): `ne_50m_admin_0_countries`, `ne_50m_admin_1_states_provinces_lines`, `ne_50m_lakes`, plus label locations from `ne_50m_admin_1_states_provinces` and `ne_50m_populated_places`. [Public domain terms](https://www.naturalearthdata.com/about/terms-of-use/) permit redistribution. Antarctica is omitted; unused properties are removed. TopoJSON quantization uses 100,000 positions; no extra line simplification is applied to the source. Lake label points are selected inside the largest polygon. This replaces both the busy raster basemap and the older 110m outline, retaining all five Great Lakes.

To rebuild, download those five `.geojson` inputs from tag `v5.1.2`, save them as `.json` in a scratch directory, and obtain the npm `topojson-server@3.0.1` package (check its registry integrity). Run `node docs/build-school-geography.mjs INPUT_DIRECTORY PATH_TO_TOPOJSON_SERVER_DIST_JS`. The resulting file is about 1.25 MB uncompressed / 359 KB gzip. This is a maintenance task, not part of daily concert collection.

`school-locations.js` contains **city centers**, not campus entrances or performance venues. This is a discovery map, not a directions service. Each record includes its GeoNames identifier, viewable at `https://www.geonames.org/ID/`. Shared cities intentionally share coordinates. Locations were checked November 23, 2026 against city, country and US state:

- [GeoNames cities500 dump](https://download.geonames.org/export/dump/cities500.zip), [schema](https://download.geonames.org/export/dump/readme.txt), [license](https://www.geonames.org/export/): CC BY 4.0. Retain the public attribution and license link. The Annandale-on-Hudson entry (GeoNames 5107221) was checked against the [GeoNames search record](https://www.geonames.org/advanced-search.html?country=US&q=New+York&startRow=4800), because this hamlet is absent from cities500. Coordinates are rounded for display by the map projection; no live geocoding is performed.

When adding a school, add its existing metadata to `schools.js` and a reviewed city entry to `school-locations.js`; use the correct state/province and country, especially for duplicate city names. Keep the GeoNames identifier and update this review date if replacing the location dataset. No exact school location should be inferred from a city marker.

## Vendored map software

- [Leaflet 1.9.4](https://www.npmjs.com/package/leaflet/v/1.9.4): `dist/vendor/leaflet/`, BSD 2-Clause license in `LICENSE`.
- [Leaflet.markercluster 1.5.3](https://www.npmjs.com/package/leaflet.markercluster/v/1.5.3): `dist/vendor/cluster/`, MIT license in `MIT-LICENCE.txt`. Cluster styling is in `map.css`.
- [TopoJSON client 3.1.0](https://www.npmjs.com/package/topojson-client/v/3.1.0): `dist/vendor/topojson/`, ISC license in `LICENSE`.

Files came from the versioned npm tarballs, checked against registry SHA-512 integrity. Only runtime files and licenses are included; source-map directives were removed where present because development source maps are not shipped. Upgrades should preserve licenses and be tested together. The map needs no third-party network request.

## Validation

Run `node --test`; map tests cover ended/in-progress events, stale verification, invalid links/dates, filtering, location coverage, Great Lakes geometry and label decluttering. Preview with `node scripts/serve.mjs`, then open `/map.html`. Check school markers/tooltips, same-city groups, filters, the school picker and narrow screen layout. Around Cleveland, confirm Lake Erie and the other Great Lakes when zoomed out, with no roads or terrain appearing at higher zoom. Check on-map attribution and the school picker if geography cannot load. The production workflow treats these frontend changes as a website-only deployment and preserves the last collected calendar.
