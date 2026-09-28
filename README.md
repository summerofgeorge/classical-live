# Classical Watch

A small, free calendar of conservatory livestreams, built for personal use and easy public sharing.

**Website:** https://classicalwatch.stringfestanalytics.com/

## What it does

- Lists verified upcoming streams with automatic local-time display and the original source time.
- Filters by All dates, Today, Tomorrow, Next 7 days, This weekend, school, performance type, region, country, published music-school enrollment, and search. Each date selection displays its exact range in the viewer's local calendar. Today includes earlier concerts; Next 7 days includes today; weekend means Friday–Sunday, excluding prior days.
- Opens the official stream, venue player, or clearly labeled school channel.
- Downloads one concert or the current filtered selection as an `.ics` file for Apple Calendar, Outlook, Google Calendar import, and other calendar apps.
- Refreshes and publishes daily at **3:15 a.m. America/New_York**, including daylight-saving changes. GitHub may delay scheduled starts.

No visitor accounts, database server, API keys, paid services, or frontend framework. The site is plain HTML/CSS/JavaScript; `dist/events.json` is the data store. Only the ingestion scripts use a dependency: Cheerio for parsing official HTML. Google Analytics loads automatically on the production hostname.

## Audience analytics

ClassicalWatch has its own GA4 property in the existing Stringfest Analytics account. The web stream is **ClassicalWatch website**, measurement ID **G-CCRKXW68XX**, with America/New_York reporting time. This public ID is not a password or API secret.

`dist/analytics.js` loads the Google tag once, automatically on `classicalwatch.stringfestanalytics.com`. Local previews and alternate hosts do not send events. Enhanced measurement supplies page views, engagement, scrolls, and outbound `click` events with Link URL and Link domain. Do not add a second page-view or outbound-click listener for these same events. A link click indicates departure to a concert provider; it does not establish that someone played or watched its video.

At George's explicit request, there is no analytics opt-in prompt or stored consent gate. The About section discloses Google Analytics and cookies. Advertising consent remains denied; Google signals and ad personalization are disabled. GA cookies use the `cw` prefix and ClassicalWatch hostname. Reports are subject to browser and network blocking and start when tracking was installed; they do not recover historical visits.

In Analytics, select **ClassicalWatch**. Use **Reports → Generate leads → Traffic acquisition** for incoming sources. The saved **ClassicalWatch — Outgoing links** exploration uses **Link domain**, **Link URL**, and **Event count**, filtered to **Outbound exactly matches true**. **Realtime** is useful for installation checks. Standard reports need processing time.

## Support page

`dist/support.html` introduces George and Stringfest Analytics, with referrals to professional Excel users as the main way to support Classical Watch. It is linked below the homepage introduction, in About, and in the footer. The page has the same automatic GA tag as the calendar. Links to Stringfest use `utm_source=classicalwatch`, `utm_medium=referral`, and `utm_campaign=community_support` so the main site's reports can identify those visits. No payment flow is included.

## Public coverage review

`dist/coverage.html` explains the admission criteria and broad reasons a school may be missing, with an invitation to contact George about desired additions. It is linked from the homepage's Coverage & methodology disclosure and footer. At George's request, individual school assessments stay in `docs/school-review-2026-09-27.md`, outside the published site. The public page and homepage also link to Bachtrack for professional orchestras and opera, distinguishing free browsing from free, paid, and subscription streams. These static additions make no requests to schools and need no additional runtime dependency.

## Sources

