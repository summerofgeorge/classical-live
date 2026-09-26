# European and American coverage assessment — 26 September 2026

Research completed before implementation. These are findings from the current public schedules, not claims that a deferred institution never streams. Existing Weimar and Royal College of Music coverage is preserved.

| School investigated | Assessment and decision |
|---|---|
| **UdK Berlin, Germany** | **Implement.** Its [calendar](https://www.udk-berlin.de/kalender/) advertises a public JSON API. Searching for livestreams finds the recurring [Corporate Concert](https://www.udk-berlin.de/veranstaltung/corporate-concert-3/) chamber series with an explicit public venue-stream link and four fully dated occurrences. November 4 is inside the current 45-day window. The general streaming landing pages alone would have missed this. Exclude worship services and jazz, and require an event-specific viewing link. |
| **mdw Vienna, Austria** | **Defer.** The [official mdwStream filter](https://www.mdw.ac.at/veranstaltung/?1&f=vermdwStream) currently returns no matching events, including a date range through December 31; the unfiltered future range does return events. Its [Mediathek](https://mdw.vhx.tv/browse) and past concerts demonstrate streaming infrastructure, but no current eligible future broadcast was verified. A strong candidate when dated streams reappear. |
| **Royal Conservatoire The Hague, Netherlands** | **Defer.** The [livestream page](https://www.koncon.nl/livestreams) refers to 2020–21, with no upcoming public stream list and a distinction between public and private educational streams. The [current agenda](https://www.koncon.nl/agenda) and sampled October concert give venue/ticket information without broadcast confirmation. |
| **Royal Academy of Music, London** | **Defer.** The [current calendar](https://www.ram.ac.uk/whats-on) is a JavaScript application. Public searches and the current official homepage did not establish an upcoming recurring free-stream schedule. Old streaming initiatives and a YouTube channel do not establish which current concerts are broadcast. |
| **Guildhall, London** | **Defer.** The [calendar](https://www.gsmd.ac.uk/whats-on) uses a Drupal event listing, but the public material inspected did not establish a current musical broadcast schedule. GuildhallStream is described as an internal platform; the announced graduation stream is outside this roundup's performance scope. |
| **Royal Northern College of Music, Manchester** | **Defer.** [Watch / Listen](https://www.rncm.ac.uk/watch-listen/) is principally recorded material. The [current calendar](https://www.rncm.ac.uk/whats-on/events/) and sampled October chamber concert confirm physical admission, not a livestream. |
| **Sibelius Academy / Uniarts Helsinki, Finland** | **Defer.** The [calendar](https://www.uniarts.fi/tapahtumakalenteri/) is readable, but the earlier September 25 scan of 62 upcoming concert pages found no explicit broadcast links. A fresh check of the November 4 symphony concert again specifies hall admission without streaming. Free entry is not free streaming. |
| **Mozarteum University Salzburg, Austria** | **Defer.** The [calendar](https://www.moz.ac.at/de/veranstaltungen) has an accessible event-overview endpoint and useful structured pages. Current sampled concerts do not identify broadcasts; the explicit competition streams found were past events. Generic YouTube/Vimeo cookie notices are not evidence of streaming. |
| **Hanns Eisler Berlin, Germany** | **Defer.** A maintainable [event calendar](https://www.hfm-berlin.de/veranstaltungen/veranstaltungskalender/) and [EislerTube](https://tube.hfm-berlin.de/) exist, but the inspected upcoming recital provides no stream announcement. The presence of a video platform alone is insufficient. |
| **HMTM Munich, Germany** | **Defer.** The [calendar](https://hmtm.de/veranstaltungen/) and homepage are current. Explicit public streams found in official searches concerned a 2025 competition; no recurring upcoming eligible broadcast schedule was verified. |
| **Conservatoire de Paris, France** | **Defer.** The [2026–27 season](https://www.conservatoiredeparis.fr/fr/la-saison) is accessible. The sampled October Monteverdi concert gives physical venues and free admission without broadcast confirmation. Replay collections and past capture programmes do not qualify as upcoming streams. |
| **Escuela Superior de Música Reina Sofía, Madrid** | **Implement, with limited present coverage.** Its [current agenda](https://www.escuelasuperiordemusicareinasofia.es/agenda/) has predictable paginated HTML. The September 26 chamber concert explicitly promises a public YouTube broadcast. Other future pages currently lack that video-stream statement, so they will be excluded until it appears. Radio-only announcements are also excluded. The school's published 2024–25 report describes 137 YouTube concert broadcasts, supporting recurring supply despite the small current announced list. |
| **Anton Bruckner Privatuniversität, Linz, Austria** | **Implement.** The [calendar's livestream category](https://www.bruckneruni.ac.at/de/besuchen/events?tx_gtncachedevents_pilistfilteredlist%5Bfilter%5D%5Barea%5D%5B%5D=112) currently identifies three music degree recitals within 45 days and further concerts later in the season. Individual event pages repeat the explicit stream label. Its [public player](https://www.bruckneruni.ac.at/de/livestream) supplies the viewing destination. Exclude dance, talks and other non-musical events. |
| **Royal Danish Academy of Music, Copenhagen** | **Defer.** Its [calendar](https://www.dkdm.dk/da/kalender) is readable and a past April debut explicitly linked a livestream. The sampled upcoming October recital and November debut do not yet provide one. |
| **Hochschule für Musik Mainz, Germany** | **Defer.** The [weekly studio-stream series](https://www.musik.uni-mainz.de/2025/01/13/livestreams-aus-der-hfm-mainz/) is promising, but the published dated list is still summer 2026. Do not invent a winter schedule from its usual weekly pattern. |

## Selection and implementation plan

Add UdK Berlin, Reina Sofía and Anton Bruckner University through the existing bounded HTTP ingestion architecture. Require positive current event-level evidence, preserve original titles and Unicode, convert the school's wall clock using its IANA time zone, and use the existing 45-day window and stale-data safeguards. No browser automation, API keys or paid services will be required by scheduled ingestion.

Reina Sofía publishes **more than 150 music students** in its [2026–27 admissions announcement](https://www.escuelasuperiordemusicareinasofia.es/abierto-el-plazo-de-inscripcion-para-las-audiciones-del-curso-2026-2027-en-la-escuela-reina-sofia/). UdK and Bruckner include other arts disciplines; use **Not listed** unless a comparable music-only figure is readily verifiable.

## Reliability limits

- A school can announce streams late or retract them. Source pages take precedence over cached search results. For example, a search result advertised a Bruckner competition livestream while the current event page had removed that label; it is excluded.
- Vienna and UdK illustrate why a video archive or streaming room is insufficient: only an actual dated public broadcast belongs in the feed.
- Madrid's dedicated live landing page is stale; use the current concert agenda and explicit broadcast paragraph instead. Do not equate paid hall tickets with paid streaming, or radio coverage with video.
- Viewing destinations may be a shared venue player or official channel rather than a unique video URL. Label those accurately; do not invent direct video links or concert end times.

Results follow the American assessment below.

## American assessment — completed before American implementation

All seven requested American candidates were investigated. Implement Yale, Colorado Boulder, Vanderbilt Blair, and Iowa. Keep the other three as candidates rather than guessing broadcast availability.

| School | Public streaming and discovery evidence | Decision |
|---|---|---|
| Yale School of Music | [Main public player](https://music.yale.edu/live) and its next-livestream JSON endpoint identify the Sept. 27 Sérgio Assad celebration. The ticket/detail page initially presented a security challenge, then became accessible on the user-requested retry. It explicitly says no purchase or registration is needed to watch online. The calendar alias still should not be used; the feed supplies the actual ticket/detail URL. | **Implement after reassessment.** Cross-check the next main broadcast against its dated, publicly viewable event page. One-event lookahead; separate student-room feeds remain excluded. |
| Colorado Boulder | [CU Presents calendar](https://cupresents.org/performances) has a public date-filtered JSON/HTML endpoint, complete pagination metadata, and event-specific Watch Here offers. [Free livestream portal](https://cupresents.org/livestreaming) distinguishes four free music-school venue players from paid Takács streams. Localist API returned 403, but CU Presents works. | Implement the authoritative CU Presents feed. Require College of Music, an actual dated stream offer and a free concert. Exclude the paid Takács series, broad monthly recital placeholders and unrelated productions. |
| UCLA | [Tribe Events REST API](https://schoolofmusic.ucla.edu/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-09-26&end_date=2026-11-10) returned 25 events, none with an event-specific livestream announcement. [Public venue players](https://schoolofmusic.ucla.edu/school-of-music-live-streams/) exist, but generic navigation links cannot establish which concerts broadcast. | Defer pending event-level stream flags or a published blanket policy. The calendar itself is accessible. |
| Vanderbilt Blair | [Public LiveWhale feed](https://events.vanderbilt.edu/live/json/events/tag/blair/max/100) returned 91 events through March 2027. Multiple classical recitals explicitly say free and link the [public livestream portal](https://blair.vanderbilt.edu/livestreams/). The portal's short two-event list alone understates its coverage. | Implement the API, requiring the explicit free-event statement and broadcast link. Check cancellation, music scope, zone and window. |
| Iowa | [Dedicated upcoming livestream list](https://music.uiowa.edu/events/school-music-livestream) supplies five dated concerts and links authoritative event details. Details identify the actual public stream; one currently listed concert has been cancelled, making a detail recheck essential. The secondary player repeats the same five-event list. | Implement the dedicated list plus detail verification. Rolling short lookahead, not a complete 45-day inventory; remove cancelled events. |
| Kansas | [School calendar](https://music.ku.edu/calendar) links public venue players. Its API initially returned 403, then became readable on the requested retry. The [music-only feed](https://calendar.ku.edu/api/2/events?group_id=31892150751261&days=45&pp=100) returned 60 events in one complete page, none with an explicit stream announcement or URL. | Defer for lack of event-level broadcast evidence, rather than current access failure. Public venue players do not establish that all concerts stream. |
| Arizona | [School calendar](https://music.arizona.edu/news-events/events/) and [Oct. 1 Adam Nissenbaum recital](https://music.arizona.edu/events/guest-artist-adam-nissenbaum-trombone/) confirm free public streams through [the school's live redirect](https://music.arizona.edu/live). Calendar HTML contains no event list; dates require a custom month-filter request followed by a second AJAX Load More request. The public WordPress REST types omit the events type. | Defer this round: strong candidate, but discovery needs a separate tested adapter for its multi-stage custom calendar. Ordinary event-page parsing is easy; obtaining a complete dated list is the unfinished part. Future implementation must use America/Phoenix (no daylight saving time). |

Enrollment: Iowa publishes 450 undergraduate/graduate music students; Blair publishes approximately 245 undergraduate music students. Colorado's readily found official figure is from 2020, so the directory will say Not listed rather than present it as current. No parent-university counts are used.


## Implementation results — 2026-09-26T10:19:16.873Z

Seven new automatic sources bring the directory to 28 schools: 25 automatic collectors and the same three independently reviewed sources. The existing daily 3:15 a.m. America/New_York schedule, standard public GitHub runner, 15-minute timeout, 360-call budget and one-day artifact retention are unchanged. There are no new dependencies, credentials, paid APIs, hosted browsers or video-storage costs.

Counts below distinguish concerts that have not started from recently started records retained by the existing viewer-local-day policy. The Madrid concert began at noon in Spain (6 a.m. Eastern) today; its presence is not evidence of another later broadcast. Iowa's additional retained record is yesterday evening's Choral Collage and is hidden from today's Eastern-time results.

| Implemented school | Not yet started | Records in data | Discovery and viewing source |
|---|---:|---:|---|
| Yale School of Music | 1 | 1 | [Calendar](https://music.yale.edu/live); [Watch](https://music.yale.edu/live) |
| University of Colorado Boulder College of Music | 10 | 10 | [Calendar](https://cupresents.org/performances); [Watch](https://cupresents.org/livestreaming) |
| Vanderbilt Blair School of Music | 11 | 11 | [Calendar](https://blair.vanderbilt.edu/livestreams/); [Watch](https://blair.vanderbilt.edu/livestreams/) |
| University of Iowa School of Music | 3 | 4 | [Calendar](https://music.uiowa.edu/events/school-music-livestream); [Watch](https://music.uiowa.edu/events/school-music-livestream) |
| Universität der Künste Berlin — Faculty of Music | 1 | 1 | [Calendar](https://www.udk-berlin.de/kalender/); [Watch](https://www.udk-berlin.de/universitaet/fakultaet-musik/veranstaltungen/live-uebertragung-konzerte-und-veranstaltungen/live-aus-dem-joseph-joachim-konzertsaal/) |
| Anton Bruckner Privatuniversität | 3 | 3 | [Calendar](https://www.bruckneruni.ac.at/de/besuchen/events?tx_gtncachedevents_pilistfilteredlist%5Bfilter%5D%5Barea%5D%5B%5D=112); [Watch](https://www.bruckneruni.ac.at/de/livestream) |
| Escuela Superior de Música Reina Sofía | 0 | 1 | [Calendar](https://www.escuelasuperiordemusicareinasofia.es/agenda/); [Watch](https://www.youtube.com/escuelademusicareinasofia) |

### Actual concerts found

All times below are America/New_York, including the appropriate daylight-saving transition. Original titles are preserved. “Earlier today / recent” reflects the start instant; the site labels scheduled-now and started-earlier events using its documented duration rules.

| School | Eastern date and time | Concert |
|---|---|---|
| University of Iowa School of Music | Sep 25, 2026, 8:30 PM EDT · earlier today / recent | [Choral Collage Concert](https://music.uiowa.edu/event/38075/0) |
| Escuela Superior de Música Reina Sofía | Sep 26, 2026, 6:00 AM EDT · earlier today / recent | [Ciclo Da Camera: Trío Archai y Cuarteto Ineo](https://www.escuelasuperiordemusicareinasofia.es/evento/ciclo-da-camera-grupos-de-cuerdas/) |
| University of Iowa School of Music | Sep 26, 2026, 4:00 PM EDT | [Eleanor Waltzes: Women’s Poetry and Music for Eleanor Roosevelt During the Great Depression](https://music.uiowa.edu/event/38177/0) |
| Yale School of Music | Sep 27, 2026, 3:00 PM EDT | [Yale Guitar Studio celebrates Sérgio Assad](https://music-tickets.yale.edu/993/27420) |
| University of Iowa School of Music | Sep 27, 2026, 4:00 PM EDT | [Key Change: A Prelude to a Fugue. Concert #1](https://music.uiowa.edu/event/38369/0) |
| University of Iowa School of Music | Sep 28, 2026, 8:30 PM EDT | [Faculty Concert: Molly Wise, Viola and Ting-Ting Yang, Piano](https://music.uiowa.edu/event/38411/0) |
| Vanderbilt Blair School of Music | Sep 29, 2026, 8:30 PM EDT | [Student Recital: Conrad Wilson, trombone](https://events.vanderbilt.edu/blair/event/104197-student-recital-conrad-wilson-trombone) |
| University of Colorado Boulder College of Music | Sep 29, 2026, 9:30 PM EDT | [Faculty Tuesdays: Andrew Lynge, Percussion](https://cupresents.org/show-details/faculty-tuesdays-andrew-lynge-percussion) |
| Vanderbilt Blair School of Music | Oct 4, 2026, 3:30 PM EDT | [Student Recital: Hannah Lam, percussion](https://events.vanderbilt.edu/blair/event/100919-student-recital-hannah-lam-percussion) |
| University of Colorado Boulder College of Music | Oct 6, 2026, 9:30 PM EDT | [Faculty Tuesdays: Tour de France](https://cupresents.org/show-details/faculty-tuesdays-tour-de-france) |
| University of Colorado Boulder College of Music | Oct 12, 2026, 9:30 PM EDT | [CU Boulder Concert Band: Vox Populi](https://cupresents.org/show-details/cu-boulder-concert-band-fall-2026-concert) |
| Vanderbilt Blair School of Music | Oct 13, 2026, 8:30 PM EDT | [Living Sounds #1](https://events.vanderbilt.edu/blair/event/100949-living-sounds-1) |
| University of Colorado Boulder College of Music | Oct 13, 2026, 9:30 PM EDT | [Faculty Tuesdays: A Trio of Trios](https://cupresents.org/show-details/faculty-tuesdays-a-trio-of-trios) |
| University of Colorado Boulder College of Music | Oct 14, 2026, 9:30 PM EDT | [CU Boulder SoundWorks: Second Fall 2026 Concert](https://cupresents.org/show-details/cu-boulder-soundworks-second-fall-2026-concert) |
| Vanderbilt Blair School of Music | Oct 15, 2026, 7:30 PM EDT | [Student Recital: Elise Hwang, violin](https://events.vanderbilt.edu/blair/event/101883-student-recital-elise-hwang-violin) |
| Vanderbilt Blair School of Music | Oct 15, 2026, 8:30 PM EDT | [Student Recital: Pierce Ruch, percussion](https://events.vanderbilt.edu/blair/event/100950-student-recital-pierce-ruch-percussion) |
| Vanderbilt Blair School of Music | Oct 16, 2026, 7:30 PM EDT | [Student Recital: Katie Hwang, viola](https://events.vanderbilt.edu/blair/event/101862-student-recital-katie-hwang-viola) |
| Vanderbilt Blair School of Music | Oct 16, 2026, 8:30 PM EDT | [Student Recital: Muriel Wallach, tuba](https://events.vanderbilt.edu/blair/event/100951-student-recital-muriel-wallach-tuba) |
| Anton Bruckner Privatuniversität | Oct 19, 2026, 2:00 PM EDT | [Künstlerische Schlussperformance Kontrabass — Silvia Roca Gómez (KMA) — Klasse Anton Schachenhofer](https://www.bruckneruni.ac.at/de/besuchen/events/detail/kuenstlerische-schlussperformance-kontrabass-silvia-roca-g-mez-kma-klasse-anton-schachenhofer-h-0-002-reinhart-von-gutzeit-saal-alice-harnoncourt-platz-1-4040-linz-19-10-2026-19-10-2026-10234) |
| University of Colorado Boulder College of Music | Oct 20, 2026, 9:30 PM EDT | [Faculty Tuesdays: A Wondering Guitar](https://cupresents.org/show-details/faculty-tuesdays-a-wondering-guitar) |
| University of Colorado Boulder College of Music | Oct 22, 2026, 9:30 PM EDT | [CU Boulder Chamber Orchestra: Made in America](https://cupresents.org/show-details/cu-boulder-chamber-orchestra-fall-2026-concert) |
| University of Colorado Boulder College of Music | Oct 27, 2026, 9:30 PM EDT | [Faculty Tuesdays: The Art of Collaboration](https://cupresents.org/show-details/faculty-tuesdays-the-art-of-collaboration) |
| Vanderbilt Blair School of Music | Nov 3, 2026, 8:30 PM EST | [Student Recital: Claire Lee, violin](https://events.vanderbilt.edu/blair/event/101863-student-recital-claire-lee-violin) |
| Universität der Künste Berlin — Faculty of Music | Nov 4, 2026, 1:30 PM EST | [Corporate Concert](https://www.udk-berlin.de/veranstaltung/corporate-concert-3/) |
| University of Colorado Boulder College of Music | Nov 4, 2026, 9:30 PM EST | [Early Music Ensemble: Fall 2026 Concert](https://cupresents.org/show-details/early-music-ensemble-fall-2026-concert) |
| Anton Bruckner Privatuniversität | Nov 6, 2026, 10:00 AM EST | [Künstlerische Schlussperformance Klavier — Valentina Schachner-Nedherer (KMA) — Klasse Till Alexander Körber](https://www.bruckneruni.ac.at/de/besuchen/events/detail/kuenstlerische-schlussperformance-klavier-valentina-schachner-nedherer-kma-klasse-till-alexander-koerber-h-0-001-gro-er-saal-alice-harnoncourt-platz-1-4040-linz-06-11-2026-06-11-2026-10237) |
| Anton Bruckner Privatuniversität | Nov 6, 2026, 12:00 PM EST | [Künstlerische Schlussperformance Klavier — Pierre Girard (KMA) — Klasse Oleg Marshev](https://www.bruckneruni.ac.at/de/besuchen/events/detail/kuenstlerische-schlussperformance-klavier-pierre-girard-kma-klasse-oleg-marshev-h-0-001-gro-er-saal-alice-harnoncourt-platz-1-4040-linz-06-11-2026-06-11-2026-10238) |
| Vanderbilt Blair School of Music | Nov 7, 2026, 8:30 PM EST | [Student Recital: Marcello Tortoreo, saxophone](https://events.vanderbilt.edu/blair/event/101864-student-recital-marcello-tortoreo-saxophone) |
| Vanderbilt Blair School of Music | Nov 8, 2026, 1:30 PM EST | [Student Recital: Ilan Tallman, bassoon](https://events.vanderbilt.edu/blair/event/100997-student-recital-ilan-tallman-bassoon) |
| Vanderbilt Blair School of Music | Nov 8, 2026, 3:30 PM EST | [Student Recital: Faith Lee, piano](https://events.vanderbilt.edu/blair/event/101865-student-recital-faith-lee-piano) |
| University of Colorado Boulder College of Music | Nov 8, 2026, 4:00 PM EST | [Chamber Music Showcase Fall 2026: Part I](https://cupresents.org/show-details/chamber-music-showcase-fall-2026-part-i) |

### Validation completed locally

- **65 tests passed, zero failures** under Node 24. The GitHub workflow also runs the suite under Node 22. Tests cover all original sources plus the seven new sources, DST transitions, invalid/ambiguous dates, Unicode, calendar UID stability and UTF-8 folding, cancellations, positive broadcast evidence, paid/private exclusions, pagination limits, same-day duplicates and failure retention.
- All seven new collectors ran against their real official feeds. Colorado's final live run returned ten streams after adding tests for verified legacy redirects and duplicate date offers lacking a URL.
- All **38 unique new event and viewing URLs returned HTTP 200**, with expected institutional page titles. This verifies reachable destinations, not future video playback.
- Browser checks confirmed the new school dropdown entries, Colorado's ten results and Mountain/Eastern times, and Bruckner's three results with Eastern times of Oct. 19 at 2 p.m. and Nov. 6 at 10 a.m. and noon. The shared calendar generator passes the UTC/Unicode tests; the in-app browser did not emit an observable download event during the button check, so an end-to-end downloaded file was not independently verified there.
- Browser checks reached Blair's public hall players, Iowa's public player page, Bruckner's two off-air players, and UdK's official room page with its YouTube link. Colorado's page clearly separates free hall streams from paid Takács material; its embedded Vimeo frames displayed an anti-bot verification prompt in this browser. No login, purchase, challenge bypass or video download was performed.
- All **18 previous automatic sources were successfully rechecked**. Ohio University and Oberlin initially returned HTTP 403 on this machine. After the user reported having used a VPN earlier and requested a retry, a single fresh attempt succeeded at 10:23 UTC: Ohio returned 15 streams and Oberlin five. These healthy results replace the earlier stale records. The changed outcome does not establish the VPN as the cause. Juilliard, Peabody and Michigan remain manually reviewed, with their real review dates unchanged.

### Reliability and coverage limits

- No source is inferred from a venue's streaming equipment. Only explicit event-level evidence is admitted.
- Yale exposes only the next main broadcast; its ticket pages can present access challenges, in which case the source fails visibly and keeps only time-limited previously verified records. There are no retries that bypass challenges. Iowa exposes only a rolling five-event list; cancellations are checked both on that list and the detail page. Blair supplies a longer feed in a single request; reaching the 500-record bound raises a visible error rather than silently truncating.
- Colorado currently returns a complete date-filtered result page; up to six pages and 65 details are supported. Two legacy stream URLs normalize to the verified current free-player portal. Printed dates/times must agree with full calendar metadata.
- UdK searches two official broadcast terms across bounded pages; it is selective coverage and can miss announcements phrased differently. Bruckner's filtered list is currently unpaginated; newly introduced pagination raises an explicit error. Reina Sofía follows up to six agenda pages and excludes generic social links and radio-only coverage.
- New host requests are spaced at least one second apart. HTTP 403/429 are not retried or bypassed; source failures remain visible. Shared channels/venue players are labeled, and future playback is not guaranteed by a successful page check.
- Enrollment is music-school-specific: Iowa 450 ([school homepage](https://music.uiowa.edu/)), Blair about 245 ([school profile](https://blair.vanderbilt.edu/about/)), and Reina Sofía more than 150 (linked admissions source above). Colorado, UdK and Bruckner show Not listed.
- Deferred means insufficient evidence or disproportionate integration work in this round, not a permanent rejection. Arizona is the strongest next engineering candidate; several European schools become straightforward candidates when explicit future broadcast announcements return.


## Candidate reassessment after the requested connection retry

Before implementing the additional Yale adapter, the previously blocked ticket/detail page was retried successfully. It now explicitly confirms that the Sept. 27 Sérgio Assad guitar celebration can be watched at music.yale.edu/live with no purchase or registration. Decision revised: implement Yale’s next-main-broadcast API plus event-detail validation, disclosing its one-event lookahead; exclude separate student-room feeds whose access has not been verified.

Kansas’s API also became readable. Using Localist’s documented group_id=31892150751261 filter returned all 60 School of Music events in the next 45 days on one page; none contains an explicit livestream announcement or stream URL. Kansas therefore remains deferred for lack of broadcast evidence, not because API access is currently blocked.
