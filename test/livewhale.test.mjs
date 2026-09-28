import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {liveWhaleWindow} from '../scripts/livewhale.mjs';
import {adapters,collect,sources} from '../scripts/ingest.mjs';
import {matches} from '../dist/core.js';
import {indianaFeed} from '../scripts/expansion.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/great-lakes.json',import.meta.url),'utf8')).cmu;
const now=new Date('2026-09-28T01:15:00Z'); // Still September 27 in Pittsburgh.
const cmu=sources.find(s=>s.id==='carnegie-mellon');

test('CMU survives an evening refresh after its concert starts, then leaves Today at local midnight',async()=>{
 let requests=0;
 const get=async(url,json)=>{
  requests++;assert.equal(json,true);
  // The official default feed contains only future starts. An explicit start
  // date requests the current concert too, as confirmed against the live API.
  const from=new URL(url).pathname.match(/\/start_date\/(\d{4}-\d\d-\d\d)/)?.[1];
  const data=fixture.data.filter(e=>Date.parse(e.date_iso)>=Date.parse(from?`${from}T00:00:00-04:00`:now));
  return {...fixture,data,meta:{...fixture.meta,total_results:data.length}};
 };
 const result=await collect(undefined,now,[cmu],get);
 assert.equal(requests,1);assert.equal(result.sources[0].status,'ok');
 const concert=result.events.find(e=>e.id==='carnegie-mellon-33705');
 assert.ok(concert);assert.equal(concert.stale,false);
 assert.equal(matches(concert,{period:'today',timeZone:'America/New_York'},now),true);
 assert.equal(matches(concert,{period:'today',timeZone:'America/New_York'},new Date('2026-09-28T04:00:00Z')),false);
});

test('explicit recent dates still honor a newly cancelled CMU performance',async()=>{
 const payload=structuredClone(fixture);payload.data[0].is_canceled=true;
 const result=await collect(undefined,now,[cmu],async()=>payload);
 assert.equal(result.sources[0].status,'ok');assert.deepEqual(result.events,[]);
});

test('LiveWhale date windows use the school timezone across UTC midnight and DST',()=>{
 const feed='https://example.org/live/json/events';
 assert.equal(liveWhaleWindow(feed,now,'America/New_York'),feed+'/start_date/2026-09-25/end_date/2026-11-12');
 assert.equal(liveWhaleWindow(feed,new Date('2026-11-02T04:30:00Z'),'America/New_York'),feed+'/start_date/2026-10-31/end_date/2026-12-17');
 assert.equal(liveWhaleWindow(feed,new Date('2026-10-04T13:30:00Z'),'Australia/Melbourne'),feed+'/start_date/2026-10-02/end_date/2026-11-20');
});

test('Indiana requests recent concerts through the same explicit date window',async()=>{
 const payload=JSON.parse(readFileSync(new URL('./fixtures/expansion-indiana.json',import.meta.url),'utf8'));
 const events=await adapters.indiana(async(url,json)=>{
  assert.equal(url,indianaFeed+'/start_date/2026-09-25/end_date/2026-11-12');
  assert.equal(json,true);return payload;
 },now);
 assert.equal(events.length,2);
});
