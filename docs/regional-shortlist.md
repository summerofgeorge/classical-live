# Regional expansion shortlist (P2)

Goal: diversify beyond North America for **round-the-clock** coverage—Europe/Asia mornings in ET *and* strong US/Canada evenings—without lowering the free public stream evidence bar.

Collection is already split into `nam` / `europe` / `asia-pacific` jobs with separate request budgets. This note is the research mine for the next adapters (feed-first or ≤10 requests, fixtures required).

Source mine: [List of university and college schools of music](https://en.wikipedia.org/wiki/List_of_university_and_college_schools_of_music) (Wikipedia), plus official livestream/agenda pages probed 2026-09-29.

## Already scheduled (non-US emphasis)

| School | Region | Notes |
| --- | --- | --- |
| Music Academy in Liechtenstein (Kulmag) | Europe | **Enabled in P2** after live Gratis probe (~40 dated free streams). Afternoon CET ≈ morning ET. |
| UdK Berlin, Weimar, Bruckner, Reina Sofía, RCM London, Moscow | Europe | Existing adapters |
| Geidai (Tokyo), Melbourne Conservatorium, VCASS | Asia–Pacific | Existing adapters |
| UBC, Toronto, Western | nam (Canada) | Evening ET / late afternoon coverage |

## Priority follow-ups (Europe)

Affirmative **dated free livestream** evidence not yet solid enough for a ≤10-req adapter in this PR. Revisit with a livestream index or JSON feed before coding.

| School | Why interesting | Scout notes (2026-09-29) | Morning-ET fit |
| --- | --- | --- | --- |
| Universität Mozarteum Salzburg | Large free concert culture; site has a `livestream` search type + `/en/api/events/get-overview-items` | Livestream search returned study-concert listings without clear public stream URLs / Gratis broadcast markers on cards. Needs event-detail proof. | Afternoon CET → ~9am–noon ET |
| mdw Wien | Major EU conservatory | Events hub present; no obvious livestream filter on first probe | Afternoon CET |
| Royal Danish Academy of Music | Many free concerts | Calendar emphasizes free *admission*; livestream not affirmed on listing | Afternoon CET |
| Guildhall School (London) | Free lunchtime series | Broadcasts mentioned in copy; no dated public stream index found on first pass | Late morning–afternoon London → early ET |
| Sibelius Academy / Uniarts Helsinki | Strong Nordic broadcast culture | Concert listing OK; dedicated livestream URL 404 on probe | Eastern Europe afternoon |
| HfM Nürnberg / Detmold / München | DE peer set to Weimar/UdK | YouTube present; dated free stream index not confirmed | Afternoon CET |
| CNSMD Paris / Lyon | Flagship FR | Needs French agenda + explicit live/gratuit proof | Afternoon CET |
| Conservatorium van Amsterdam | NL flagship | Agenda returned HTTP 403 to collector UA | Afternoon CET |
| HMDK Stuttgart | Already in `schools.js` metadata only | No collector yet—candidate if livestream index appears | Afternoon CET |

## Priority follow-ups (Asia–Pacific)

Overnight / early-morning ET and late-evening local—useful for true 24h coverage, not mornings-only.

| School | Why interesting | Scout notes (2026-09-29) | ET window |
| --- | --- | --- | --- |
| Yong Siew Toh Conservatory (Singapore) | English-language APAC hub | Events URL timed out / unreachable on probe | Evening SGT → morning ET |
| HKAPA | Large public what’s-on | Page loads; livestream markers not affirmed | Evening HKT → morning ET |
| Shanghai / Central Conservatory | Wikipedia Asia mine | Need official free dated stream pages (language + evidence) | China evening → morning ET |
| Seoul National / other KR | Night concerts | `live.snu.ac.kr` unreachable on probe | Late KST → morning ET |
| Sydney Conservatorium / ANAM | Oceania peers to Melbourne | Not probed in depth this pass | AU evening → ET morning/afternoon |

## Quality gate (unchanged)

Do **not** schedule a school until:

1. Affirmative public stream evidence (not merely free campus admission or an undated player).
2. Dated occurrences inside the rolling horizon.
3. Feed-first or ≤10 HTTP requests per refresh, with fixtures for dates / cancellations / missing streams.
4. Host allowlist + timezone validation.

Cap guidance: add about **3–5** solid schools per PR once evidence clears—prefer Europe first for daytime ET watching while working, then Asia–Pacific for overnight continuity. Keep strong US/Canada sources; regional budgets exist so NAM does not need thinning.
