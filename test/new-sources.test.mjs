import test from 'node:test';
import assert from 'node:assert/strict';
import {adapters,parseNorthwestern,parseRice,parseSfcm,normalize,sources,collect} from '../scripts/ingest.mjs';
import {calendar,matches} from '../dist/core.js';
const now=new Date('2026-09-25T12:00:00Z');
const northCard=(title,date,href='https://www.music.northwestern.edu/live/galvin')=>`<div class="event-slide"><p class="date">${date}</p><a class="event-title" href="/events/${title}">${title}</a><div class="event-btns"><a href="${href}">Watch Live</a></div></div>`;
const north=cards=>`<div id="upcoming-events-slider">${cards}</div>`;
const riceHtml=(date='Sep 28, 2026',title='Trombone students',stream='/live-streaming-duncan-recital-hall')=>`<div id="block-views-block-event-info-date"><div class="event-type">Class Recital</div><h1>${title}</h1></div><div class="event-sidebar"><h3 class="event-date"><time datetime="2026-09-28T19:30:00+00:00">Mon, ${date}</time></h3><div class="event-time">7:30pm</div><div class="livestream-info"><a class="stream-link" href="${stream}">View Livestream</a><div class="stream-time">7:30pm CT</div></div></div>`;
const sfcmHtml=(title='SFCM Orchestra',stream='https://vimeo.com/event/123')=>`<article class="event"><h1>${title}</h1><div class="entity-categories">Orchestra</div><div class="event__info"><time datetime="2026-09-27T02:30:00">Saturday, September 26 2026, 7:30 PM</time></div><a class="event-cta-live-stream" href="${stream}">Livestream</a><div class="add-cal-event"><li data-addtocal-type="google"><a href="https://calendar.google.com/calendar/render?dates=20260926T193000/20260926T213000&amp;ctz=America/Los_Angeles">Google</a></li></div></article>`;

test('Northwestern requires explicit streams, skips cancellations, and honors Central DST',()=>{
 const entries=parseNorthwestern(north(northCard('Orchestra','October 31, 2026 7:30pm CDT')+northCard('Percussion','November 6, 2026 7:30pm CST')+northCard('CANCELLED Recital','October 23, 2026 7:30pm CDT')+northCard('No stream','October 23, 2026 7:30pm CDT','#')));
 assert.deepEqual(entries.map(e=>e.start),['2026-11-01T00:30:00.000Z','2026-11-07T01:30:00.000Z']);
 assert.equal(parseNorthwestern(north('<p>No upcoming performances</p>')).length,0);
 assert.throws(()=>parseNorthwestern('<p>Website unavailable</p>'));
 assert.throws(()=>parseNorthwestern(north(northCard('Recital','October 23 7:30pm CDT'))));
});

test('Rice uses the visible Central date, not misleading UTC attributes or sidebar dates',()=>{
 const url='https://music.rice.edu/events/recital',event=parseRice(riceHtml()+'<time datetime="2027-01-01T00:00:00Z"></time>',url);
 assert.equal(event.start,'2026-09-29T00:30:00.000Z');assert.equal(event.stream_url,'https://music.rice.edu/live-streaming-duncan-recital-hall');
 assert.equal(event.type,'Recital');
 assert.equal(parseRice(riceHtml('Nov 6, 2026'),url).start,'2026-11-07T01:30:00.000Z');
 assert.equal(parseRice(riceHtml(undefined,'Cancelled Recital'),url),null);
 assert.equal(parseRice(riceHtml(undefined,undefined,''),url),null);
 assert.throws(()=>parseRice(riceHtml().replace('7:30pm CT','7:30pm'),url));
 assert.throws(()=>parseRice(riceHtml('Sep 31, 2026'),url));
});

test('Rice follows the list pager, ignores unmarked streams, and excludes beyond the horizon',async()=>{
 const card=(name,stream=true)=>`<a class="event-wrapper-link" href="/events/${name}"><h3 class="event-title">${name}</h3>${stream?'<div class="stream-icon">Livestream Available</div>':''}</a>`;
 const page=(cards,next)=>`<div class="view-calendar-example view-display-id-listing">${cards}${next?'<a rel="next" href="?page=1">Load More</a>':''}</div><a rel="next" href="/calendar/day/202610">Next month</a>`;
 const responses=new Map([
  ['https://music.rice.edu/events',page(card('first')+card('unmarked',false)+card('festival').replace('/events/festival','/content/festival'),true)],
  ['https://music.rice.edu/events?page=1',page(card('winter'),false)],
  ['https://music.rice.edu/events/first',riceHtml()],['https://music.rice.edu/events/winter',riceHtml('Dec 1, 2026')]
 ]);
 const result=await collect(undefined,now,sources.filter(s=>s.id==='rice'),async url=>{assert.ok(responses.has(url),url);return responses.get(url);});
 assert.equal(result.sources[0].status,'ok');assert.equal(result.events.length,1);assert.match(result.events[0].event_url,/first$/);
});

test('SFCM verifies displayed Pacific dates against calendar metadata and requires public stream buttons',()=>{
 const url='https://www.sfcm.edu/experience/performances/orchestra/20260926',event=parseSfcm(sfcmHtml(),url);
 assert.equal(event.start,'2026-09-27T02:30:00.000Z');assert.equal(event.end,'2026-09-27T04:30:00.000Z');
 assert.equal(parseSfcm(sfcmHtml('Cancelled Orchestra'),url),null);
 assert.equal(parseSfcm(sfcmHtml(undefined,''),url),null);
 assert.equal(parseSfcm(sfcmHtml(undefined,'https://www.sfjazz.org/tickets/concert'),url),null);
 assert.throws(()=>parseSfcm(sfcmHtml().replace('20260926T193000','20260926T183000'),url));
 assert.throws(()=>parseSfcm(sfcmHtml().replace('America/Los_Angeles','America/New_York'),url));
});

test('SFCM scans all months in the window and deduplicates public event links',async()=>{
 const calls=[],url='https://www.sfcm.edu/experience/performances/orchestra/20260926';
 const get=async target=>{calls.push(target);return target===url?sfcmHtml():`<div class="view-sfcm-calendar"><div class="performance-row"><div class="compact-listing__date-date">26</div><div class="compact-listing__date-month">Sep</div><div class="performance-title"><a href="${url}">Orchestra</a></div></div></div>`;};
 assert.equal((await adapters.sfcm(get,now)).length,1);
 assert.equal(calls.filter(x=>x===url).length,1);
 assert.deepEqual(calls.filter(x=>x.includes('?')).map(x=>new URL(x).searchParams.get('calendar_event_month')),['09','10','11']);
});

test('new school events work in local filters and produce the correct calendar instants',()=>{
 const examples=[['northwestern',parseNorthwestern(north(northCard('Orchestra','October 31, 2026 7:30pm CDT')))[0],'20261101T003000Z'],['rice',parseRice(riceHtml(),'https://music.rice.edu/events/recital'),'20260929T003000Z'],['sfcm',parseSfcm(sfcmHtml(),'https://www.sfcm.edu/experience/performances/orchestra/20260926'),'20260927T023000Z']];
 for(const [id,raw,stamp] of examples){
  const event=normalize(raw,sources.find(s=>s.id===id),now);
  assert.ok(matches(event,{source:id,timeZone:'America/New_York'},now));assert.ok(!matches(event,{source:'curtis',timeZone:'America/New_York'},now));
  const ics=calendar([event],now);assert.ok(ics.includes('DTSTART:'+stamp));assert.ok(ics.includes(event.stream_url));
 }
});
