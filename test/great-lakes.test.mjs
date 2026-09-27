import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {greatLakes,sources,normalize,collect} from '../scripts/ingest.mjs';
import {greatLakesSources} from '../scripts/great-lakes.mjs';
import {schoolInfo} from '../dist/schools.js';
const f=JSON.parse(readFileSync(new URL('./fixtures/great-lakes.json',import.meta.url),'utf8'));
const now=new Date('2026-09-27T20:00:00Z');
const {parseBaldwinWallace,parseLocalist,parseCarnegieMellon,parseDuquesne,parseCaseWestern}=greatLakes.parsers;
const caseUrl='https://case.edu/artsci/music/news-events/upcoming-concerts-events/CUCSO-09-30-2026';
test('Baldwin Wallace requires a usable event link and agreeing concert dates',()=>{
 const e=parseBaldwinWallace(f.bw,f.bwItem);
 assert.equal(e.start,'2026-10-02T23:00:00.000Z');assert.equal(e.end,'2026-10-03T01:00:00.000Z');
 assert.match(e.stream_url,/boxcast.tv\/view\//);
 assert.equal(parseBaldwinWallace(f.bw.replace('https://boxcast.tv/view/','https://unverified.test/'),f.bwItem),null);
 assert.equal(parseBaldwinWallace(f.bw.replace('WATCH IT LIVE','Watch a recording'),f.bwItem),null);
 assert.throws(()=>parseBaldwinWallace(f.bw,{...f.bwItem,startDate:'2026-10-02T20:00-0400'}),/disagree/);
 assert.throws(()=>parseBaldwinWallace('<h1>Access denied</h1>',f.bwItem),/layout/);
});
test('Localist feeds require the right school and affirmative public broadcast evidence',()=>{
 const bg=parseLocalist(f.bgsu,'bgsu',now),pitt=parseLocalist(f.pitt,'pittsburgh',now);
 assert.equal(bg.length,17);assert.equal(pitt.length,4);
 assert.equal(bg.find(e=>e.title==='Percussion Ensemble').start,'2026-11-06T01:00:00.000Z');
 assert.equal(pitt.find(e=>e.title.endsWith('Orchestra II')).start,'2026-11-02T00:00:00.000Z');
 for(const change of [e=>e.tags=[],e=>e.groups=[],e=>e.private=true,e=>e.title='CANCELLED: Concert',e=>e.description='This event will not be livestreamed.']){
  const copy=structuredClone(f.bgsu);copy.events=[copy.events[0]];change(copy.events[0].event);assert.deepEqual(parseLocalist(copy,'bgsu',now),[]);
 }
 for(const change of [e=>e.stream_url='https://example.com',e=>e.free=false,e=>e.departments=[],e=>e.experience='inperson']){
  const copy=structuredClone(f.pitt);copy.events=[copy.events[1]];change(copy.events[0].event);assert.deepEqual(parseLocalist(copy,'pittsburgh',now),[]);
 }
 const recurring=structuredClone(f.pitt);recurring.events=[recurring.events[1]];const e=recurring.events[0].event;
 e.event_instances.push(structuredClone(e.event_instances[0]));e.event_instances[1].event_instance.id++;
 e.event_instances[1].event_instance.start='2026-10-05T21:00:00-04:00';
 const twice=parseLocalist(recurring,'pittsburgh',now);assert.equal(new Set(twice.map(e=>e.id)).size,2);
 e.event_instances[0].event_instance.start='2026-10-05T20:00:00-05:00';assert.throws(()=>parseLocalist(recurring,'pittsburgh',now),/offset/);
 assert.throws(()=>parseLocalist({events:[]},'bgsu',now),/format/);
});
test('Carnegie Mellon accepts the event-specific public YouTube broadcast',()=>{
 const events=parseCarnegieMellon(f.cmu,now);assert.equal(events.length,1);
 assert.equal(events[0].start,'2026-09-27T23:30:00.000Z');assert.match(events[0].stream_url,/-DRfs_BDMEM/);
 const copy=structuredClone(f.cmu);copy.data[0].description='<a href="https://youtube.com/live/-DRfs_BDMEM">Previous performance</a>';
 assert.deepEqual(parseCarnegieMellon(copy,now),[]);
 copy.data[0]=structuredClone(f.cmu.data[0]);copy.data[0].is_canceled=true;assert.deepEqual(parseCarnegieMellon(copy,now),[]);
 copy.meta.total_pages=2;assert.throws(()=>parseCarnegieMellon(copy,now),/page limit/);
});
test('Duquesne uses printed dates, not broken datetime attributes or its radio schedule',()=>{
 const events=parseDuquesne(f.duquesne,now);assert.equal(events.length,2);
 assert.equal(events[0].start,'2026-10-10T19:00:00.000Z');assert.equal(events[0].end,'2026-10-10T21:00:00.000Z');
 assert.equal(events[1].start,'2026-11-09T00:30:00.000Z');
 assert.throws(()=>parseDuquesne(f.duquesne.replace('Upcoming Live Streams','Past Streams'),now),/schedule/);
 assert.throws(()=>parseDuquesne(f.duquesne.replace('Iemma livestream','radio'),now),/player/);
});
test('Case Western uses only event-header stream evidence, excluding generic venue boilerplate',()=>{
 assert.equal(parseCaseWestern(f.caseWestern,caseUrl).start,'2026-09-30T23:00:00.000Z');
 const harkness=f.caseWestern.replace('In-Person &amp; Virtual','In Person / Livestream').replace('<strong>Tickets:</strong>&nbsp;Free | General Admission or Livestream','<strong>Admission:</strong>&nbsp;Free &amp; Open to the Public').replaceAll('https://case.edu/maltzcenter/livestream-silver-hall','https://case.edu/livestream/harkness');
 assert.equal(parseCaseWestern(harkness,caseUrl).stream_url,'https://case.edu/livestream/harkness');
 assert.equal(parseCaseWestern(f.caseWestern.replace('<strong>Watch:</strong>','<strong>Venue:</strong>'),caseUrl),null);
 assert.equal(parseCaseWestern(f.caseWestern.replace('In-Person &amp; Virtual','In-Person'),caseUrl),null);
 assert.equal(parseCaseWestern(f.caseWestern.replace('Free | General Admission','Paid | General Admission'),caseUrl),null);
 assert.throws(()=>parseCaseWestern(f.caseWestern.replace('September 30, 2026','September 30'),caseUrl),/date/);
});
test('Pitt paginates within a bounded request budget and catches unexpected feed changes',async()=>{
 const urls=[],payload=structuredClone(f.pitt);payload.page.total=2;
 const rows=await greatLakes.adapters.pittsburgh(async url=>{urls.push(url);const p=structuredClone(payload);p.page.current=Number(new URL(url).searchParams.get('page'));return p;},now);
 assert.equal(urls.length,2);assert.equal(rows.length,8);assert.match(urls[0],/group_id=20564/);
 payload.page.total=4;
 await assert.rejects(()=>greatLakes.adapters.pittsburgh(async url=>({...payload,page:{...payload.page,current:Number(new URL(url).searchParams.get('page'))}}),now),/budget/);
});
test('new schools have complete metadata and use shared normalization and failure retention',async()=>{
 for(const s of greatLakesSources){assert.ok(sources.some(x=>x.id===s.id));assert.ok(greatLakes.adapters[s.id]);assert.ok(schoolInfo(s.id).city);}
 const s=greatLakesSources.find(s=>s.id==='carnegie-mellon'),e=normalize(parseCarnegieMellon(f.cmu,now)[0],s,now);
 const result=await collect({sources:[],events:[e]},now,[s],()=>{}, {[s.id]:async()=>{throw new Error('Changed calendar');}});
 assert.equal(result.sources[0].status,'error');assert.equal(result.events[0].stale,true);
});
