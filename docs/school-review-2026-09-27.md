# Reader-suggested school review — September 27, 2026

The internal, dated research register below covers 50 suggested institutions plus NEC, with sources and qualified findings. It distinguishes 12 included schools from 1 event-specific access case (NEC), 1 confirmed lead awaiting integration (Columbia), 2 incomplete checks (McGill and ZHdK), and 35 searches/reviews without a verified upcoming eligible stream. Earlier detailed checks are in `coverage-assessment-2026-09-26.md` and `international-expansion-2026-09-27.md`. These findings are not permanent exclusions.

## New maintained sources

- Toronto: 4 upcoming public YouTube streams; 30 requests and approximately 31 seconds in the live pre-publication check. The calendar includes both free and paid performances. Only free public music categories are fetched, and every admitted detail must explicitly offer the Faculty YouTube livestream. The parser excludes related-event/sidebar evidence and uses each detail's full year rather than guessing from calendar month/day tiles.
- Stanford: 1 upcoming stream; 14 requests and approximately 14 seconds. The November 7 Philharmonia event expressly links the public `philharmonia_live` page, whose Fall 2026 program matches. Its Vimeo event was opened in a browser and displayed a public inactive player without a password or purchase requirement. The reused Vimeo page displayed an older May date, so the official dated concert is the scheduling authority and the maintained school page is the viewing destination. No Vimeo metadata is used to date future concerts.

The adapters share the existing HTTP allowlist, one-second pacing, 600-request refresh cap, source health reporting, normalization and 14-day failure retention. No new package or paid service is needed. The two new sources add 44 measured requests; monitor actual total usage in the production run rather than assuming every refresh is identical.

## Further sources

- NEC: selected Jordan Hall performances are password-free under the official streaming policy. September 28 Borromeo Quartet and September 30 Philharmonia pages explicitly require a community password. These specific performances are omitted; NEC as an institution is not permanently excluded.
- Columbia: its Fall 2026 Sacred Music schedule states free concerts with public YouTube streaming and identifies the in-person-only exception. Web search exposed the page, but direct automated retrieval returned a browser challenge. A maintained collection path remains to be implemented; do not present this as a lack of public streams.
- McGill: direct calendar retrieval returned HTTP 403. ZHdK: livestream page exists but the text-accessible preview was undated. Both require further verification.

## Bachtrack referral

The homepage and methodology page link to `https://bachtrack.com/search-events/livestream=1` for professional orchestras and opera. The public listings include “Free to view,” “Pay to view,” and “Requires subscription.” The copy distinguishes free browsing from free viewing. This is an ordinary external link, with no crawler, embed, dependency, or new scheduled requests.

## Validation

Parser checks cover summer/winter time conversion, public versus paid/private or canceled events, pagination, deduplication, horizon limits, program mismatch and shared source-failure retention. Static page review checks all 51 institutions appear once and section links resolve. Publication is verified separately through the production workflow and live site.

## Detailed research register

Snapshot of official sources reviewed September 25–27, 2026. Not a ranking or permanent exclusion list. This register is internal project documentation; the public methodology stays at the general level.

### Already included: 12 schools from the suggested list

