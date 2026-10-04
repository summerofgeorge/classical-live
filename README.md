# Classical Watch

[Classical Watch](https://classicalwatch.stringfestanalytics.com/) is a calendar of free classical livestreams from conservatories and university music schools.

It displays concert times in the visitor’s time zone, links to official viewing pages, filters by school and date, downloads calendar invitations, and shares performance details through email, text, Facebook, and X.

## Run locally

Requires Node.js 24.16 or newer and pnpm 11.19.0. Current time-zone data is needed for international concert times, including Vancouver's permanent UTC−7 from March 2026.

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
- `docs/regional-shortlist.md`: Europe / Asia–Pacific schools scouted for free dated livestreams (24h coverage).
- `test/`: parser fixtures and checks for dates, sharing, access requirements, and failed-source retention.

The browser uses plain HTML, CSS, and JavaScript. Cheerio is the collector’s only direct dependency. No database, visitor account, paid API, or stored video is required.

## Collection and deployment

The calendar refreshes daily at **3:15 a.m. America/New_York**, including daylight-saving changes. GitHub may delay scheduled starts. A manual workflow run also refreshes all sources.

Changes to collectors or reviewed data trigger a refresh before deployment. Website-only edits publish the most recent collected schedule after tests pass. Documentation-only changes do not deploy the site.

GitHub Pages publishes `dist/` through Actions using the repository’s built-in token. Three regional jobs (`nam` / `europe` / `asia-pacific`) merge into one `dist/events.json`. The active workflow is [`.github/workflows/refresh-and-deploy.yml`](.github/workflows/refresh-and-deploy.yml); the copy under `docs/workflows/` is kept in sync. Runners stay public, with 15-minute timeouts and one-day artifact retention. Configure repository **Settings → Pages → Source** as **GitHub Actions**.

### Reading maintenance alerts

The **Publish website and maintenance report** job writes a plain-English report only after deployment succeeds. It lists affected schools, what happened, when their schedules were last verified, and the next step. This report lives in GitHub Actions; concert browsing has no maintenance dashboard or failure counts.

A single school failure retries on the next daily refresh. A repeated failure, missing region, or browser review due within three days raises a separate **School schedules need attention (website published)** alert. `data/maintenance-state.json` remembers reported problems, so unchanged problems stay in the summary without another failure email. A different problem, approaching expiry, or expired verification alerts again. Recovery clears the remembered problem. Tests, collection crashes, deployment failures, and errors saving refreshed data still fail normally.

When an alert arrives, open the run and read the publish job summary. “Page limit” means a software safeguard, not a charge or billing allowance. Temporary connection failures can recover automatically; persistent parsing or access problems need a collector review. Re-running a successful refresh is not a substitute for fixing those problems. GitHub’s notification settings control delivery.

## Data quality

A concert needs affirmative evidence of a public stream. Free campus admission, an undated player, or an archived video alone is insufficient. Collection covers a rolling 45-day window, subject to each school’s published schedule.

Collectors validate dates with IANA time zones, bound pagination, pace requests, and restrict source and redirect hosts. Failed sources and missing regions retain previously verified records for at most 14 days. Manual observations keep their original review time and expire after 14 days. The browser also enforces expiry if publication stops. Source health remains available in the Actions summary and data; routine collection diagnostics are omitted from concert browsing.

Calendar downloads are snapshots, not subscriptions. “Scheduled now” describes the published schedule, not verified video playback. Event details remain linked on every card.

To add a school, implement an adapter in `scripts/`, register its metadata and allowed hosts, require explicit broadcast evidence, and add fixtures covering dates, cancellations, and missing or restricted streams. Run the tests and verify real source results before enabling scheduled collection.

### Scrape budget, regions, and candidates

Collection runs as **three regional jobs** so North American volume cannot exhaust the budget for Europe / Asia–Pacific (24-hour coverage). Each job has its own request fuse (soft warn at 80% / 10 minutes):

| Region | Job id | Request limit |
| --- | --- | --- |
| North America (US + Canada) | `nam` | 600 |
| Europe | `europe` | 400 |
| Asia–Pacific | `asia-pacific` | 300 |

Shards land in `dist/shards/*.json` and merge into one calendar file. Prefer feeds and livestream indexes over unfiltered calendar walks; adapters should early-exit past the 45-day horizon and bound detail-page fetches.

School-specific page limits accommodate the full published window. A page with no stream links does not prove later pages have no streams. The October 4 maintenance fix restores adequate bounded walks for Temple, Ohio State, CIM, Rice, SFCM, Boston, and Weimar. Stanford requires an explicit dated broadcast and a matching program on its viewing page; a confirmed program with no public player yet is omitted without discarding other confirmed broadcasts.

Research notes for expanding Europe / Asia coverage: [docs/regional-shortlist.md](docs/regional-shortlist.md).

Adapters may exist without being scheduled:

- **BYU** — streaming calendar parser is low-request and solid locally, but the host returns HTTP 403 to the identified collector. Remains in `conservatoryCandidates` / browser-reviewed data, not `sources`.
- **Rutgers** — free livestream series parser is low-request, but the host denies the collector. Remains in `priorityCandidates` / browser-reviewed data, not `sources`.


## Analytics and public configuration

The production hostname loads Google Analytics. The browser measurement ID in `dist/analytics.js` is public configuration; it does not grant access to Analytics reports. API secrets, service-account credentials, tokens, and private setup notes must never be committed. Local previews do not send analytics. Advertising personalization is disabled; the site’s About section describes analytics use.

See [Google’s tag installation guide](https://developers.google.com/tag-platform/gtagjs) and [private Measurement Protocol secret guidance](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events).

## Image credit

The social preview uses [Ri_Ya’s cello photograph on Pixabay](https://pixabay.com/photos/cello-musical-instrument-music-6942912/). [Photo provenance and editable layout](docs/social-preview.md).
