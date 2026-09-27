import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {international,sources,adapters,collect,normalize} from '../scripts/ingest.mjs';
import {internationalSources,melbourneFeed,melbourneWatch,geidaiIndex,moscowFeed} from '../scripts/international.mjs';
import {schools} from '../dist/schools.js';
import {calendar} from '../dist/core.js';
const fixture=name=>readFile(new URL('./fixtures/international-'+name,import.meta.url),'utf8');
const [feed,britten,melba,inPerson,ended,index,moscow]=await Promise.all(['melbourne.json','melbourne-britten.html','melbourne-melba.html','melbourne-in-person.html','geidai-ended.html','geidai-index.html','moscow.html'].map(fixture));
const now=new Date('2026-09-27T12:00:00Z');
const candidates=international.melbourneCandidates(JSON.parse(feed),now);
const byId=id=>candidates.find(e=>e.id===id);

test('Melbourne admits both explicit streamed series with verified Australian DST and ends',()=>{
 const evening=international.parseMelbourne(britten,byId(53392));
 assert.equal(evening.start,'2026-10-13T08:30:00.000Z');
 assert.equal(evening.end,'2026-10-13T09:30:00.000Z');
 assert.equal(evening.stream_url,melbourneWatch);
 const lunch=international.parseMelbourne(melba,byId(54873));
 assert.equal(lunch.start,'2026-10-12T02:10:00.000Z');
 const eastern=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(lunch.start)).map(p=>[p.type,p.value]));
 assert.equal(eastern.year+'-'+eastern.month+'-'+eastern.day+' '+eastern.hour+':'+eastern.minute,'2026-10-11 22:10');
 const event=normalize(lunch,internationalSources[0],now);
 assert.match(calendar([event],now),/DTSTART:20261012T021000Z/);
});

test('Melbourne excludes free in-person events, paid concerts, talks, cancellation and unrelated series',()=>{
 assert.equal(international.parseMelbourne(inPerson,byId(55583)),null);
 assert.equal(candidates.some(e=>[55039,55652].includes(e.id)),false);
 assert.equal(international.parseMelbourne(britten.replace('EventScheduled','EventCancelled'),byId(53392)),null);
 assert.equal(international.parseMelbourne(melba.replaceAll('Melba Hall Lunch Hour Concert Series','Unrelated concert series'),byId(54873)),null);
 assert.equal(international.parseMelbourne(britten.replace('All concerts in this series can also be streamed live','Concerts take place in person'),byId(53392)),null);
 assert.equal(international.parseMelbourne(britten.replace('All concerts in this series can also be streamed live','Private stream. All concerts in this series can also be streamed live'),byId(53392)),null);
});

test('Melbourne rejects mismatched timestamps, incomplete feeds and untrusted links',()=>{
 assert.throws(()=>international.parseMelbourne(britten.replace('2026-10-13T08:30:00+00:00','2026-10-13T09:30:00+00:00'),byId(53392)),/times disagree/);
 assert.throws(()=>international.melbourneCandidates(Array(200).fill({}),now),/limit/);
 const data=JSON.parse(feed),row=data.find(e=>e.id===53392);row.date_iso=row.date_iso.replace('+11:00','+10:00');
 assert.throws(()=>international.melbourneCandidates(data,now),/timestamps disagree/);
 row.date_iso=row.date_iso.replace('+10:00','+11:00');row.url='https://unrelated.example/event';
 assert.throws(()=>international.melbourneCandidates(data,now),/identity/);
});

