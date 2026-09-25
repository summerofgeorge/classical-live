import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLawrence,parseBoston,parseOberlin,adapters,collect,sources} from '../scripts/ingest.mjs';
const now=new Date('2026-09-25T12:00:00Z');
const lawrence=body=>`<a href="https://vimeo.com/lawrenceuni">Watch a live webcast at a time listed below!</a><h2>Fall Term 2026 Events</h2><p>${body}</p>`;
const recital=(date,title)=>`<strong>${date}</strong><br>${title}`;
test('Lawrence term year, Central DST, cancellations and separate same-day concerts',()=>{
 const html=lawrence('**CANCELLED<br><s>'+recital('Monday, September 21, 8:00 p.m. CDT','Canceled')+'</s><br><br>'+recital('Saturday, October 10, 11:00 a.m. CDT','Faculty Recital')+'<br><br>'+recital('Saturday, October 10, 7:30 p.m. CDT','Orchestra')+'<br><br>'+recital('Sunday, November 8, 3:00 p.m. CST','Percussion'));
 const events=parseLawrence(html);assert.equal(events.length,3);assert.equal(new Set(events.map(e=>e.id)).size,3);
 assert.deepEqual(events.map(e=>e.start),['2026-10-10T16:00:00.000Z','2026-10-11T00:30:00.000Z','2026-11-08T21:00:00.000Z']);
 assert.equal(events[0].watch_kind,'channel');
 assert.throws(()=>parseLawrence(html.replace('Term 2026','Term 2027')),/weekday/);
 assert.throws(()=>parseLawrence('<p>Unavailable</p>'),/schedule/);
 assert.equal(parseLawrence(lawrence(recital('Saturday, October 10, 7:30 p.m. CDT','CANCELED Orchestra'))).length,0);
});
const bostonUrl='https://bostonconservatory.berklee.edu/events/piano';
const bostonStream='https://bostonconservatory.berklee.edu/seully-hall';
const bostonRecord={ '@type':'Event',url:bostonUrl,name:'Piano recital',description:'Mozart and Beethoven',startDate:'2026-09-29T20:00:00-04:00',endDate:'2026-09-29',eventStatus:'EventScheduled',isAccessibleForFree:true,location:[{'@type':'VirtualLocation',url:bostonStream}]};
const bostonHtml=(record=bostonRecord,extra='')=>`<script type="application/ld+json">${JSON.stringify([record])}</script><article class="node--type-event"><h1>Piano recital</h1><div class="field--name-field-event-instance-date"><time datetime="${record.startDate}"></time></div><ul id="linkicon-node-event-field-event-live-stream-link-123"><li><a href="${bostonStream}">Watch</a></li></ul><div class="field--name-field-event-types"><div class="field__item">Music</div></div><div class="field--name-body">${extra}</div></article>`;
test('Boston requires free music, matching Watch/virtual metadata, a single performance and correct Eastern offset',()=>{
 const event=parseBoston(bostonHtml(),bostonUrl);assert.equal(event.start,'2026-09-30T00:00:00.000Z');assert.equal(event.end,null);
 assert.equal(parseBoston(bostonHtml({...bostonRecord,isAccessibleForFree:false}),bostonUrl),null);
 assert.equal(parseBoston(bostonHtml({...bostonRecord,location:[]}),bostonUrl),null);
 assert.equal(parseBoston(bostonHtml({...bostonRecord,eventStatus:'https://schema.org/EventCancelled'}),bostonUrl),null);
 assert.equal(parseBoston(bostonHtml().replace('>Music<','>Dance<'),bostonUrl),null);
 assert.equal(parseBoston(bostonHtml(bostonRecord,'This concert will not be livestreamed.'),bostonUrl),null);
 assert.equal(parseBoston(bostonHtml().replace('</article>','<div class="field--name-field-event-instance-date"><time datetime="2026-09-30T20:00:00-04:00"></time></div></article>'),bostonUrl),null);
 assert.throws(()=>parseBoston(bostonHtml({...bostonRecord,startDate:'2026-09-29T20:00:00-05:00'}),bostonUrl),/offset/);
 assert.throws(()=>parseBoston(bostonHtml().replace('<time datetime="2026-09-29T20:00:00-04:00"','<time datetime="2026-09-28T20:00:00-04:00"'),bostonUrl),/disagrees/);
});
const bostonCard=(url,date)=>`<div class="views-row"><div class="event teaser"><div class="title"><a href="${url}">Recital</a></div><div class="field--name-field-event-instance-date"><time datetime="${date}"></time></div></div></div>`;
const bostonPage=(cards,next)=>`<div class="view-events view-display-id-page">${cards}${next?'<a rel="next" href="?page=1">Load More</a>':''}</div>`;
test('Boston paginates but does not fetch events outside the look-ahead window',async()=>{
 const requests=[],responses=new Map([
  ['https://bostonconservatory.berklee.edu/events',bostonPage(bostonCard(bostonUrl,bostonRecord.startDate),true)],
  [bostonUrl,bostonHtml()],
  ['https://bostonconservatory.berklee.edu/events?page=1',bostonPage(bostonCard('/events/later','2026-12-01T20:00:00-05:00'),true)]
 ]);
 const result=await collect(undefined,now,sources.filter(s=>s.id==='boston'),async url=>{requests.push(url);assert.ok(responses.has(url),url);return responses.get(url);});
 assert.equal(result.sources[0].status,'ok');assert.equal(result.events.length,1);assert.equal(requests.length,3);
});
const oberlinUrl='https://calendar.oberlin.edu/event/recital';
const oberlinRecord={'@type':'Event',url:oberlinUrl,name:'Faculty Recital',startDate:'2026-09-27T19:30:00-04:00',endDate:'2026-09-27',eventStatus:'EventScheduled',description:'Watch the webcast. Program: Bach'};
const schema=records=>`<script type="application/ld+json">${JSON.stringify(records)}</script>`;
const oberlinHtml=(record=oberlinRecord,link='<a href="https://www.oberlin.edu/livestream/fairchild">Watch the webcast</a>')=>schema([record])+`<div class="em-about_description"><p>${link} – streamed live at concert time.</p></div>`;
test('Oberlin accepts only affirmative venue webcast links and ignores date-only end metadata',()=>{
 const event=parseOberlin(oberlinHtml(),oberlinUrl);assert.equal(event.start,'2026-09-27T23:30:00.000Z');assert.equal(event.end,null);assert.equal(event.program,'Bach');
 assert.equal(parseOberlin(oberlinHtml(oberlinRecord,''),oberlinUrl),null);
 assert.equal(parseOberlin(oberlinHtml({...oberlinRecord,eventStatus:'EventPostponed'}),oberlinUrl),null);
 assert.equal(parseOberlin(oberlinHtml().replace(' – streamed',' is not available – streamed'),oberlinUrl),null);
 assert.equal(parseOberlin(oberlinHtml().replace('www.oberlin.edu/livestream/','example.com/livestream/'),oberlinUrl),null);
 assert.throws(()=>parseOberlin(oberlinHtml().replace('2026-09-27T19:30:00-04:00','2026-09-27'),oberlinUrl),/offset/);
});
const oberlinPage=(records,next=false)=>schema(records)+`<ul class="em-search-pagination">${next?'<li><a href="?page=2"><span>Next page</span><i class="em-pagination-right-arrow"></i></a></li>':''}</ul>`;
test('Oberlin scans relevance-ordered search pages, excludes past events and deduplicates',async()=>{
 const index='https://calendar.oberlin.edu/search/events?event_types%5B%5D=19263%2C17936&search=webcast',requests=[];
 const responses=new Map([[index,oberlinPage([{...oberlinRecord,url:oberlinUrl+'/past',startDate:'2025-09-27T19:30:00-04:00'}],true)],['https://calendar.oberlin.edu/search/events?page=2',oberlinPage([oberlinRecord,oberlinRecord])],[oberlinUrl,oberlinHtml()]]);
 const events=await adapters.oberlin(async url=>{requests.push(url);assert.ok(responses.has(url),url);return responses.get(url);},now);
 assert.equal(events.length,1);assert.equal(requests.length,3);
});
test('new source failures remain visible rather than becoming apparently empty schedules',async()=>{
 const result=await collect(undefined,now,sources.filter(s=>['lawrence','boston','oberlin'].includes(s.id)),async()=>'<h1>Temporarily unavailable</h1>');
 assert.ok(result.sources.every(s=>s.status==='error'));
});
