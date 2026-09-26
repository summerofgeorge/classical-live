import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expansion,adapters,sources} from '../scripts/ingest.mjs';
import {schools,schoolInfo,schoolSize} from '../dist/schools.js';
import {matches,calendar} from '../dist/core.js';
const fixture=name=>readFile(new URL('./fixtures/expansion-'+name,import.meta.url),'utf8');
const {parseIndiana,parseOhioState,parseOhio,parseUnt,parseRcm,parseWestern}=expansion.parsers;

test('Indiana uses the dedicated online feed and rejects incomplete or unzoned schedules',async()=>{
 const data=JSON.parse(await fixture('indiana.json')),events=parseIndiana(data);
 assert.equal(events.length,2);assert.equal(events[0].start,'2026-09-25T19:30:00-04:00');
 assert.match(events[0].stream_url,/liveatjacobs/);
 for(const [key,value] of [['is_canceled',1],['is_all_day',1],['is_online',0],['online_url','https://example.com/']]){
  const p=structuredClone(data);p.data[0][key]=value;assert.equal(parseIndiana(p).length,1,key);
 }
 assert.throws(()=>parseIndiana({...data,links:{next:'/next'}}),/incomplete/);
 const missing=structuredClone(data);missing.data[0].date_iso='2026-09-25T20:00:00';assert.throws(()=>parseIndiana(missing),/zoned/);
});

test('Ohio State requires a public stream and matching printed and calendar times',async()=>{
 const html=await fixture('osu.html'),url='https://music.osu.edu/events/wind-symphony-093026',event=parseOhioState(html,url);
 assert.equal(event.start,'2026-09-30T23:30:00.000Z');assert.equal(event.end,'2026-10-01T01:00:00.000Z');
 assert.match(event.stream_url,/q0Zh-AzKz5E/);
 assert.equal(parseOhioState(html.replaceAll('Livestream broadcast','Cancelled Livestream broadcast'),url),null);
 assert.equal(parseOhioState(html.replaceAll('https://youtube.com/live/q0Zh-AzKz5E?feature=share','#'),url),null);
 assert.throws(()=>parseOhioState(html.replaceAll('20260930T193000','20260930T183000'),url),/disagrees/);
});

test('Ohio State pagination excludes external departments and ends at the look-ahead limit',async()=>{
 const card=(date,url)=>`<div class="bux-card"><div class="event-date-single">${date}</div><div class="bux-card__heading"><a href="${url}">Concert</a></div></div>`;
 const page=(cards,next)=>`<div class="view-events">${cards}</div>${next?'<a rel="next" href="?page=1">More</a>':''}`;
 const responses=new Map([
  ['https://music.osu.edu/events',page(card('September 30, 2026','/events/wind')+card('Thu, October 15 - Fri, October 16, 2026','https://registrar.osu.edu/break'),true)],
  ['https://music.osu.edu/events/wind',await fixture('osu.html')],
  ['https://music.osu.edu/events?page=1',page(card('December 1, 2026','/events/winter'),true)]
 ]),calls=[];
 const events=await adapters['ohio-state'](async url=>{calls.push(url);assert.ok(responses.has(url),url);return responses.get(url);},new Date('2026-09-25T12:00:00Z'));
 assert.equal(events.length,1);assert.equal(calls.length,3);
});

test('Ohio University uses explicit public channel links and preserves recurring instance dates',async()=>{
 const data=JSON.parse(await fixture('ohio.json')),events=parseOhio(data);assert.equal(events.length,2);
 const first=data.events[0].event;first.event_instances.push({event_instance:{id:'repeat',start:'2026-11-02T20:00:00-05:00',end:null}});
 const recurring=parseOhio(data);assert.equal(recurring.length,3);assert.notEqual(recurring[0].id,recurring[1].id);
 assert.equal(recurring[1].start,'2026-11-02T20:00:00-05:00');
 first.stream_url='https://tickets.example.com';assert.equal(parseOhio(data).length,1);
 data.events[1].event.title='Canceled concert';assert.equal(parseOhio(data).length,0);
});

test('North Texas parses the public upcoming schedule without treating recordings as live events',async()=>{
 const html=await fixture('unt.html'),events=parseUnt(html);assert.equal(events.length,2);
 assert.ok(events.every(e=>new Date(e.start)>=new Date('2026-09-25')));
 assert.ok(events.every(e=>/^https:\/\/recording.music.unt.edu\/media\/t\/1_/.test(e.stream_url)));
 assert.throws(()=>parseUnt('<p>Not found</p>'),/missing/);
 assert.throws(()=>parseUnt(html.replaceAll('US/Central','unknown')),/date missing/);
});

test('London and Canada use their own DST dates; Western excludes its past schedule and keeps rescheduled dates',async()=>{
 const london=parseRcm(await fixture('rcm.html'));assert.equal(london[0].start,'2026-10-30T19:30:00.000Z');
 assert.match(london[0].stream_url,/3L08b_MaMqE/);
 const western=parseWestern(await fixture('western.html'));
 assert.equal(western.find(e=>e.start.startsWith('2026-10-02')).start,'2026-10-02T16:30:00.000Z');
 assert.equal(western.find(e=>e.start.startsWith('2026-10-30')).start,'2026-10-30T16:30:00.000Z');
 assert.equal(western.find(e=>e.start.startsWith('2026-11-06')).start,'2026-11-06T17:30:00.000Z');
 assert.ok(western.every(e=>e.title!=='Past series'));
 assert.equal(western.find(e=>e.start.startsWith('2026-11-27')).program,'Updated performers TBA');
 const revised=parseWestern((await fixture('western.html')).replace('Jean Sophie Kim, piano','<del>Former performer</del>Jean Sophie Kim, piano'));
 assert.doesNotMatch(revised.find(e=>e.start.startsWith('2026-11-06')).program,/Former performer/);
 assert.throws(()=>parseWestern('<h3>Website changed</h3>'),/changed/);
});

test('region, country and published music-school size combine with existing filters',()=>{
 const event={id:'test',title:'Orchestra',institution:'Indiana',source:'indiana',type:'Orchestra',program:'',start:'2026-10-30T20:00:00-04:00',event_url:'https://example.com/',stream_url:'https://example.com/',timezone:'America/New_York',...schoolInfo('indiana')};
 const now=new Date('2026-10-30T12:00:00Z'),base={timeZone:'America/New_York',period:'tonight',type:'Orchestra',country:'United States',region:'US Midwest',size:'large'};
 assert.ok(matches(event,base,now));assert.equal(matches(event,{...base,size:'small'},now),false);assert.equal(matches(event,{...base,country:'Canada'},now),false);assert.equal(matches(event,{...base,region:'Europe'},now),false);
 assert.equal(matches(event,{...base,query:'Mozart'},now),false);
 assert.match(calendar([event],now),/DTSTART:20261031T000000Z/);
 assert.equal(schoolInfo('michigan').size,'unknown'); // SMTD totals include dance and theatre.
 assert.equal(schoolInfo('missing').size,'unknown');
 assert.deepEqual([499,500,999,1000].map(students=>schoolSize({enrollment:{students}})),['small','medium','medium','large']);
 for(const source of sources)assert.ok(schools[source.id]?.country,source.id);
 for(const school of Object.values(schools))if(school.enrollment){assert.match(school.enrollment.url,/^https:/);assert.ok(school.enrollment.checked_at);}
});
