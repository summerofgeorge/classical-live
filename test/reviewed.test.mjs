import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyReviewed} from '../scripts/reviewed.mjs';
import {calendar,matches} from '../dist/core.js';
import {DAY} from '../scripts/ingest.mjs';
const allReviews=JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8'));
const payload={...allReviews,sources:allReviews.sources.filter(s=>['mcgill','mannes'].includes(s.id))};
const checked=new Date(Math.max(...payload.sources.map(s=>Date.parse(s.checked_at)))),empty={schema_version:1,sources:[],events:[]};
const clone=()=>structuredClone(payload);

test('BYU retains browser-reviewed streams with independent review expiry',()=>{
 const byuPayload={...allReviews,sources:allReviews.sources.filter(s=>s.id==='byu')};
 const byuChecked=new Date(byuPayload.sources[0].checked_at);
 const result=applyReviewed(empty,byuPayload,byuChecked),events=result.events.filter(e=>e.source==='byu');
 assert.ok(events.length>=1);
 assert.ok(events.every(e=>e.stream_url.includes('musicstreaming.byu.edu')));
 const later=applyReviewed(result,byuPayload,new Date(+byuChecked+14*DAY));
 assert.equal(later.sources.find(s=>s.id==='byu').status,'review_due');
 assert.equal(later.events.length,0);
});
test('browser observations preserve check dates across scheduled runs and do not duplicate',()=>{
 const first=applyReviewed(empty,payload,checked);
 assert.equal(first.sources.length,2);
 assert.ok(first.sources.every(s=>s.count>=1));
 const later=applyReviewed(first,payload,new Date(+checked+3*DAY));
 assert.ok(later.events.every(e=>payload.sources.some(s=>s.id===e.source&&e.last_verified_at===new Date(s.checked_at).toISOString())));
 assert.equal(new Set(later.events.map(e=>e.id)).size,later.events.length);
 assert.ok(later.sources.every(s=>s.collection==='browser'&&s.status==='manual'));
});

test('reviewed performances also survive their scheduled end on the same local day',()=>{
 const after=applyReviewed(empty,payload,new Date('2026-10-05T03:59:59Z'));
 const event=after.events.find(e=>e.id==='mannes-tesla-2026-10-04');
 assert.ok(event);
 assert.ok(matches(event,{timeZone:'America/New_York'},new Date('2026-10-05T03:59:59Z')));
 assert.equal(matches(event,{timeZone:'America/New_York'},new Date('2026-10-05T04:00:00Z')),false);
});
test('reviews expire at 14 days in the build and browser, including a page left open',()=>{
 const current=clone();
 const mannes=current.sources.find(s=>s.id==='mannes');
 const mannesChecked=new Date(mannes.checked_at);
 mannes.events[0].start=new Date(+mannesChecked+20*DAY).toISOString();
 mannes.events[0].end=null;
 const before=applyReviewed(empty,current,mannesChecked),event=before.events.find(e=>e.id==='mannes-tesla-2026-10-04');
 const expired=new Date(+mannesChecked+14*DAY);
 assert.equal(matches(event,{timeZone:'America/New_York'},new Date(+expired-1)),true);
 assert.equal(matches(event,{timeZone:'America/New_York'},expired),false);
 assert.equal(matches({...event,valid_until:'bad'},{timeZone:'UTC'},mannesChecked),false);
 const after=applyReviewed(before,current,expired);
 assert.equal(after.events.length,0);assert.ok(after.sources.every(s=>s.status==='review_due'));
});
test('invalid timestamps, missing official evidence, unsafe links and source collisions fail closed',()=>{
 let p=clone();p.sources[0].checked_at=new Date(+checked+DAY).toISOString();assert.throws(()=>applyReviewed(empty,p,checked),/timestamp/);
 p=clone();p.sources[0].events[0].evidence='';assert.throws(()=>applyReviewed(empty,p,checked),/evidence/);
 p=clone();p.sources[0].events[0].stream_url='javascript:alert(1)';assert.throws(()=>applyReviewed(empty,p,checked),/Unsafe/);
 p=clone();p.sources[0].events[0].event_url='https://example.org/event';assert.throws(()=>applyReviewed(empty,p,checked),/evidence/);
 assert.throws(()=>applyReviewed({...empty,sources:[{id:'mcgill'}]},payload,checked),/conflicts/);
});
test('reviewed calendars preserve Eastern times, durations, official links and login notes',()=>{
 const result=applyReviewed(empty,payload,checked);
 const mannes=result.events.find(e=>e.id==='mannes-tesla-2026-10-04');
 assert.match(calendar([mannes],checked),/DTSTART:20261004T180000Z/);
 const notes=calendar([mannes],checked).replace(/\r\n /g,'');
 assert.match(notes,/Free registration required/);assert.ok(notes.includes(mannes.event_url));assert.doesNotMatch(notes,/Browser-checked|not automatically rechecked/);
 const mcgill=result.events.find(e=>e.id==='mcgill-374055');
 assert.match(calendar([mcgill],checked),/DTEND:20261025T013000Z/);
 assert.equal(result.events.find(e=>e.id==='mcgill-374061').end,'2026-10-26T21:30:00-04:00');
});
