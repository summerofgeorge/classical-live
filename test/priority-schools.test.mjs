import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prioritySchools,sources,DAY} from '../scripts/ingest.mjs';
import {applyReviewed} from '../scripts/reviewed.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/priority-schools.json',import.meta.url),'utf8')),p=prioritySchools.parsers,now=new Date('2026-09-28T22:00:00Z');
test('Rutgers reads the published academic year, two performances per row, and DST',()=>{
 const e=p.parseRutgers(f.rutgers);assert.equal(e.find(e=>e.title==='Rutgers Wind Ensemble: Latin Night').start,'2026-10-10T23:30:00.000Z');
 assert.deepEqual(e.filter(e=>e.title.includes('Elizabeth Cree')).map(e=>e.start),['2026-11-21T00:30:00.000Z','2026-11-22T19:00:00.000Z']);
 assert.ok(e.some(e=>e.start==='2027-05-02T18:00:00.000Z'));
 assert.throws(()=>p.parseRutgers(f.rutgers.replace('2026–27','2025–26')),/disagree/);
 assert.throws(()=>p.parseRutgers(f.rutgers.replace('regular series of free performances','campus concerts')),/free livestream/);
});
test('Bard requires an explicit webcast on the dated event, not just the campus calendar',()=>{
 assert.equal(p.bardCandidates(f.bardIndex).length,4);const e=p.parseBard(f.bard,'https://www.bard.edu/conservatory/events/noon-concert-series-2026-i');assert.equal(e.start,'2026-10-19T16:00:00.000Z');
 assert.equal(p.parseBard(f.bard.replace('Livestreaming on the Conservatory YouTube Channel','Free campus admission'),'https://www.bard.edu/conservatory/events/noon'),null);
 assert.throws(()=>p.parseBard(f.bard.replace('Monday, October 19','Tuesday, October 19'),'https://www.bard.edu/conservatory/events/noon'),/weekday/);
 assert.throws(()=>p.bardCandidates(f.bardIndex.replaceAll('https://www.bard.edu/conservatory/events/noon','https://example.com/conservatory/events/noon')),/destination/);
});
test('UCLA uses categories, iCal time zones, and a bounded rolling window',()=>{
 const c=p.uclaCandidates(f.uclaIcs,now);assert.ok(c.length>5);assert.ok(c.every(e=>!e.title.includes('Masterclass')&&!e.title.includes('Opera | Black')));
 assert.ok(c.every(e=>Date.parse(e.start)<+now+45*DAY));assert.throws(()=>p.uclaCandidates(f.uclaIcs.replaceAll('TZID=America/Los_Angeles','TZID=America/New_York'),now),/campus time/);
});
test('UCLA generic navigation is not stream evidence; detail and feed dates must agree',()=>{
 const candidates=p.uclaCandidates(f.uclaIcs,now),wind=candidates.find(e=>e.title==='UCLA Wind Ensemble'),recital=candidates.find(e=>e.title.startsWith('Anna Marie'));
 const e=p.parseUcla(f.uclaStream,wind);assert.equal(e.start,'2026-10-31T03:00:00.000Z');assert.equal(new URL(e.stream_url).hash,'#schoenberg-hall');
 assert.equal(p.parseUcla(f.uclaNoStream,recital),null);
 assert.throws(()=>p.parseUcla(f.uclaStream,{...wind,start:'2026-10-31T02:00:00.000Z'}),/times disagree/);
 assert.equal(p.parseUcla(f.uclaStream.replace('UCLA Wind Ensemble','Canceled: UCLA Wind Ensemble'),wind),null);
});
test('Rutgers and Columbia manual reviews expire without scheduled timestamp renewal',async()=>{
 assert.ok(!sources.some(s=>['rutgers','columbia'].includes(s.id)));
 const data=JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8'));data.sources=data.sources.filter(s=>['rutgers','columbia'].includes(s.id));assert.equal(data.sources.length,2);
 const checked=new Date(Math.max(...data.sources.map(s=>Date.parse(s.checked_at)))),result=applyReviewed({events:[],sources:[]},data,checked);assert.equal(result.sources.find(s=>s.id==='rutgers').count,8);assert.ok(result.events.some(e=>e.source==='columbia'));
 const later=applyReviewed(result,data,new Date(+checked+DAY));assert.ok(later.sources.every(s=>s.last_success===data.sources.find(x=>x.id===s.id).checked_at));
 const expired=applyReviewed(result,data,new Date(+checked+14*DAY));assert.equal(expired.events.length,0);assert.ok(expired.sources.every(s=>s.status==='review_due'));
 assert.ok(!data.sources.find(s=>s.id==='columbia').events.some(e=>e.title==='Sonnambula'));
});