test('Geidai archive and ended concert never become upcoming streams',()=>{
 assert.deepEqual(international.geidaiCandidates(index,now),[]);
 const before=new Date('2026-08-28T00:00:00Z'),items=international.geidaiCandidates(index,before);
 assert.equal(items.length,1);
 assert.equal(international.parseGeidai(ended,items[0]),null);
 // Simulates the same observed layout before its explicit ended notice was added.
 const announced=ended.replace(/LIVE配信は終了しました/g,'');
 const event=international.parseGeidai(announced,items[0]);
 assert.equal(event.start,'2026-08-29T02:00:00.000Z');
 assert.match(event.title,/モーニング/);
 assert.throws(()=>international.parseGeidai(announced,{...items[0],date:'2026-08-30'}),/dates disagree/);
 assert.throws(()=>international.geidaiCandidates('<title>Login</title>',now),/changed/);
});

test('Moscow original announcement fixes the year and preserves multiple same-day concerts',()=>{
 const events=international.parseMoscow(moscow,new Date('2026-09-01T12:00:00Z'));
 assert.equal(events.length,9);
 assert.equal(events.find(e=>e.title.includes('Звезды')).start,'2026-09-23T16:00:00.000Z');
 assert.equal(events.filter(e=>e.start.startsWith('2026-09-21')).length,2);
 assert.equal(new Set(events.map(e=>e.id)).size,9);
 assert.deepEqual(international.parseMoscow(moscow,new Date('2027-09-01T12:00:00Z')),[]);
 assert.throws(()=>international.parseMoscow(moscow.replace('2026-09-01T11:49:50+00:00','bad'),now),/timestamp/);
 assert.throws(()=>international.parseMoscow(moscow.replace('2 сентября, Большой зал, 12.00','2 сентября, Большой зал, noon'),now),/date format/);
});

test('Moscow January announcements resolve across year end and simultaneous halls keep distinct IDs',()=>{
 const html='<div class="tgme_widget_message" data-post="mosconsvtv/2000"><time datetime="2026-12-30T12:00:00Z"></time><div class="tgme_widget_message_text"><b>Расписание трансляций на январь:</b><br>3 января, Большой зал, 19.00<br>Концерт<br>3 января, Малый зал, 19.00<br>Концерт</div></div>';
 const events=international.parseMoscow(html,new Date('2026-12-31T12:00:00Z'));
 assert.equal(events.length,2);assert.equal(events[0].start,'2027-01-03T16:00:00.000Z');
 assert.notEqual(events[0].id,events[1].id);
});

test('new adapters share collection, normalization, request metrics and failure retention',async()=>{
 const responses=new Map([[melbourneFeed,JSON.parse(feed)], [byId(53392).url,britten],[byId(54873).url,melba],[byId(55583).url,inPerson],[byId(55721).url,await fixture('melbourne-zero-duration.html')],[geidaiIndex,index],[moscowFeed,moscow]]);
 let requests=0;const get=async url=>{requests++;if(!responses.has(url))throw new Error('Unexpected URL '+url);return responses.get(url);};get.stats=()=>({requests,request_limit:360,response_bytes:0});
 const result=await collect(undefined,now,internationalSources,get,adapters);
 assert.ok(result.sources.every(s=>s.status==='ok'));
 assert.equal(result.sources.find(s=>s.id==='melbourne').count,2);
 assert.equal(result.sources.find(s=>s.id==='geidai').count,0);
 assert.equal(result.collection.requests,7);
 assert.equal(result.sources.reduce((sum,s)=>sum+s.requests,0),7);
 const failed=await collect(result,now,internationalSources,async()=>{throw new Error('HTTP 503');},adapters);
 assert.ok(failed.events.every(e=>e.stale));
 assert.deepEqual(failed.events.map(e=>e.id),result.events.map(e=>e.id));
});

test('every automatic school has a unique collector and location metadata',()=>{
 assert.equal(new Set(sources.map(s=>s.id)).size,sources.length);
 for(const source of sources){assert.equal(typeof adapters[source.id],'function',source.id);for(const key of ['city','country','region'])assert.ok(schools[source.id]?.[key],source.id+' '+key);}
 assert.equal(schools.melbourne.region,'Oceania');assert.equal(schools.geidai.region,'Asia');
});
