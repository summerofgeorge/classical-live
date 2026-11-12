import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wikiMine,adapters,sources,normalize} from '../scripts/ingest.mjs';
import {peabodyFeed,michiganIndex,juilliardIndex,ihwaIndex} from '../scripts/wiki-mine.mjs';
import {schoolInfo} from '../dist/schools.js';
import {regionIdForSource} from '../scripts/regions.mjs';
import {calendar} from '../dist/core.js';

const fixture=name=>readFile(new URL('./fixtures/'+name,import.meta.url),'utf8');
const {parsePeabody,parseMichigan,parseJuilliard,parseIhwa}=wikiMine.parsers;
const now=new Date('2026-09-26T12:00:00Z');
const juilliardUrl='https://www.juilliard.edu/event/186421/sonatenabend';
const ihwaUrl='https://www.ihwa.de/event/wettbewerb26-runde1-1';

test('Peabody Tribe feed requires Free cost and an IBM Livestream button',async()=>{
 const raw=JSON.parse(await fixture('wiki-peabody.json'));
 const events=parsePeabody(raw,now);
 assert.equal(events.length,3);
 assert.equal(events[0].start,'2026-09-28T22:00:00.000Z');
 assert.equal(events[0].stream_url,'https://video.ibm.com/channel/Goodwin-Hall');
 assert.equal(events[0].type,'Recital');
 const paid=structuredClone(raw);paid.events[0].cost='$25';assert.equal(parsePeabody(paid,now).length,2);
 const noLive=structuredClone(raw);noLive.events[0].description='<p>In-person only</p>';assert.equal(parsePeabody(noLive,now).length,2);
 const badHost=structuredClone(raw);badHost.events[0].description='<p><a href="https://example.com/x">Livestream</a></p>';assert.equal(parsePeabody(badHost,now).length,2);
 assert.throws(()=>parsePeabody({events:raw.events,total:2,total_pages:1},now),/incomplete/);
});

test('Michigan livestream filter keeps free hall links and dates from the event URL',async()=>{
 const events=parseMichigan(await fixture('wiki-michigan.html'),now);
 assert.equal(events.length,2);
 assert.equal(events[0].start,'2026-09-30T00:00:00.000Z'); // Sep 29 8pm ET
 assert.equal(events[0].stream_url,'https://smtd.umich.edu/live-stream-hill/');
 assert.equal(events[1].stream_url,'https://smtd.umich.edu/live-stream-britton/');
 assert.equal(parseMichigan((await fixture('wiki-michigan.html')).replaceAll('Free - no tickets required','$15 tickets'),now).length,0);
 assert.equal(parseMichigan((await fixture('wiki-michigan.html')).replaceAll('Livestream Link','More info'),now).length,0);
 assert.throws(()=>parseMichigan('<div>empty</div>',now),/changed/);
});

test('Juilliard requires the Live Streaming watch notice and Eastern JSON-LD start',async()=>{
 const event=parseJuilliard(await fixture('wiki-juilliard-event.html'),juilliardUrl);
 assert.equal(event.start,'2026-09-30T22:00:00.000Z');
 assert.equal(event.stream_url,juilliardUrl);
 assert.equal(event.type,'Chamber');
 assert.equal(parseJuilliard((await fixture('wiki-juilliard-event.html')).replace('Return to this page to watch','Tickets only'),juilliardUrl),null);
 assert.equal(parseJuilliard((await fixture('wiki-juilliard-event.html')).replace('Watch the performance on this page','Broadcast elsewhere'),juilliardUrl),null);
 assert.equal(parseJuilliard((await fixture('wiki-juilliard-event.html')).replaceAll('Sonatenabend','Abgesagt: Sonatenabend'),juilliardUrl),null);
 const wind=parseJuilliard(await fixture('wiki-juilliard-wind.html'),'https://www.juilliard.edu/event/185736/juilliard-wind-orchestra');
 assert.equal(wind.start,'2026-10-04T23:00:00.000Z');
 assert.throws(()=>parseJuilliard('<div>Unavailable</div>',juilliardUrl),/changed/);
});

