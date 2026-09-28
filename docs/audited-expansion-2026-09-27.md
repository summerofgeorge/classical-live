# Follow-through on the 38-institution candidate audit

Reviewed September 27, 2026, America/New_York. This extends the audit with validated integration work; it does not admit every school from the candidate list.

| School | Method | Initial accepted listings | Scope and limits |
| --- | --- | ---: | --- |
| UT Austin Butler | Automatic, `scripts/audited.mjs` | 2 | Official Streamed Online filter, then event-specific public YouTube button. Keeps subtitles such as Finals; checks printed dates against Central offsets. A streaming category without a viewing link is not enough. |
| Temple Boyer | Automatic, `scripts/audited.mjs` | 15 | Official Boyer calendar and Temple Now detail pages. Requires a free public event and explicit Boyer YouTube livestream paragraph. Keeps both October 9 Mosaic performances. Skips dance, high-school events, and concerts without a stream announcement. |
| McGill Schulich | Browser-reviewed | 2 | October 24 Essential Handel and October 26 Jazz Orchestra I. Official pages explicitly promise webcasts on the public Schulich YouTube channel. Direct HTTP returned 403. |
| Mannes / The New School | Browser-reviewed | 1 | October 4 Tesla Quartet, Schneider Concerts. Current season, individual event, and livestream registration pages agree on the date/time and offer $0 registration. |

The two automatic sources used **41 actual HTTP requests and 37.3 seconds** in their isolated live check. The existing transport supplies host pacing, bounded pagination, request accounting, error reporting, and 14-day stale-data retention. There are no added dependencies, paid APIs, or scheduled jobs. The full production run remains the final capacity check.

## Source details

- [UT Austin streaming calendar](https://music.utexas.edu/events?field_cofaevent_types_target_id%5B0%5D=236): explicit public channel links on the [October 1 finals](https://music.utexas.edu/events/6117-butler-opera-international-competition) and [October 4 Symphony Band](https://music.utexas.edu/events/6089-symphony-band). Later streaming-category events without links wait for the daily refresh to see a published destination. Program pages can contain malformed nested article markup, so extraction remains scoped to the main event content rather than assuming the outer article contains everything.
- [Temple calendar](https://boyer.temple.edu/events): chronological pagination is bounded to the look-ahead window. A November 7 evening recital has a November 8 UTC analytics date; its printed date, URL, and detail page correctly say November 7. The collector uses the printed local date and separately cross-checks UTC metadata.
- [McGill Essential Handel](https://www.mcgill.ca/music/channels/event/opera-mcgill-essential-handel-374055): October 24, 7:30–9:30 p.m. Eastern; live browser page now names Pollack Hall, unlike older indexed text. [Jazz Orchestra I](https://www.mcgill.ca/music/channels/event/mcgill-jazz-orchestra-i-374061): October 26, 7:30–9:30 p.m. Eastern. Both link `https://www.youtube.com/schulichmusic`. Hall ticket prices on the jazz event do not price the public YouTube webcast.
- [Tesla Quartet event](https://event.newschool.edu/schneiderconcerts-erinys) and [livestream registration](https://event.newschool.edu/schneiderconcerts-livestream-erinys): October 4, 2–4:30 p.m. EDT in the event header, with a roughly two-hour concert described in the body. The URL retains an old Erinys slug and one livestream-page sentence retains that name; the current season, title, image, biography, repertoire, and linked individual event identify Tesla. Registration is explicitly free or optionally paid. The organizer says it emails the viewing link 24 hours before the concert, activating it about 15 minutes before the start. No form was submitted.

McGill and Mannes keep the actual browser-review timestamp from `data/browser-reviewed.json`. These observations expire after 14 days, including in a page left open. In particular, McGill's October concerts require another check before they occur. Do not add either source to the automatic registry or renew its timestamp without a new review.

Parser verification covers positive and negative stream evidence, private/unstreamed events, cancellations, dates and offsets, pagination/filter preservation, same-day occurrences, shared calendar generation, and independent browser-review expiry. Broader audit findings remain internal; the public coverage explanation stays general.
