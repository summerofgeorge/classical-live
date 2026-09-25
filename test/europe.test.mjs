import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {liechtensteinCandidates,parseLiechtenstein,parseWeimar,adapters,sources,candidateSources,normalize,collect,zonedTime} from '../scripts/ingest.mjs';
import {calendar,matches} from '../dist/core.js';
const fixture=name=>readFile(new URL(`./fixtures/${name}.html`,import.meta.url),'utf8');
const [list,detail,weimar]=await Promise.all(['liechtenstein-list','liechtenstein-event','weimar-event'].map(fixture));
const now=new Date('2026-09-25T12:00:00Z'),weimarUrl='https://www.hfm-weimar.de/en/visiting/events/calendar/detail/violin-concert';

test('Liechtenstein admits only free upcoming streams, excluding archives and other partners',()=>{
 const entries=liechtensteinCandidates(list+'<div id="body_medienarchiv_divMedien"><a href="/de/Konzerte/900/old">Gratis replay</a></div>');
 assert.equal(entries.length,2);assert.equal(entries[0].start,'2026-10-06T17:00:00.000Z');
 assert.equal(entries[1].start,'2026-10-07T15:45:00.000Z');
 assert.equal(liechtensteinCandidates(list.replaceAll('Gratis','CHF 10')).length,0);
 assert.equal(liechtensteinCandidates(list.replaceAll('Streichquintette von Beethoven und Mozart','Abgesagt: Konzert')).length,1);
 assert.throws(()=>liechtensteinCandidates('<div>Unavailable</div>'));
 assert.throws(()=>liechtensteinCandidates(list.replace('Oktober 2026','Oktober')));
 const event=parseLiechtenstein(detail,entries[0]);
 assert.equal(event.id,'liechtenstein-221');assert.equal(event.type,'Chamber');assert.match(event.program,/Beethoven/);
 assert.throws(()=>parseLiechtenstein(detail.replace('06.10.2026','07.10.2026'),entries[0]));
 assert.throws(()=>parseLiechtenstein(detail.replace('/partner/2/','/partner/3/'),entries[0]));
 assert.equal(parseLiechtenstein(detail.replace('Streichquintette von Beethoven und Mozart','Abgesagt: Konzert'),entries[0]),null);
});

test('Weimar requires an affirmative broadcast announcement with a public link',()=>{
 const event=parseWeimar(weimar,weimarUrl);
 assert.equal(event.start,'2026-11-05T17:00:00.000Z');assert.equal(event.stream_url,'https://www.hfm-weimar.de/');
 assert.equal(event.type,'Competition');assert.match(event.program,/Mozart/);
 assert.equal(parseWeimar(weimar.replace('Auch im LIVESTREAM unter','Konzert vor Ort'),weimarUrl),null);
 assert.equal(parseWeimar(weimar.replace('Auch im LIVESTREAM unter','Nicht im Livestream'),weimarUrl),null);
 assert.equal(parseWeimar(weimar.replace('LOUIS SPOHR Competition','Abgesagt: LOUIS SPOHR Competition'),weimarUrl),null);
 assert.equal(parseWeimar(weimar.replace('href="http://www.hfm-weimar.de"','href="https://ticket.example/buy"'),weimarUrl),null);
 assert.throws(()=>parseWeimar(weimar.replace('05.11.2026','31.11.2026'),weimarUrl));
 assert.throws(()=>parseWeimar('<div>Unavailable</div>',weimarUrl));
});

test('Europe and Eastern dates convert correctly through the different autumn clock changes',()=>{
 const eastern=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
 assert.equal(eastern(zonedTime('2026-10-06T19:00','Europe/Vaduz')),'13:00');
 assert.equal(eastern(zonedTime('2026-10-27T19:00','Europe/Vaduz')),'14:00');
 assert.equal(eastern(zonedTime('2026-11-05T18:00','Europe/Berlin')),'12:00');
 assert.throws(()=>zonedTime('2026-10-25T02:30','Europe/Berlin'));
 assert.throws(()=>zonedTime('2026-03-29T02:30','Europe/Vaduz'));
 for(const [id,raw,stamp] of [['weimar',parseWeimar(weimar,weimarUrl),'20261105T170000Z'],['liechtenstein',parseLiechtenstein(detail,liechtensteinCandidates(list)[0]),'20261006T170000Z']]){
  const event=normalize(raw,[...sources,...candidateSources].find(s=>s.id===id),now);
  assert.ok(matches(event,{source:id,timeZone:'America/New_York'},now));
  assert.ok(calendar([event],now).includes('DTSTART:'+stamp));
 }
});

test('Weimar follows official month links, deduplicates cards, and ignores concerts outside the window',async()=>{
 const index='https://www.hfm-weimar.de/en/visiting/events/calendar';
 const monthLink=stamp=>`<a class="nextmonth" href="?tx_jobase_pi5%5BloadDate%5D=${stamp}">Month</a>`;
 const card=(name,date)=>`<a href="${index}/detail/${name}"><p class="joVeranstaltungsTeaserAdresse">${date} 18:00 Uhr</p><h3 class="joVeranstaltungsTeaserHeadline">Violin concert</h3></a>`;
 const nov=Math.floor(Date.parse('2026-10-31T23:00:00Z')/1000),calls=[];
 const get=async url=>{
  calls.push(url);
  if(url===index)return `<div class="joEventJahr">2026</div>${monthLink(nov)}${monthLink(nov)}<div class="eventlist">${card('oct','26.10.2026')}${card('past','01.09.2026')}</div>`;
  if(url.includes('?'))return `<div class="eventlist">${card('nov','05.11.2026')}${card('nov','05.11.2026')}${card('later','30.11.2026')}</div>`;
  if(url.endsWith('/oct'))return weimar.replace('05.11.2026','26.10.2026');
  if(url.endsWith('/nov'))return weimar;
  assert.fail('Unexpected request: '+url);
 };
 const events=await adapters.weimar(get,new Date('2026-10-01T12:00:00Z'));
 assert.equal(events.length,2);assert.equal(calls.length,4);
 await assert.rejects(()=>adapters.weimar(async()=>'<div class="joEventJahr">2026</div><div class="eventlist"></div>',now),/missing a month/);
});

test('a changed European source retains only previously verified, flagged listings',async()=>{
 const source=candidateSources.find(s=>s.id==='liechtenstein'),event=normalize(parseLiechtenstein(detail,liechtensteinCandidates(list)[0]),source,now);
 const result=await collect({events:[event],sources:[]},new Date('2026-09-26T12:00:00Z'),[source],async()=>'<html>Changed site</html>');
 assert.equal(result.sources[0].status,'error');assert.equal(result.events.length,1);assert.equal(result.events[0].stale,true);
});
