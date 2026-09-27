# Cleveland-area and Pittsburgh coverage review — September 27, 2026

Six schools join the automatic daily refresh. The first complete regional check returned 35 listings in the existing 45-day window, using 30 HTTP requests in about 28 seconds. Recently started concerts can remain in the data under the existing 48-hour retention rule; the interface still hides previous-day concerts. Counts are observations, not a promise of future volume.

| School | Initial listings | Official evidence and admission rule |
| --- | ---: | --- |
| [Baldwin Wallace](https://www.bw.edu/events/) — Berea | 5 | The public calendar JSON tags the concert Concerts, Conservatory and Live Stream. Its individual page must supply an actual BoxCast link in Watch It Live, with matching calendar/detail timestamps. A placeholder saying link coming soon is excluded. |
| [Bowling Green](https://www.bgsu.edu/musical-arts/events/live-streaming.html) | 17 | College of Musical Arts membership and explicit Livestream/free tags in its official Localist calendar. The school's viewing page identifies the public BGSU Music YouTube channel. Faculty talks and jazz listings are excluded. Physical ticket prices at the New Music Festival do not determine access to the public broadcast. |
| [Carnegie Mellon](https://events.cmu.edu/music/) — Pittsburgh | 1 | The School of Music LiveWhale event description explicitly links the individual public YouTube broadcast. September 27 Philharmonic and Choir: 7:30 p.m. Eastern. Timestamp and Eastern offset must agree. Physical admission charges are separate. |
| [Duquesne](https://www.duq.edu/academics/colleges-and-schools/music/iemma/iemma-broadcast-network.php) — Pittsburgh | 2 | Only dated cards under Upcoming Live Streams, beside the public Iemma Vimeo player. The visible dates and clocks are authoritative: current HTML datetime attributes contain incorrect years and minutes. The audio station, archive, jazz and later-season dates are excluded. |
| [University of Pittsburgh](https://calendar.pitt.edu/department/department_of_music) | 4 | Music department ID 20564, free admission, hybrid/virtual experience and an explicit Music at Pitt YouTube stream URL in the official Localist record. Concerts and showcases qualify; dissertation defenses and jazz listings do not. |
| [Case Western Reserve](https://case.edu/artsci/music/news-events/upcoming-concerts-events) — Cleveland | 6 | The individual concert header must explicitly offer free virtual/livestream admission and a Watch link to Silver Hall or Harkness Chapel. Generic venue links repeated at the bottom of all concert pages do not qualify. Both current header formats are supported. |

## Requested schools not yet eligible

These remain research candidates rather than automatically verified sources. This is a limitation of the inspected evidence, not a judgment on musical quality or a claim that the school never streams.

- **Cincinnati CCM:** its [official livestream pages](https://www.ccm.uc.edu/overview/videos/live-stream.html) provide public venue players. The four published upcoming-stream calendar feeds for Werner, Corbett Auditorium, Patricia Corbett Theater and Watson returned empty arrays on this check; the browser's Werner schedule likewise showed no dated upcoming entries. Existing graduation videos are not upcoming concert streams. Revisit when a dated schedule is published.
- **Michigan State:** the [official livestream page](https://music.msu.edu/livestream/) returned an Incapsula security challenge to automated requests and an additional-security-check CAPTCHA in the browser. No challenge was bypassed, and no unverified event was added. University of Michigan's existing reviewed listings are a different school.
- **Akron:** the [School of Music](https://www.uakron.edu/music/) links its performing-arts calendar, but none of the 79 retrieved calendar records provided explicit livestream evidence in the inspected descriptions. Its linked music YouTube handle returned 404. Free in-person admission alone does not establish a stream.
- **Kent State:** the [music livestream page](https://www.kent.edu/music/concert-live-stream) has a BoxCast player, but the earlier September 25 review found no announced broadcasts. The current concert calendar alone does not establish which events will stream; retain as a candidate.

## Maintenance and verification

`scripts/great-lakes.mjs` uses the shared paced HTTP client, explicit host allowlist, normalization, Eastern daylight-saving conversion, request ceiling, and stale-data retention. Feed pagination and detail requests are bounded. A changed or blocked source reports an error instead of silently treating it as an empty successful schedule. No new dependency, account, API key, paid service or scheduled job is required.

Fixtures retain relevant excerpts from the official pages and JSON observed on this date. Tests cover positive evidence, removed broadcasts, cancellations, school identity, free access, November DST, same-day occurrence IDs, broken dates, bounded pagination, shared source metadata and stale-event retention. Music enrollment stays unknown for these six schools rather than substituting whole-university or combined performing-arts totals. School assessments stay in this repository, outside the published site.

API references: [Localist's official parameter documentation](https://developer.localist.com/doc/api) (`group_id` handles departments as well as groups), and [LiveWhale's JSON API](https://support.livewhale.com/live/blurbs/json-api). Public feeds require no credentials in these checks; access changes should fail visibly.