test('Juilliard walks the livestream filter with a ≤10 request detail budget',async()=>{
 const index=await fixture('wiki-juilliard-index.html');
 const detail=await fixture('wiki-juilliard-event.html');
 const wind=await fixture('wiki-juilliard-wind.html');
 const calls=[];
 const events=await adapters.juilliard(async url=>{
  calls.push(url);
  if(url===juilliardIndex||url.includes('calendar'))return index;
  if(url.includes('185736'))return wind;
  if(url.includes('188931'))return detail.replaceAll('Sonatenabend','Jun Shimada, Piano').replace('2026-09-30T18:00:00-04:00','2026-10-01T17:30:00-04:00');
  return detail;
 },now);
 assert.equal(events.length,3);
 assert.equal(calls.length,4); // index + 3 details
 assert.ok(calls.length<=10);
 const source=sources.find(s=>s.id==='juilliard');
 assert.ok(calendar([normalize(events[0],source,now)],now).includes('DTSTART:20260930T220000Z'));
});

test('HMDK / Hugo Wolf competition requires free admission and livestream wording',async()=>{
 const event=parseIhwa(await fixture('wiki-ihwa-event.html'),ihwaUrl);
 assert.equal(event.start,'2026-09-29T12:00:00.000Z');
 assert.equal(event.type,'Competition');
 assert.equal(event.stream_url,'https://www.youtube.com/@liedwettbewerb');
 assert.equal(parseIhwa((await fixture('wiki-ihwa-event.html')).replace('Livestream ins Internet übertragen','Nur vor Ort'),ihwaUrl),null);
 assert.equal(parseIhwa((await fixture('wiki-ihwa-event.html')).replace('Free admission','Tickets required'),ihwaUrl),null);
 assert.throws(()=>parseIhwa('<div>Unavailable</div>',ihwaUrl),/changed/);
});

test('HMDK adapter follows competition round links and skips companion pages',async()=>{
 const index=await fixture('wiki-ihwa-index.html'),detail=await fixture('wiki-ihwa-event.html'),calls=[];
 const events=await adapters['hmdk-stuttgart'](async url=>{
  calls.push(url);
  if(url===ihwaIndex||/\/event\/?$/.test(url))return index;
  const stamp={
   'wettbewerb26-runde1-1':'2026-09-29T14:00:00+02:00',
   'wettbewerb26-runde1-2':'2026-09-30T11:00:00+02:00',
   'wettbewerb26-runde2':'2026-10-01T11:00:00+02:00',
   'wettbewerb26-finale':'2026-10-03T11:00:00+02:00'
  };
  const slug=url.split('/').pop();
  return detail.replace('2026-09-29T14:00:00+02:00',stamp[slug]||stamp['wettbewerb26-runde1-1']).replace('1. Runde (1)',slug);
 },now);
 assert.equal(events.length,4);
 assert.ok(!calls.some(u=>/beyondlied/.test(u)));
 assert.ok(calls.length<=10);
 assert.equal(regionIdForSource(sources.find(s=>s.id==='hmdk-stuttgart')),'europe');
 assert.equal(schoolInfo('hmdk-stuttgart').region,'Europe');
});

test('new wiki-mine schools register in NAM evenings or Europe daytime regions',()=>{
 for(const [id,region] of [['peabody','nam'],['michigan','nam'],['juilliard','nam'],['hmdk-stuttgart','europe']]){
  const source=sources.find(s=>s.id===id);
  assert.ok(source,id);
  assert.equal(regionIdForSource(source),region);
  assert.equal(typeof adapters[id],'function');
 }
 const eastern=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
 // HMDK afternoon CET → morning ET; Juilliard/Peabody/Michigan evenings stay evening ET.
 assert.equal(eastern('2026-09-29T12:00:00.000Z'),'08:00');
 assert.equal(eastern('2026-09-30T22:00:00.000Z'),'18:00');
 assert.equal(eastern('2026-09-30T00:00:00.000Z'),'20:00');
});

test('Peabody and Michigan adapters stay feed/list-first (≤2 requests)',async()=>{
 let peabodyCalls=0,michiganCalls=0;
 await adapters.peabody(async()=>{peabodyCalls++;return JSON.parse(await fixture('wiki-peabody.json'));},now);
 await adapters.michigan(async()=>{michiganCalls++;return fixture('wiki-michigan.html');},now);
 assert.equal(peabodyCalls,1);
 assert.equal(michiganCalls,1);
 assert.ok(adapters.peabody&&peabodyFeed.includes('search=Livestream'));
 assert.ok(michiganIndex.includes('_viewing_options='));
});
