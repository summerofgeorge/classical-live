# International expansion, September 27, 2026

## Active automatic sources

### Melbourne Conservatorium of Music, Australia

- [Official streaming page](https://finearts-music.unimelb.edu.au/about-us/mcm/conservatorium-streamed-concerts) explicitly identifies the Hanson Dyer Hall Tuesday evening series and the Melba Hall Monday lunch-hour series, with separate public players.
- [University's public event feed](https://events.unimelb.edu.au/live/json/events/group/Faculty%20of%20Fine%20Arts%20and%20Music/max/200) supplies dated events, native IDs, free admission, categories and timestamps. The collector checks individual event JSON-LD against the feed and the printed start-time metadata. In-person events without membership in an announced streamed series are excluded.
- Initial live validation found six future streams: October 5 Guitar Showcase, October 6 Kris Davis (jazz), October 12 Chamber Choir, October 13 Britten, October 19 Chamber Competition Finals and October 20 Dedications.
- The three 1:10 p.m. Melbourne concerts fall at 10:10 p.m. Eastern the previous day; the three 7:30 p.m. Melbourne concerts fall at 4:30 a.m. Eastern on the same date. Date-aware conversion uses Australia/Melbourne and America/New_York.
- Exact ends follow the university calendar. Humanitix advertised an extra five minutes for two concerts; the university's internally consistent timestamps are used.
- The streaming page returned a local HTTP 403, while the public event feed and detail pages were accessible. Collection uses the university event feed and the known official viewing page; it does not bypass challenges or infer recurring dates.

### Tokyo University of the Arts — Geidai, Japan

- [GEIDAI Music Archive](https://gma.geidai.ac.jp/) announces selected live university performances alongside recordings.
- The collector scans recent posts explicitly marked `【ライブ配信】`, then requires the event page's full Japanese date and start time to agree with the dated URL. It excludes ended broadcasts, cancellations and restricted streams.
- The most recent observed marked broadcast was [Morning Concert No. 10, August 29](https://gma.geidai.ac.jp/20260829-m010/), now explicitly ended. No future stream was found at initial validation. This source correctly returns zero while waiting for the next announcement.
- Coverage is limited to the archive's recent announced livestreams; ordinary archive records are never treated as upcoming concerts.

### Moscow Tchaikovsky Conservatory, Russia

- [Moscow Conservatory TV](https://www.mosconsv.tv/) links its [official Telegram channel](https://t.me/s/mosconsvtv) and provides a dedicated [public broadcast player](https://www.mosconsv.tv/stream).
- The collector reads dated monthly broadcast announcements from the public channel page. The year of each yearless Russian month/day entry is anchored to the original post timestamp. Old schedules cannot silently reappear in a later year.
- The September 1 announcement listed nine broadcasts, ending September 26. The initial September 27 collection retained that last event only under the existing 48-hour data-retention policy; the viewer's local-date filter hides it when appropriate. No October broadcast was invented.
- The player currently uses VK Video. Public page retrieval was tested; playback availability from each viewer's connection is not guaranteed.
- Both a same-day morning and evening concert remain distinct; simultaneous concerts in different halls also receive distinct IDs.

## Candidates not yet admitted

- **Senzoku Gakuen, Japan:** [October 10–11 festival announcement](https://www.senzoku.ac.jp/music/topics/20260623) plans free streaming at selected venues, but the 2026 performance timetable and individual watch links were not published on the [festival page](https://www.senzoku.ac.jp/SGF/) when checked. The site still contains 2025 material. Following the user's VPN change, its concert site became locally accessible; all six current event pages were checked, without a public livestream link. No placeholder festival event was created.
- **Yong Siew Toh Conservatory, Singapore:** [current concert calendar](https://www.ystmusic.nus.edu.sg/) and historical livestream evidence, without verified upcoming broadcast links.
- **Hong Kong Academy for Performing Arts:** [current music events](https://www.hkapa.edu/music) advertise performances and e-tickets, without confirmed upcoming classical streams in the pages checked.
- **Tianjin Juilliard:** its public 2026–27 calendar and October orchestra details were accessible; no broadcast destination was found on the inspected event.
- **New Zealand:** no new dated future public conservatory stream was confirmed. Existing Australia/New Zealand research remains applicable.

The VPN change did not make Juilliard, Peabody or Michigan's scripted index/detail requests work; they still returned HTTP 403. Their existing browser-reviewed records retain their original check dates and expiry. Local accessibility is not evidence that GitHub's independent refresh servers can collect a source reliably.

## Maintenance

The shared HTTP transport was extracted from the growing ingestion module. It counts actual network calls, including redirects and retries, and exposes per-source and aggregate usage. Full local validation reached the old 360-request engineering ceiling before Oberlin finished. The expanded registry now has a 600-request ceiling with a warning at 480; the 15-minute workflow timeout and per-source pagination bounds remain in place. This is an internal safeguard, not a paid-service allowance. Every allowed host is now paced to at most one request start per second, replacing the remaining short per-collector delays. This reduces bursts without reducing publication frequency. Access-denied and rate-limited responses are not retried; prior verified records retain their original verification time and expire. The refresh summary adds site size and advance warnings, keeping diagnostics out of the concert-viewing flow.

Regression tests cover public broadcast evidence, canceled and archived concerts, mismatched calendar timestamps, Australian DST and previous-day Eastern dates, Russian year rollover, simultaneous events, source failure retention, request caps, pacing, denied access and redirect behavior. A registry check catches new schools lacking a collector or geographic metadata.

No paid API, hosted browser, video storage, dependency or additional scheduled job was introduced. Daily refresh remains free under the existing public-repository runner setup. Per-run request/time limits remain meaningful even when monthly monetary usage is free.

The successful local end-to-end run refreshed all 28 automatic sources, plus the three existing browser-reviewed schools, using 361 of 600 HTTP requests in 252 seconds before extending one-second pacing to every host. The calendar build was 0.318 MB before incorporating the concurrently published support page. All 82 tests pass against the combined current codebase. [GitHub's standard public-repository runners remain free](https://docs.github.com/en/actions/reference/runners/github-hosted-runners); the [Pages site limit is 1 GB](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). These measurements do not claim to measure monthly visitor bandwidth.
