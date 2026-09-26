import test from 'node:test';
import assert from 'node:assert/strict';
import {calendar,foldLine,matches,safeUrl} from '../dist/core.js';
import {zonedTime,parseCim,parseEastman,parseColburn,parseMsm,curtisCandidates,normalize,collect,DAY} from '../scripts/ingest.mjs';
const now=new Date('2026-09-25T12:00:00Z');
const source={id:'test',name:'Test School',timezone:'America/New_York',url:'https://example.org/'};
const raw={id:'test-1',title:'Bach, Brahms; & friends',start:'2026-09-26T00:00:00Z',end:null,program:'First line\nSecond line',event_url:'https://example.org/event',stream_url:'https://example.org/watch'};
const event=normalize(raw,source,now);
test('source wall times honor summer, winter, and Pacific offsets',()=>{
 assert.equal(zonedTime('2026-09-26T19:30:00','America/New_York'),'2026-09-26T23:30:00.000Z');
 assert.equal(zonedTime('2026-11-06T19:30:00','America/New_York'),'2026-11-07T00:30:00.000Z');
 assert.equal(zonedTime('2026-09-26T17:00:00','America/Los_Angeles'),'2026-09-27T00:00:00.000Z');
});
test('reject ambiguous, nonexistent, and malformed source dates',()=>{
 for(const value of ['2026-11-01T01:30:00','2026-03-08T02:30:00','2026-02-31T19:00:00','tomorrow'])assert.throws(()=>zonedTime(value,'America/New_York'));
});
test('Tonight uses the viewer date, including an event across UTC midnight',()=>{
 assert.ok(matches(event,{period:'tonight',timeZone:'America/New_York'},now));
 assert.ok(!matches(event,{period:'tonight',timeZone:'Europe/London'},now));
 assert.ok(!matches(event,{source:'curtis',timeZone:'UTC'},now));
});
test('week and weekend filters use local calendar dates and exclude previous-day concerts',()=>{
 assert.ok(matches(event,{period:'weekend',timeZone:'America/New_York'},now));
 assert.ok(!matches({...event,start:'2026-10-02T12:00:00Z'},{period:'week',timeZone:'America/New_York'},now));
 assert.ok(matches(event,{timeZone:'UTC'},new Date('2026-09-26T03:00:00Z')));
 assert.ok(!matches(event,{timeZone:'UTC'},new Date('2026-09-27T00:00:00Z')));
});

test('CIM stays visible after its scheduled end until the viewer’s local midnight',()=>{
 const cim={...event,start:'2026-09-25T23:30:00Z',end:'2026-09-26T00:30:00Z'},zone={timeZone:'America/New_York'};
 for(const period of ['upcoming','tonight','week','weekend'])assert.ok(matches(cim,{...zone,period},new Date('2026-09-26T03:59:59Z')),period);
 assert.equal(matches(cim,zone,new Date('2026-09-26T04:00:00Z')),false);
 assert.equal(matches(cim,{timeZone:'America/Los_Angeles'},new Date('2026-09-26T04:00:00Z')),true);
 assert.equal(matches(cim,{timeZone:'America/Los_Angeles'},new Date('2026-09-26T07:00:00Z')),false);
 assert.ok(matches({...cim,end:null},zone,new Date('2026-09-26T03:59:59Z'))); // 90-minute estimate is not a hiding cutoff.
});

test('25-hour days use calendar midnight, and an explicitly ongoing overnight concert remains available',()=>{
 const fall={...event,start:'2026-11-01T04:00:00Z',end:'2026-11-01T05:00:00Z'},zone={timeZone:'America/New_York'};
 assert.ok(matches(fall,zone,new Date('2026-11-02T04:59:59Z')));
 assert.equal(matches(fall,zone,new Date('2026-11-02T05:00:00Z')),false);
 const late={...event,start:'2026-09-26T03:00:00Z',end:'2026-09-26T05:00:00Z'};
 assert.ok(matches(late,zone,new Date('2026-09-26T04:30:00Z')));
 assert.equal(matches(late,zone,new Date('2026-09-26T05:00:00Z')),false);
});

