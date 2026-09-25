# Classical Watch

A small, free calendar of conservatory livestreams, built for personal use and easy public sharing.

**Website:** https://classicalwatch.stringfestanalytics.com/

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
| [Northwestern Bienen](https://www.music.northwestern.edu/live) | Dedicated livestream schedule | Explicit Watch Live link; uses the printed Central Time with seasonal daylight-saving offsets. |
| [Rice Shepherd](https://music.rice.edu/events) | Paginated calendar plus event details | Both a Livestream Available label and an event-specific View Livestream link. Grouped festival/season landing pages are skipped. |
| [San Francisco Conservatory](https://www.sfcm.edu/experience/performance-calendar) | Monthly calendar plus event details | Public video Livestream link; displayed Pacific time must agree with event calendar metadata. Partner ticket-sales pages are excluded. |
| [Franz Liszt University of Music Weimar](https://www.hfm-weimar.de/en/visiting/events/calendar) | Official monthly calendar navigation plus individual event pages | Explicit affirmative livestream announcement with a public viewing link. Ordinary in-person concerts and unstreamed competition rounds are excluded. The homepage player destination is explained beside the Watch button. |
| [Lawrence Conservatory](https://www.lawrence.edu/academics/ensembles-performances/performances/webcasts/) | Official term webcast schedule | Explicit dated webcast entries; term year and weekday checked, struck-through and canceled entries excluded. The school's Vimeo channel is labeled as a channel, not an event-specific player. |
| [Boston Conservatory at Berklee](https://bostonconservatory.berklee.edu/events) | Paginated calendar and event details | Free Music events with an explicit Watch link matching structured virtual-location metadata. Single-performance pages only; ambiguous multi-date broadcasts are omitted. |
| [Oberlin Conservatory](https://www.oberlin.edu/conservatory/on-stage/live-webcasts) | Official webcast search and individual event details | Explicit Watch the webcast link to an Oberlin venue player; Eastern time verified from event metadata. Search pages are relevance-ordered, so every page is scanned within a bounded budget. |

Oberlin's separate API and embedded widget initially returned HTTP 403. The collector instead uses the public webcast search linked by Oberlin itself, verifies each event's explicit webcast link, and spaces requests one second apart. HTTP 403 and 429 are not retried or bypassed. A successful request does not establish that a local VPN caused an earlier failure; GitHub's refresh runs independently of the user's connection.

Juilliard and Peabody now have selected **browser-reviewed listings**, separate from the automated collectors. On September 25, 2026, both official calendars loaded in the local browser with the user reporting the VPN off. PowerShell and Node requests still returned HTTP 403, including the current Juilliard calendar and Peabody's published REST index. This does not establish the VPN as the cause or establish reliable unattended retrieval.

`data/browser-reviewed.json` contains 10 Juilliard and 6 Peabody performances checked directly on official event pages, covering September 25–October 8. Juilliard candidates came from its Live Streaming filter; each included event also displayed a stream countdown, with Eastern calendar metadata agreeing with the printed date/time. The October 6 jazz event lacked event-page broadcast evidence and was omitted. Peabody requires an explicit Livestream link and Free label; its calendar links supply Eastern offsets and end times. An equal start/end is treated as an unknown duration. No event is inferred from free admission alone. Some Juilliard streams may require a free Juilliard LIVE account, disclosed beside the Watch link.

`scripts/reviewed.mjs` merges these observations after automatic collection. Their original `checked_at` becomes `last_verified_at` and is **never renewed by a scheduled build**. Events expire 14 days after that check, both during refresh and in the browser even if no new deployment occurs. Source status is `manual` while current and `review_due` after expiry, which requests attention in the workflow. New concerts and cancellations at these two schools need another browser review. To update, recheck the official pages, replace that school's reviewed events (including removals), and set its actual check time; never advance the timestamp without reviewing. Do not list these schools in `ingest.mjs`'s automated source registry until unattended access is verified.

The look-ahead window is 45 days, limited by what each school has actually published. Some sources show only the next few performances. This is selective coverage, not every concert at every school. A weekly refresh can miss late additions or cancellations; always check the linked official event page.

European source review on September 25, 2026: RCM's general live page mentioned autumn broadcasts, but the inspected current event details did not identify upcoming streams. Sibelius Academy's Finnish concert calendar was accessible, but the inspected concerts in the look-ahead window did not publish explicit broadcast links; its WordPress API exposes publication dates, not concert dates. Vienna's mdwStream filter returned an empty schedule. These three remain candidates rather than active collectors. Weimar supplied verifiable future broadcasts and passed hosted refreshes, so it was added first.

Liechtenstein is also deferred. [The academy](https://www.musikakademie.li/) links its [Kulmag stream schedule](https://www.kulmag.live/de/Partner/2/musikakademie-in-liechtenstein), which identified eight free upcoming streams in local tests. Two complete production refreshes received HTTP 403, including after pacing requests; isolated GitHub checks succeeded on other runners. The reason for this inconsistent access is unconfirmed. Its prototype adapter, fixtures, and metadata in `candidateSources` are retained for future work, but it is excluded from the active `sources` list, published events, and weekly refresh. Do not enable it until hosted access is dependable.

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
- Rice labels local wall times as UTC in its HTML datetime attributes; the adapter uses the printed date and Central clock. SFCM calendar metadata supplies verified start and end times. Its month views are scanned across the entire look-ahead window, including year changes.
- Weimar dates use Europe/Berlin; conversion tests cover the weeks when US and European daylight-saving transitions differ. Source titles are retained in their published language. The deferred Liechtenstein prototype uses Europe/Vaduz and admits only cards explicitly marked Gratis in the academy's upcoming-stream section, with the date and academy partner checked against each event page. Replays and other partners are excluded.
- The interface inserts text safely and never renders source HTML.

The `.ics` download is a snapshot, not a calendar subscription. Re-importing it is not a reliable way to remove canceled events. Stable event UIDs reduce duplicate imports, but each calendar app controls import behavior. The calendar does not probe video playback; “Scheduled now” refers to the published schedule.

## Add another school

1. Prefer an official public JSON/iCalendar feed. Otherwise use a dedicated livestream list with explicit dates and watch links. Avoid paid APIs and browser automation when a simple source is available.
2. Add the school's metadata to `sources` and its host to the request allowlist in `scripts/ingest.mjs`.
3. Add an adapter in `adapters`. It returns an array with `title`, `start` (ISO with offset or UTC), optional `end`, `program`, `event_url`, `stream_url`, `watch_kind`, `evidence_url`, and `evidence`. Use a stable native `id` when possible; otherwise normalization derives one from source, event URL, and date.
4. Require affirmative livestream evidence. Do not infer streaming just because admission to the in-person concert is free. Throw on a structural source change; return an empty array only for a genuinely empty schedule.
5. Add parser fixtures and tests for dates, canceled records, and missing stream links. Run a real refresh, inspect the resulting listings, and then publish.

The test suite covers time zones, DST ambiguity, date filters, `.ics` escaping and UTF-8 folding, parser rules for all twelve active schools and the deferred Liechtenstein prototype, pagination, and failed-source retention. European parser fixtures preserve small relevant excerpts of the official HTML observed on September 25, 2026. The additional conservatory tests use reduced fixtures matching the observed September 25 layouts and cover same-day occurrence IDs, canceled listings, virtual-link validation, multi-performance exclusions, relevance-ordered search pagination, and date-only end metadata.