- **Royal College of Music, London · United Kingdom** — Listed as Royal College of Music, London. [RCM Live](https://www.rcm.ac.uk/events/live/).
- **The Juilliard School · United States** — Included through individually reviewed broadcast listings; some require a free account. [Performance calendar](https://www.juilliard.edu/stage-beyond/performance/calendar).
- **Curtis Institute of Music · United States** — Included when the official calendar identifies the concert as both free and broadcast. [Watch & listen](https://www.curtis.edu/curtis-performances/watch-listen/).
- **Moscow State Tchaikovsky Conservatory · Russia** — Listed as Moscow Conservatory. Only specifically announced broadcasts are included; the TV player alone doesn't imply a scheduled concert. [Conservatory TV](https://www.mosconsv.tv/stream).
- **University of Rochester · United States** — Listed as Eastman School of Music. [Eastman livestreams](https://www.esm.rochester.edu/live/).
- **Yale University · United States** — Listed as Yale School of Music; coverage follows the next announced main broadcast. [Yale live](https://music.yale.edu/live).
- **Indiana University Bloomington · United States** — Listed as Indiana University Jacobs School of Music. [LIVE@jacobs](https://liveatjacobs.music.indiana.edu/).
- **Northwestern University · United States** — Listed as Northwestern Bienen School of Music. [Bienen live](https://www.music.northwestern.edu/live).
- **University of Michigan–Ann Arbor · United States** — Included through individually reviewed School of Music, Theatre & Dance broadcasts. [SMTD events](https://smtd.umich.edu/events/).
- **Universität der Künste Berlin · Germany** — Listed as UdK Berlin; musical events need an explicit livestream link. [UdK calendar](https://www.udk-berlin.de/kalender/).
- **University of Toronto · Canada** — Listed as University of Toronto Faculty of Music. Free public music events need an explicit YouTube livestream announcement. Other Toronto broadcasts can be paid, so each event gets its own check. [Example: October 8, 2026 recital](https://music.utoronto.ca/event/261008-thursdays-noon).
- **Stanford University · United States** — Listed as Stanford University Department of Music. We match a dated concert with its linked public broadcast page and program. Physical tickets may be paid while the online player is public. [Example: November 7, 2026 Philharmonia](https://music.stanford.edu/events/stanford-philharmonia-5).

### Confirmed lead awaiting calendar integration: Columbia

- **Columbia University · United States** — The [Fall 2026 Sacred Music series](https://religiouslife.columbia.edu/sacred-music) advertises free concerts streamed on YouTube, with an explicit in-person-only exception. Registration described there is for campus entry. The page is readable through web search, but direct automated access was blocked during this review.

### Checks still incomplete: 2 schools

- **McGill University · Canada** — The [Schulich calendar](https://www.mcgill.ca/music/events/calendar) offers webcast listings, but direct retrieval was blocked during this review. A current event-level check is still needed. This is an access limitation in our research, not evidence that public streams are unavailable.
- **Zurich University of the Arts · Switzerland** — A dedicated [music livestream page](https://www.zhdk.ch/en/degree-programmes/music/livestreams-music-8343) exists. Its preview section did not expose dated upcoming performances in the page text available to us. The schedule still needs verification.

### No eligible upcoming stream confirmed in this review: 35 schools

- **Conservatoire national supérieur de musique et de danse de Paris · France** — The current season and an upcoming concert were checked; no broadcast was confirmed for that performance. [Official season](https://www.conservatoiredeparis.fr/fr/la-saison).
- **Royal Academy of Music · United Kingdom** — No upcoming eligible stream was verified from the calendar and official search results reviewed. Historical streaming projects don't establish a current schedule. [What's on](https://www.ram.ac.uk/whats-on).
- **mdw — University of Music and Performing Arts Vienna · Austria** — The official mdwStream calendar filter returned no events when checked on September 26, although the general calendar had future concerts. [mdwStream calendar](https://www.mdw.ac.at/veranstaltung/?1&f=vermdwStream).
- **Royal Conservatoire of Scotland · United Kingdom** — The school describes streaming facilities, but official searches did not establish a dated upcoming public concert stream. Equipment availability alone isn't a broadcast announcement. [Recording and streaming facilities](https://www.rcs.ac.uk/study/why-rcs/campus-facilities/recording-studios/).
- **Guildhall School of Music & Drama · United Kingdom** — No upcoming public music broadcast was verified in the events reviewed. Internal streaming and graduation coverage don't establish eligible concerts. [What's on](https://www.gsmd.ac.uk/whats-on).
- **Norwegian Academy of Music · Norway** — An upcoming streamed doctoral lecture was found, but no eligible concert broadcast was confirmed. [October 12 lecture](https://ansatt.nmh.no/en/events/proveforelesning-rut-jorunn-ronning); [events calendar](https://student.nmh.no/en/events).
- **New York University · United States** — Official searches surfaced dance broadcasts and talks, but did not verify an upcoming classical concert stream. Broader review of the university's music events remains possible. [Tisch Dance Live](https://tisch.nyu.edu/dance/live).
- **University Mozarteum Salzburg · Austria** — Upcoming event pages reviewed did not confirm a public stream; the competition broadcasts found were past events. [Events](https://www.moz.ac.at/de/veranstaltungen).
- **Hong Kong Academy for Performing Arts · Hong Kong** — Current music listings and ticket information did not establish a dated upcoming public stream in this review. [School of Music](https://www.hkapa.edu/music).
- **Royal Danish Academy of Music · Denmark** — A past debut concert explicitly offered streaming; the upcoming recital and debut pages sampled did not. Streaming needs confirmation for each concert. [Calendar](https://www.dkdm.dk/da/kalender).
- **Royal College of Music, Stockholm (KMH) · Sweden** — Official searches found past Classicalive broadcasts, but no upcoming public stream was verified. This is a separate institution from RCM London, which is included. [Concerts & events](https://www.kmh.se/in-english/concerts--events.html).
- **St Petersburg Conservatory · Russia** — Current concert announcements were found, including an October 1 partner-venue concert, but public broadcast access was not verified. [Music Day concert announcement](https://www.conservatory.ru/x-letka/news/mezhdunarodnyy-den-muzyki-obshchedostupnyy-koncert-marafon).
- **Trinity Laban Conservatoire of Music and Dance · United Kingdom** — An active music calendar was found; official search results did not establish an eligible upcoming broadcast. [Music performances](https://www.trinitylaban.ac.uk/whats-on-performance/?artform=music).
- **Conservatoire national supérieur de musique et de danse de Lyon · France** — Upcoming October concerts were advertised with physical venues; a public livestream was not verified in the material reviewed. [Official site and events](https://cnsmd-lyon.fr/).
- **Royal Holloway, University of London · United Kingdom** — The [June 2026 Midweek Music listing](https://www.royalholloway.ac.uk/about-us/events/play-2026-midweek-music/) explicitly offered online listening. A new autumn broadcast date was not verified; previous term dates aren't carried forward.
- **UCSI University · Malaysia** — The Institute of Music presents public concerts, but searches did not confirm an upcoming public concert stream. Graduation webcasts aren't included. [Institute of Music](https://www.ucsiuniversity.edu.my/about-us/institute-of-music).
- **University of Oxford · United Kingdom** — Upcoming music events were found, but no eligible broadcast was confirmed in this review. College-specific sources may need separate checks. [Music events](https://www.music.ox.ac.uk/upcoming-events).
- **University of Cambridge · United Kingdom** — No dated upcoming concert stream was verified in the faculty and college sources searched. Individual college schedules aren't comprehensively covered by this review. [Faculty events](https://www.mus.cam.ac.uk/events); [Clare Hall music](https://www.clarehall.cam.ac.uk/music/).
- **Harvard University · United States** — Official searches found livestreamed Music 189 performances in May 2026, but no eligible upcoming stream was confirmed. [Past streamed performance](https://music.fas.harvard.edu/event/music-189-final-performance-1).
- **Sibelius Academy, University of the Arts Helsinki · Finland** — The September 25 review of upcoming concert pages did not find explicit broadcast confirmation. This finding is limited to the events reviewed. [Uniarts calendar](https://www.uniarts.fi/tapahtumakalenteri/).
- **Hochschule für Musik und Theater Felix Mendelssohn Bartholdy Leipzig · Germany** — Upcoming concerts were found; official searches did not confirm an eligible public stream. [Events](https://www.hmt-leipzig.de/veranstaltungen).
- **University of Huddersfield · United Kingdom** — Concert and research-event pages were found, but no eligible upcoming broadcast was verified. A performance described as “live” doesn't necessarily mean online. [Performances](https://www.hud.ac.uk/performance/).
- **Hochschule für Musik Hanns Eisler Berlin · Germany** — A video platform exists, but the upcoming recital checked did not announce a stream. [Calendar](https://www.hfm-berlin.de/veranstaltungen/veranstaltungskalender/); [Video platform](https://tube.hfm-berlin.de/).
- **Royal Northern College of Music · United Kingdom** — The watch/listen page and upcoming events sampled did not establish a current broadcast schedule. [Watch & listen](https://www.rncm.ac.uk/watch-listen/); [events](https://www.rncm.ac.uk/whats-on/events/).
- **University of Southern California · United States** — Official searches found Thornton LIVE's historical virtual season, but did not verify an upcoming 2026 public stream. [Thornton LIVE announcement](https://music.usc.edu/spotlights/thornton-live-a-virtual-stage/).
- **Royal Central School of Speech and Drama · United Kingdom** — This institution is in London, rather than China. Its theatre focus doesn't by itself establish a classical concert source; no eligible stream was verified in this review. [Official site](https://www.cssd.ac.uk/).
- **Haute école de musique de Genève · Switzerland** — Current events were found, but no upcoming public concert broadcast was verified. Historical livestream references weren't treated as current dates. [Official site and events](https://hem.hesge.ch/).
- **University of California, Los Angeles · United States** — The September 26 calendar review found no explicit livestream on the 25 events returned. General hall-player pages alone don't confirm that every event will be broadcast. [School of Music streams](https://schoolofmusic.ucla.edu/school-of-music-live-streams/).
- **Central Academy of Drama · China** — Official searches did not verify an upcoming public classical concert stream. This is distinct from London's Royal Central School and from China's music conservatories. [Official site](https://chntheatre.edu.cn/).
- **Korea National University of Arts · South Korea** — Official reports describe earlier streamed festivals, but no eligible upcoming stream was verified in this review. [Festival broadcast report](https://karts.ac.kr/en/news/newsRoom_view.do?BB_SEQ=644).
- **King's College London · United Kingdom** — Searches found an opening-of-year ceremony and academic talks, but no upcoming eligible concert broadcast. [Ceremony listing](https://www.kcl.ac.uk/events/opening-of-year-ceremony).
- **Goldsmiths, University of London · United Kingdom** — The April 2026 Hyperchromatic Music Festival had an explicit concert livestream. An upcoming eligible broadcast was not confirmed. [Past festival listing](https://www.gold.ac.uk/calendar/?id=15912).
- **Russian Institute of Theatre Arts (GITIS) · Russia** — Official searches found streamed admissions sessions and a recent concert announcement, but no upcoming eligible concert broadcast. [Online open-day announcement](https://gitis.net/press/news/fakultet-muzykalnogo-teatra-gitisa-priglashaet-na-den-otkrytykh-dverey-onlayn-2026/).
- **Hochschule für Musik und Theater München · Germany** — Past competition broadcasts were found; a current public concert stream was not verified in the schedule reviewed. [Events](https://hmtm.de/veranstaltungen/).
- **National University of Singapore · Singapore** — Yong Siew Toh Conservatory has a history of online performances, but no dated upcoming public stream was verified in the sources reviewed. [YST Conservatory](https://www.ystmusic.nus.edu.sg/).