test('refresh and failed-source retention keep recently ended concerts for viewer-local day filtering',async()=>{
 const lateNow=new Date('2026-09-26T00:45:00Z'),finished={...raw,start:'2026-09-25T23:30:00Z',end:'2026-09-26T00:30:00Z'},old={...finished,id:'old',start:'2026-09-22T23:30:00Z',end:'2026-09-23T00:30:00Z'};
 const healthy=await collect(undefined,lateNow,[source],null,{test:async()=>[finished,old]});
 assert.deepEqual(healthy.events.map(e=>e.id),['test-1']);assert.ok(matches(healthy.events[0],{timeZone:'America/New_York'},lateNow));
 const retained=await collect(healthy,new Date(+lateNow+1000),[source],null,{test:async()=>{throw new Error('offline');}});
 assert.equal(retained.events.length,1);assert.equal(retained.events[0].stale,true);
 // A healthy source can still withdraw a listing; day retention does not resurrect cancellations.
 assert.equal((await collect(healthy,lateNow,[source],null,{test:async()=>[]})).events.length,0);
});
test('calendar files use UTC, stable UIDs, escaped text, CRLF and declared duration estimate',()=>{
 const ics=calendar([event],now);
 assert.match(ics,/DTSTART:20260926T000000Z/);assert.match(ics,/DTEND:20260926T013000Z/);
 assert.match(ics,/UID:test-1@classical-live/);assert.match(ics,/Bach\\, Brahms\\;/);
 assert.match(ics,/90 minutes/);assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
 assert.equal(ics.replace(/\r\n/g,'').includes('\n'),false);
});
test('iCalendar folding respects UTF-8 octet limits without splitting characters',()=>{
 const text='SUMMARY:'+ 'é🎻'.repeat(50),folded=foldLine(text);
 assert.ok(folded.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
 assert.equal(folded.replace(/\r\n /g,''),text);
});
test('source URLs reject script schemes and embedded credentials',()=>{
 assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://user:pass@example.org'),null);
 assert.throws(()=>normalize({...raw,stream_url:'data:text/html,hello'},source,now));
});
test('Curtis only admits explicitly free broadcasts',()=>{
 const row={date:'2026-10-09',title:'Recital',categories:['free','broadcast']};
 assert.equal(curtisCandidates({success:true,data:[row,{...row,categories:['free']},{...row,title:'CANCELLED: Recital'}]},now).length,1);
 assert.throws(()=>curtisCandidates({data:[]},now));
});
test('CIM uses calendar metadata, ignores unrelated sidebar time tags, and requires a stream link',()=>{
 const html='<article class="article-detail"><h1>Insiders</h1><var class="atc_date_start">2026-09-27 16:00:00</var><var class="atc_date_end">2026-09-27 17:00:00</var><var class="atc_timezone">America/New_York</var><div class="livestream"><a href="https://vimeo.com/123">Watch</a></div></article><time datetime="2026-09-25T19:30:00Z"></time>';
 assert.equal(parseCim(html,raw.event_url).start,'2026-09-27T20:00:00.000Z');
 assert.equal(parseCim(html.replace('href="https://vimeo.com/123"',''),raw.event_url),null);
 assert.equal(parseCim(html.replace('Insiders','CANCELLED: Insiders'),raw.event_url),null);
});
test('Eastman resolves the year across New Year using the printed weekday',()=>{
 const html='<ul class="streamed-events"><li><strong>Saturday January 2nd</strong> - <a class="event-link" href="/esm-event/recital">Recital</a> @ 7:30pm in <a class="streamed-event" href="/live/hatch/">Hatch</a></li></ul>';
 assert.equal(parseEastman(html,new Date('2026-12-30T12:00:00Z'))[0].start,'2027-01-03T00:30:00.000Z');
});
test('Colburn converts Los Angeles dates and MSM reads only upcoming section',()=>{
 const col='<h3 class="event__title"><a href="https://example.org/event">Showcase</a></h3><div class="em__event__date">Saturday, September 26, 2026 5 pm</div>';
 assert.equal(parseColburn(col)[0].start,'2026-09-27T00:00:00.000Z');
 const block='<div class="newsBlock"><h2><a href="https://example.org/event">Windscape</a></h2><date>September 28, 2026</date><time>7:30 pm EST</time></div>';
 assert.equal(parseMsm('<div class="browseCollection_list"><h3>Upcoming Events</h3>'+block+'<h3>Recent Streaming Events</h3>'+block+'</div>').length,1);
});
test('failed sources retain recent verified events; healthy empty sources clear removed events',async()=>{
 const previous={events:[event],sources:[{...source,last_success:now.toISOString()}]};
 const failed=await collect(previous,now,[source],null,{test:async()=>{throw new Error('offline');}});
 assert.equal(failed.events.length,1);assert.equal(failed.events[0].stale,true);assert.equal(failed.sources[0].status,'error');
 const removed=await collect(previous,now,[source],null,{test:async()=>[]});assert.equal(removed.events.length,0);
 const stale={...event,start:'2026-10-20T12:00:00Z',last_verified_at:new Date(+now-15*DAY).toISOString()};
 assert.equal((await collect({...previous,events:[stale]},now,[source],null,{test:async()=>{throw new Error('offline');}})).events.length,0);
});
