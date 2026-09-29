# Classical Watch

[Classical Watch](https://classicalwatch.stringfestanalytics.com/) is a calendar of free classical livestreams from conservatories and university music schools.

It displays concert times in the visitor’s time zone, links to official viewing pages, filters by school and date, downloads calendar invitations, and shares performance details through email, text, Facebook, and X.

## Run locally

Requires Node.js 22 or newer and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm start
```

Open `http://127.0.0.1:4173`. To collect current schedules, run `pnpm refresh`.

## Project structure

- `dist/`: the static website and published concert data.
- `scripts/`: official-source collectors, date validation, and refresh tooling.
- `data/browser-reviewed.json`: dated manual observations for sources that cannot be collected reliably.
- `test/`: parser fixtures and checks for dates, sharing, access requirements, and failed-source retention.

The browser uses plain HTML, CSS, and JavaScript. Cheerio is the collector’s only direct dependency. No database, visitor account, paid API, or stored video is required.

## Collection and deployment

The calendar refreshes daily at **3:15 a.m. America/New_York**, including daylight-saving changes. GitHub may delay scheduled starts. A manual workflow run also refreshes all sources.

Changes to collectors or reviewed data trigger a refresh before deployment. Website-only edits publish the most recent collected schedule after tests pass. Documentation-only changes do not deploy the site.

GitHub Pages publishes `dist/` through Actions using the repository’s built-in token. The workflow uses standard public-repository runners, a 15-minute timeout, a 600-request collection limit, and one-day artifact retention. Configure repository **Settings → Pages → Source** as **GitHub Actions**.

## Data quality

A concert needs affirmative evidence of a public stream. Free campus admission, an undated player, or an archived video alone is insufficient. Collection covers a rolling 45-day window, subject to each school’s published schedule.

Collectors validate dates with IANA time zones, bound pagination, pace requests, and restrict source and redirect hosts. Failed sources retain previously verified records for at most 14 days. Manual observations keep their original review time and expire after 14 days. Source health remains available in the Actions summary and data; routine collection diagnostics are omitted from concert browsing.

Calendar downloads are snapshots, not subscriptions. “Scheduled now” describes the published schedule, not verified video playback. Event details remain linked on every card.

To add a school, implement an adapter in `scripts/`, register its metadata and allowed hosts, require explicit broadcast evidence, and add fixtures covering dates, cancellations, and missing or restricted streams. Run the tests and verify real source results before enabling scheduled collection.

## Analytics and public configuration

The production hostname loads Google Analytics. The browser measurement ID in `dist/analytics.js` is public configuration; it does not grant access to Analytics reports. API secrets, service-account credentials, tokens, and private setup notes must never be committed. Local previews do not send analytics. Advertising personalization is disabled; the site’s About section describes analytics use.

See [Google’s tag installation guide](https://developers.google.com/tag-platform/gtagjs) and [private Measurement Protocol secret guidance](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events).

## Image credit

The social preview uses [Ri_Ya’s cello photograph on Pixabay](https://pixabay.com/photos/cello-musical-instrument-music-6942912/). [Photo provenance and editable layout](docs/social-preview.md).
