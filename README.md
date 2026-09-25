# Classical Live

A small, free calendar of conservatory livestreams, built for personal use and easy public sharing.

**Website:** https://summerofgeorge.github.io/classical-live/

## What it does

- Lists verified upcoming streams with automatic local-time display and the original source time.
- Filters by Tonight, Next 7 days, This weekend, school, performance type, and search.
- Opens the official stream, venue player, or clearly labeled school channel.
- Downloads one concert or the current filtered selection as an `.ics` file for Apple Calendar, Outlook, Google Calendar import, and other calendar apps.
- Refreshes and publishes each Monday at **3 a.m. America/New_York**, including daylight-saving changes. GitHub may delay scheduled starts.

No visitor accounts, database server, API keys, analytics, paid services, or frontend framework. The site is plain HTML/CSS/JavaScript; `dist/events.json` is the data store. Only the ingestion scripts use a dependency: Cheerio for parsing official HTML.

## Sources

| School | Method | Admission rule |
| --- | --- | --- |
| [Curtis Institute](https://www.curtis.edu/curtis-performances/watch-listen/) | Public JSON calendar API plus event details | Both Broadcast and Free categories; excludes cancellations. Channel fallback is labeled when a direct video is not yet published. |
| [Cleveland Institute](https://www.cim.edu/concerts-events) | Paginated event index; event-specific calendar metadata | Explicit public livestream link. Empty placeholder links and canceled concerts are skipped. |
| [Eastman](https://www.esm.rochester.edu/live/) | Dedicated structured upcoming-stream list | Only listed livestreams, with the venue player linked by the school. |
| [Colburn](https://colburnschool.edu/livestream/) | Dedicated livestream schedule | Only events listed on that page; dates use Los Angeles time. |
| [Manhattan School of Music](https://www.msmnyc.edu/livestream/) | Dedicated upcoming-stream list | Only the Upcoming Events section, excluding the replay archive. |

Oberlin was evaluated on September 25, 2026. Its public information page was readable, but its separate calendar API and embedded widget both returned HTTP 403 from the build environment. It is not counted as an automated source. Juilliard also blocked direct retrieval. Neither is silently filled with guessed or search-cached events. Their adapters can be added when a dependable public source is available.

The look-ahead window is 45 days, limited by what each school has actually published. Some sources show only the next few performances. This is selective coverage, not every concert at every school. A weekly refresh can miss late additions or cancellations; always check the linked official event page.

## Run locally

Requires Node.js 22 or newer and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm refresh
pnpm start
```

Open http://127.0.0.1:4173. Do not double-click `index.html`; browsers block JSON loading from a local file URL.

## Hosting and refresh

The repository is public so standard GitHub Actions runners and GitHub Pages can use their free allowances. No custom domain is required.

In repository **Settings → Pages**, select **GitHub Actions** as the source. The `Refresh and publish calendar` workflow runs on pushes to `main`, manually through **Actions → Run workflow**, and on the Monday schedule. It tests, refreshes, commits the data file, and deploys `dist/` in the same run. A bot commit does not need to trigger a second workflow.

GitHub's built-in token is used; no personal access token or third-party secret is required. Public repositories with no activity for 60 days can have scheduled workflows disabled; the weekly data commit normally keeps this repository active while refreshes work. If a source fails, the workflow publishes the available data and then reports a failure. GitHub's normal workflow notification settings control any email alerts.

References: [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Data quality and failure behavior

- Source URLs and redirect destinations must be HTTPS and on an explicit allowlist.
- Requests have timeouts, a single retry for transient errors, and a bounded request budget. Pages are parsed without running their scripts.
- Each source is isolated. A source failure preserves its previously verified upcoming events for at most 14 days and marks them stale. Healthy sources replace their old records, so removed events disappear.
- A failed or unexpectedly changed source is visible in `events.json`, the site's source status, and the Actions summary. The site also warns if the entire data file is over eight days old.
- Events are deduplicated, sorted, and filtered by date. Expired events disappear in the browser even between refreshes. Unknown end times use a clearly disclosed 90-minute estimate.
- Wall-clock source dates are converted using IANA time zones. Invalid and ambiguous daylight-saving times are rejected. CIM's dedicated calendar metadata is used instead of unrelated sidebar dates. MSM prints “EST” year-round; its New York wall-clock time is interpreted with the correct seasonal offset.
- Eastman's visible list omits years: the adapter resolves the nearby year using both the month/day and printed weekday and rejects an unresolved date.
- The interface inserts text safely and never renders source HTML.

The `.ics` download is a snapshot, not a calendar subscription. Re-importing it is not a reliable way to remove canceled events. Stable event UIDs reduce duplicate imports, but each calendar app controls import behavior. The calendar does not probe video playback; “Scheduled now” refers to the published schedule.

## Add another school

1. Prefer an official public JSON/iCalendar feed. Otherwise use a dedicated livestream list with explicit dates and watch links. Avoid paid APIs and browser automation when a simple source is available.
2. Add the school's metadata to `sources` and its host to the request allowlist in `scripts/ingest.mjs`.
3. Add an adapter in `adapters`. It returns an array with `title`, `start` (ISO with offset or UTC), optional `end`, `program`, `event_url`, `stream_url`, `watch_kind`, `evidence_url`, and `evidence`. Use a stable native `id` when possible; otherwise normalization derives one from source, event URL, and date.
4. Require affirmative livestream evidence. Do not infer streaming just because admission to the in-person concert is free. Throw on a structural source change; return an empty array only for a genuinely empty schedule.
5. Add parser fixtures and tests for dates, canceled records, and missing stream links. Run a real refresh, inspect the resulting listings, and then publish.

The test suite covers time zones, DST ambiguity, date filters, `.ics` escaping and UTF-8 folding, parser rules for all five schools, and failed-source retention.