| School | Method | Admission rule |
| --- | --- | --- |
| [University of Toronto Faculty of Music](https://music.utoronto.ca/events) | Paginated official upcoming calendar and individual event pages | Free, public concert/recital/masterclass category plus an explicit public Faculty YouTube livestream paragraph on the event itself. Uses the full date and Eastern start/end times. Paid, private, canceled and postponed events excluded. |
| [Stanford Department of Music](https://music.stanford.edu/events) | Paginated official upcoming calendar, dated event and linked broadcast page | Explicit affirmative livestream link to the school's public viewing page; its program must match the dated concert and link public Vimeo or YouTube. Paid physical admission does not imply a paid stream. Dates use Los Angeles time; ambiguous ranges fail closed. |
| [Melbourne Conservatorium](https://finearts-music.unimelb.edu.au/about-us/mcm/conservatorium-streamed-concerts) | University LiveWhale JSON feed and structured event details | Free, dated membership in the explicitly streamed Hanson Dyer Hall or Melba Hall Lunch Hour series; calendar timestamps and event metadata must agree. Australia/Melbourne handles southern-hemisphere DST. |
| [Tokyo University of the Arts — Geidai](https://gma.geidai.ac.jp/) | GEIDAI Music Archive recent announcements and concert details | Explicit Japanese livestream marker, matching full concert date and start time; ended, canceled and restricted broadcasts excluded. A healthy empty announcement list is valid. |
| [Moscow Conservatory TV](https://www.mosconsv.tv/stream) | TV service's official public Telegram monthly broadcast announcements | Only explicitly scheduled broadcasts; the announcement timestamp determines the year of Russian month/day dates. Uses Europe/Moscow and the official public TV player. |
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
| [Indiana Jacobs](https://liveatjacobs.music.indiana.edu/) | Official LIVE@jacobs public JSON feed | Explicit online event flag and Jacobs viewing destination; canceled and all-day entries excluded. A single request supplies the schedule. |
| [Ohio State](https://music.osu.edu/events) | Paginated music calendar and individual event pages | Explicit public YouTube livestream plus Free and open to the public; Eastern calendar metadata must match the visible date and time. Cross-department links are skipped. |
| [Ohio University](https://calendar.ohio.edu/) | Public Localist events feed | Explicit Join Stream link to the university's public music YouTube channel. The physical-admission free flag is unset on these listings; admission is based on the public stream destination. Recurring instances have separate IDs. |
| [North Texas](https://recording.music.unt.edu/webcasts) | Public Kaltura Live Events page | Only upcoming and live entries, with scheduled Unix timestamps and public players. Archived recordings excluded. The landing page advertises the next batch, replenished at each daily refresh. |
| [Royal College of Music, London](https://www.rcm.ac.uk/events/live/) | RCM Live schedule | Explicit upcoming dates and public YouTube embeds; London DST conversion. |
| [Western University](https://music.uwo.ca/events/livestream/index.html) | Dedicated livestream schedule | Only dated entries before the Past Livestream Performances heading, with public Vimeo player; Eastern time and current rescheduled dates. |
| [Yale School of Music](https://music.yale.edu/live) | Official next-main-livestream JSON endpoint plus linked concert detail | Public online viewing explicitly requires no purchase or registration; API timestamp and printed Eastern time must agree. Limited to the next announced main broadcast. |
| [UdK Berlin](https://www.udk-berlin.de/kalender/) | Public calendar API searches, bounded pagination and dated event pages | Explicit Zum Livestream link on a musical event; multiple occurrences stay distinct and use Europe/Berlin. |
| [Reina Sofía, Madrid](https://www.escuelasuperiordemusicareinasofia.es/agenda/) | Paginated official agenda plus event details | A concert paragraph must explicitly promise a live broadcast and link public YouTube. Spanish dates use Europe/Madrid; radio-only coverage is excluded. |
| [Anton Bruckner University, Linz](https://www.bruckneruni.ac.at/de/besuchen/events) | Livestream category and individual event pages | Current + Livestream link and music-performance category required; talks and dance excluded. DD.MM.YYYY dates use Europe/Vienna. |
| [Colorado Boulder](https://cupresents.org/performances) | CU Presents public date-filtered JSON/HTML calendar and structured event pages | College of Music, free admission and an explicit dated Watch Here stream row. Mountain times are cross-checked against calendar metadata. Paid Takács broadcasts and monthly recital placeholders are excluded. |
| [Vanderbilt Blair](https://blair.vanderbilt.edu/livestreams/) | Official LiveWhale public JSON feed | Explicit free-event statement plus Watch the livestream link to the public hall players; Central timestamp and offset must agree. |
| [Iowa](https://music.uiowa.edu/events/school-music-livestream) | Dedicated upcoming-broadcast list plus individual event pages | Explicit public player link, with cancellation checked on both list and detail. The school's rolling five-event list limits advance coverage. |


Oberlin's separate API and embedded widget initially returned HTTP 403. The collector instead uses the public webcast search linked by Oberlin itself, verifies each event's explicit webcast link, and spaces requests one second apart. HTTP 403 and 429 are not retried or bypassed. A successful request does not establish that a local VPN caused an earlier failure; GitHub's refresh runs independently of the user's connection.

Juilliard, Peabody, and Michigan have selected **browser-reviewed listings**, separate from the automated collectors. On September 25, 2026, both official calendars loaded in the local browser with the user reporting the VPN off. PowerShell and Node requests still returned HTTP 403, including the current Juilliard calendar and Peabody's published REST index. This does not establish the VPN as the cause or establish reliable unattended retrieval.

`data/browser-reviewed.json` contains 10 Juilliard, 6 Peabody, and 6 Michigan performances checked directly on official event pages. Michigan’s September 29–October 30 entries each have an explicit Livestream link, free admission, and a printed local date and time. Its pages work in the local browser, while direct HTTP collection returns 403. Juilliard candidates came from its Live Streaming filter; each included event also displayed a stream countdown, with Eastern calendar metadata agreeing with the printed date/time. The October 6 jazz event lacked event-page broadcast evidence and was omitted. Peabody requires an explicit Livestream link and Free label; its calendar links supply Eastern offsets and end times. An equal start/end is treated as an unknown duration. No event is inferred from free admission alone. Some Juilliard streams may require a free Juilliard LIVE account, disclosed beside the Watch link.

`scripts/reviewed.mjs` merges these observations after automatic collection. Their original `checked_at` becomes `last_verified_at` and is **never renewed by a scheduled build**. Events expire 14 days after that check, both during refresh and in the browser even if no new deployment occurs. Source status is `manual` while current and `review_due` after expiry, which requests attention in the workflow. New concerts and cancellations at these three schools need another browser review. To update, recheck the official pages, replace that school's reviewed events (including removals), and set its actual check time; never advance the timestamp without reviewing. Do not list these schools in `ingest.mjs`'s automated source registry until unattended access is verified.

The look-ahead window is 45 days, limited by what each school has actually published. Some sources show only the next few performances. This is selective coverage, not every concert at every school. Even a daily refresh can miss last-minute additions or cancellations; always check the linked official event page.

The September 25 follow-up found scheduled broadcasts on RCM Live, so RCM is now active alongside Weimar. Kent State was checked: its official music BoxCast player reported no announced broadcasts. UBC's calendar tagged concerts as streaming but did not provide a verified current viewing destination, and McGill's pages were blocked locally. Paris had replay material but no confirmed upcoming broadcast in the inspected schedule. None was added speculatively. These research notes belong here, not in the public site's About section.

Liechtenstein is also deferred. [The academy](https://www.musikakademie.li/) links its [Kulmag stream schedule](https://www.kulmag.live/de/Partner/2/musikakademie-in-liechtenstein), which identified eight free upcoming streams in local tests. Two complete production refreshes received HTTP 403, including after pacing requests; isolated GitHub checks succeeded on other runners. The reason for this inconsistent access is unconfirmed. Its prototype adapter, fixtures, and metadata in `candidateSources` are retained for future work, but it is excluded from the active `sources` list, published events, and daily refresh. Do not enable it until hosted access is dependable.

## September 26 coverage expansion

Seven automated schools were added after investigating all 19 requested candidates and three additional European schools. See [the complete assessment](docs/coverage-assessment-2026-09-26.md) for decisions, official sources, actual event counts, verification and remaining limits. UCLA, Kansas and Arizona remain candidates; none was added solely because it has a video player.

`scripts/european.mjs` and `scripts/american.mjs` use the existing HTTP fetcher, normalization, stale-data handling and daily workflow. New hosts are paced at one request per second. New fixtures cover Unicode, US/European DST, positive broadcast evidence, duplicate metadata, legacy viewing redirects, cancellations, pagination limits and calendar downloads. Tests do not require network access. No new dependencies or paid services were added.

## September 27 international expansion and maintenance

Melbourne, Geidai and Moscow now use the daily automatic refresh. See [the international assessment](docs/international-expansion-2026-09-27.md) for evidence, coverage limits and remaining candidates. The initial check found six future Melbourne streams, no future Geidai announcement and a Moscow September schedule whose dates were already past. Adding a collector does not imply that the school currently has an upcoming broadcast.

`scripts/international.mjs` follows the regional-adapter interface used by the existing sources. `scripts/http.mjs` now owns request pacing, redirects, retries and response-size checks. Its 600-request ceiling counts **every actual HTTP request**, including redirect hops and retries. Every allowed host is paced to at most one request start per second; individual collectors no longer manage their own delays. Access-denied and rate-limited responses, off-site redirects, malformed JSON and redirect loops fail without wasteful retries. New collectors add no dependencies or paid services.

`events.json` includes total request count, response bytes and collection duration, plus request count and duration per automatic school. The Actions summary reports these figures and published-site size. Warnings begin at 80% of the request ceiling, 10 minutes of collection time or 800 MB of site files. The request ceiling and workflow timeout are engineering safeguards, not paid allowances. Actual visitor bandwidth and account-wide storage are not measured by these figures.

Daily publication remains at 3:15 a.m. Eastern: using a standard runner on a public repository is free, and daily checks help catch additions and cancellations. Lowering frequency would not change the request or runtime demand of each refresh.

## September 27 Cleveland-area expansion

Baldwin Wallace, Bowling Green, Carnegie Mellon, Duquesne, the University of Pittsburgh and Case Western Reserve now participate in the existing daily refresh. Their collectors require explicit public livestream evidence on an official schedule or concert record. The initial regional run found 35 listings with 30 requests. See [the regional review](docs/great-lakes-expansion-2026-09-27.md) for admission rules and the remaining Cincinnati CCM, Michigan State, Akron and Kent State evidence gaps. These additions use the existing free operating model and add no dependencies or scheduled jobs.

## September 27 candidate audit follow-through

UT Austin Butler and Temple Boyer now have automatic collectors. Initial verification found two Butler streams and 15 Boyer streams using 41 requests in about 37 seconds. Both require an explicit public viewing destination on each event. Temple's printed Philadelphia date is checked against the detail page and its UTC analytics date, avoiding an off-by-one-day error for evening performances after daylight saving ends. See [the integration notes](docs/audited-expansion-2026-09-27.md).

Two McGill concerts and the October 4 Mannes / New School Schneider Concerts performance are browser-reviewed additions. Their pages work in the browser but direct collection returned HTTP 403. They use the existing 14-day verification expiry and do not gain a new verification date during scheduled builds. Mannes offers a $0 livestream registration option; its button says **Register to watch** and explains that the organizer emails the viewing link. No registration was submitted. McGill needs another browser check before its October concerts because these initial observations expire earlier.

## Sharing preview

The homepage includes Open Graph and X large-image card metadata in the initial HTML, including for `?event=` performance links. `dist/social-card-v3.jpg` is a 1200 × 630 default Classical Watch preview with the site name, domain, and a real Pixabay photograph of a cello. The share dialog previews it. The existing share message still names the performance and credits Classical Watch; the image is generic. No homepage-only `og:url` or canonical tag is added to override performance-specific query links.

Preview rendering and caching are controlled by the receiving platform; these tags do not attach an image file to a post or guarantee a preview in every app. The asset is hosted on the existing site with no extra API or service. It was created with the built-in image-generation tool and exported as an optimized JPEG; [asset notes](docs/social-preview.md) retain the prompt.

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

The repository is public and uses the standard `ubuntu-latest` runner, which GitHub currently provides free for public repositories and Pages. The workflow skips the job if the repository becomes private. It stays daily with a 15-minute timeout, a 600-call collector budget, one-day Pages artifact retention, and no paid APIs or hosted browsers. The published site is under 1 MB, with no stored video. Prioritize established music schools with frequent confirmed free streams; do not expand at the expense of this operating model. No custom domain is required.

In repository **Settings → Pages**, select **GitHub Actions** as the source. The `Refresh and publish calendar` workflow runs on pushes to `main`, manually through **Actions → Run workflow**, and on the daily schedule. It tests, refreshes, commits the data file, and deploys `dist/` in the same run. A bot commit does not need to trigger a second workflow.

GitHub's built-in token is used; no personal access token or third-party secret is required. Public repositories with no activity for 60 days can have scheduled workflows disabled; the daily data commit normally keeps this repository active while refreshes work. If a source fails, the workflow publishes the available data and then reports a failure. GitHub's normal workflow notification settings control any email alerts.

References: [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Data quality and failure behavior

- Source URLs and redirect destinations must be HTTPS and on an explicit allowlist.
- Requests have timeouts, a single retry for transient errors, and a bounded request budget. Pages are parsed without running their scripts.
- Each source is isolated. A source failure preserves its previously verified upcoming events for at most 14 days and marks them stale. Healthy sources replace their old records, so removed events disappear.
- A failed or unexpectedly changed source is visible in `events.json`, the site's source status, and the Actions summary. The site also warns if the entire data file is over two days old.
- Events are deduplicated, sorted, and filtered by date. Today's concerts remain visible until midnight in the viewer's time zone, including after their scheduled end or 90-minute duration estimate. They are labeled Started earlier after that time; this does not claim that video is still playing. An explicitly ongoing overnight performance remains available until its scheduled end. Collection keeps up to 48 hours of recently started listings so a refresh does not prematurely remove a concert during someone's local day; the browser hides previous-day concerts. Healthy sources can still withdraw listings, and manual-review expiry remains enforced. Calendar invitations keep their original end times or the disclosed 90-minute estimate.
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

The test suite covers time zones, DST ambiguity, date filters, `.ics` escaping and UTF-8 folding, parser rules for every automatic school and the deferred Liechtenstein prototype, pagination, and failed-source retention. Regional fixtures preserve relevant excerpts of the official pages observed during source verification. Tests also cover same-day occurrence IDs, canceled listings, virtual-link validation, multi-performance exclusions, relevance-ordered search pagination, date-only end metadata, request accounting and source-directory consistency.

## School filters and viewing help

`dist/schools.js` keeps location and published collegiate music enrollment separate from event data. Size bands are under 500, 500–999, and 1,000+. Thirteen schools have a linked official enrollment figure; estimates are labeled and dated when the source supplies a year. No overall university totals, preparatory divisions, or combined music/dance/theatre totals are substituted for music enrollment. Unknown values remain available under Not listed. Source links appear in About → Browse the schools. These are approximate discovery filters, not rankings.

The public page keeps George's personal story, basic viewing guidance, and a separate TV guide recommending his preferred Chrome-on-laptop casting method. Implementation details and candidate-school research stay in this README. Casting steps follow [Google's Chrome casting instructions](https://support.google.com/chromecast/answer/3228332?hl=en).

## September 28 conservatory audit and sharing

Added Boston University, Hartt, Ithaca, Florida State, SUNY Potsdam Crane, CSU Long Beach, Miami Frost and BYU. [The complete 82-entry Wikipedia inventory](docs/us-conservatories-2026-09-28.md) accounts for every institution, including existing coverage, candidates, access restrictions and former schools. `scripts/conservatories.mjs` uses explicit stream evidence and the existing request budget, pacing and stale-data rules. It adds no services or dependencies.

The performance sharing panel supports Email, Text message, Facebook and X, plus copying details and the native share sheet. Email and text carry full concert details and an explicit time zone; the visitor chooses a recipient and sends in their own app. [Photo provenance and editable layout](docs/social-preview.md).

BYU’s GitHub-hosted collector returned HTTP 403 during the September 28 deployment. Its ten locally browser-reviewed streams use the existing 14-day review expiry instead of scheduled scraping. The source’s check timestamp is not advanced by daily builds. Case Western’s official calendar now includes flattened music-department event URLs; the collector accepts these while retaining same-origin, department-path and event-header streaming checks.
