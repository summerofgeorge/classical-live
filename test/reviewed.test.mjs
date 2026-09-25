import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyReviewed} from '../scripts/reviewed.mjs';
import {calendar,matches} from '../dist/core.js';
import {DAY} from '../scripts/ingest.mjs';
const payload=JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8'));
const checked=new Date(payload.sources[0].checked_at),empty={schema_version:1,sources:[],events:[]};
const clone=()=>structuredClone(payload);
test('browser observations preserve check dates across scheduled runs and do not duplicate',()=>{
 const first=applyReviewed(empty,payload,checked);
 assert.deepEqual(first.sources.map(s=>s.count),[10,6]);
 const later=applyReviewed(first,payload,new Date(+checked+DAY));
 assert.ok(later.events.length<first.events.length); // Ended concerts disappear.
 assert.ok(later.events.every(e=>e.last_verified_at===checked.toISOString()));
 assert.equal(new Set(later.events.map(e=>e.id)).size,later.events.length);
 assert.ok(later.sources.every(s=>s.collection==='browser'&&s.status==='manual'));
});
test('reviews expire at 14 days in the build and browser, including a page left open',()=>{
 const current=clone();current.sources[0].events[0].start=new Date(+checked+20*DAY).toISOString();
 const before=applyReviewed(empty,current,checked),event=before.events.find(e=>e.id==='juilliard-186686');
 const expired=new Date(+checked+14*DAY);
 assert.equal(matches(event,{timeZone:'America/New_York'},new Date(+expired-1)),true);
 assert.equal(matches(event,{timeZone:'America/New_York'},expired),false);
 assert.equal(matches({...event,valid_until:'bad'},{timeZone:'UTC'},checked),false);
 const after=applyReviewed(before,current,expired);
 assert.equal(after.events.length,0);assert.ok(after.sources.every(s=>s.status==='review_due'));
});
test('invalid timestamps, missing official evidence, unsafe links and source collisions fail closed',()=>{
 let p=clone();p.sources[0].checked_at=new Date(+checked+DAY).toISOString();assert.throws(()=>applyReviewed(empty,p,checked),/timestamp/);
 p=clone();p.sources[0].events[0].evidence='';assert.throws(()=>applyReviewed(empty,p,checked),/evidence/);
 p=clone();p.sources[0].events[0].stream_url='javascript:alert(1)';assert.throws(()=>applyReviewed(empty,p,checked),/Unsafe/);
 p=clone();p.sources[0].events[0].event_url='https://example.org/event';assert.throws(()=>applyReviewed(empty,p,checked),/evidence/);
 assert.throws(()=>applyReviewed({...empty,sources:[{id:'juilliard'}]},payload,checked),/conflicts/);
});
test('reviewed calendars preserve Eastern times, durations, source provenance and login notes',()=>{
 const result=applyReviewed(empty,payload,checked);
 const axiom=result.events.find(e=>e.id==='juilliard-185731');
 assert.match(calendar([axiom],checked),/DTSTART:20261001T233000Z/);
 const notes=calendar([axiom],checked).replace(/\r\n /g,'');
 assert.match(notes,/free account/);assert.match(notes,/Browser-checked 2026-09-25/);assert.match(notes,/not automatically rechecked/);
 const peabody=result.events.find(e=>e.id==='peabody-peabody-concert-orchestra-3');
 assert.match(calendar([peabody],checked),/DTEND:20260926T013000Z/);
 assert.equal(result.events.find(e=>e.id==='peabody-next-ensemble-2').end,null);
});
