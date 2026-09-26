import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {american,adapters,sources,normalize,collect} from '../scripts/ingest.mjs';
import {blairFeed,iowaIndex} from '../scripts/american.mjs';
import {schoolInfo} from '../dist/schools.js';
import {calendar} from '../dist/core.js';
const fixture=name=>readFile(new URL('./fixtures/american-'+name,import.meta.url),'utf8');
const {parseColorado,coloradoPage,parseBlair,parseIowa}=american.parsers;
const now=new Date('2026-09-26T09:00:00Z');
const cuUrl='https://cupresents.org/show-details/faculty-tuesdays-andrew-lynge-percussion';
const iowaUrl='https://music.uiowa.edu/event/38369/0';

test('Yale validates its next broadcast against a public event with no purchase or registration',async()=>{
 const {yaleCandidate,parseYale}=american.parsers,data=JSON.parse(await fixture('yale.json')),html=await fixture('yale.html'),c=yaleCandidate(data),e=parseYale(html,c);
 assert.equal(e.title,'Yale Guitar Studio celebrates Sérgio Assad');assert.equal(e.start,'2026-09-27T19:00:00.000Z');assert.equal(e.event_url,'https://music-tickets.yale.edu/993/27420');
 assert.equal(e.stream_url,'https://music.yale.edu/live');assert.equal(parseYale(html.replace('no purchase or registration required','registration required'),c),null);
 assert.equal(parseYale(html.replace('no purchase or registration required','no purchase or registration required; password protected'),c),null);
 assert.throws(()=>parseYale('<p>Security check</p>',c),/unavailable/);
 assert.throws(()=>parseYale(html.replace('3:00PM','4:00PM'),c),/disagree/);
 assert.equal(yaleCandidate({nid:0,output:'',date:''}),null);assert.throws(()=>yaleCandidate({}),/API changed/);
 assert.equal(yaleCandidate({...data,output:data.output.replaceAll('Yale Guitar Studio','CANCELED Yale Guitar Studio')}),null);
 assert.throws(()=>yaleCandidate({...data,output:data.output.replace('https://music-tickets.yale.edu/993/27420','https://example.com/pay')}),/link changed/);
 const calls=[],events=await adapters.yale(async(url,json)=>{calls.push(url);return json?data:html;},now);assert.equal(events.length,1);assert.equal(calls.length,2);
 assert.deepEqual(await adapters.yale(async()=>data,new Date('2027-01-01')),[]);
 const source=sources.find(s=>s.id==='yale'),event=normalize(e,source,now);assert.match(calendar([event],now),/DTSTART:20260927T190000Z/);assert.equal(schoolInfo('yale').size,'unknown');
});

test('Colorado requires a free, dated stream offer and cross-checks Mountain daylight time',async()=>{
 const html=await fixture('colorado.html'),events=parseColorado(html,cuUrl);
 assert.equal(parseColorado(html.replace('href="/livestreaming"','href="https://cupresents.org/cu-boulder-college-of-music-Livestream/"'),cuUrl).length,1);
 const noOfferLink=load(html),script=noOfferLink('script[type="application/ld+json"]'),data=JSON.parse(script.text());data.offers.forEach(o=>delete o.url);script.text(JSON.stringify(data));assert.equal(parseColorado(noOfferLink.html(),cuUrl).length,1);
 assert.equal(events.length,1);assert.equal(events[0].start,'2026-09-30T01:30:00.000Z');assert.match(events[0].title,/Andrew Lynge/);
 assert.equal(parseColorado(html.replace('Free, no tickets required','$25'),cuUrl).length,0);
 assert.equal(parseColorado(html.replaceAll('Watch Here','Buy Tickets'),cuUrl).length,0);
 assert.equal(parseColorado(html.replace('Faculty Tuesdays','CANCELED Faculty Tuesdays'),cuUrl).length,0);
 assert.equal(parseColorado(html.replace('Faculty Tuesdays','Takács Quartet'),cuUrl).length,0);
 assert.equal(parseColorado(html.replace('Faculty Tuesdays','Jazz Ensemble'),cuUrl).length,0);
 assert.throws(()=>parseColorado(html.replaceAll('-06:00','-07:00'),cuUrl),/missing|disagrees/);
 assert.throws(()=>parseColorado(html.replaceAll('7:30 p.m.','8:30 p.m.'),cuUrl),/missing/);
 assert.throws(()=>parseColorado(html.replace('href="/livestreaming"','href="https://example.com/pay"'),cuUrl),/link changed/);
 const winter=html.replaceAll('2026-09-29','2026-11-03').replaceAll('Sept. 29','Nov. 3').replaceAll('-06:00','-07:00');
 assert.equal(parseColorado(winter,cuUrl)[0].start,'2026-11-04T02:30:00.000Z');
});

test('Colorado public pagination rejects changed/incomplete feeds and excludes unrelated productions',async()=>{
 const data=JSON.parse(await fixture('colorado.json')),p=coloradoPage(data,1);
 assert.ok(p.urls.includes(cuUrl));assert.ok(!p.urls.some(u=>/todd|takacs|takács|jazz|rumors|student-recitals-in|gamelan/.test(u)));
 assert.throws(()=>coloradoPage({...data,currentPage:2},1),/pagination/);
 assert.throws(()=>coloradoPage({...data,lastPage:7},1),/pagination/);
 assert.throws(()=>coloradoPage({...data,newHtml:''},1),/empty/);
 assert.deepEqual(coloradoPage({...data,newHtml:'<p>No Shows Found</p>'},1).urls,[]);
 const $=load(data.newHtml);$('.show-item').filter((i,e)=>!$(e).find('a.read-more-btn').toArray().some(a=>$(a).attr('href')===cuUrl)).remove();
 const calls=[],html=await fixture('colorado.html');
 const events=await adapters.colorado(async(url,json)=>{calls.push(url);return json?{...data,currentPage:new URL(url).searchParams.get('page'),lastPage:2,newHtml:$('body').html()}:html;},now);
 assert.equal(events.length,1);assert.equal(calls.filter(u=>u===cuUrl).length,1);assert.equal(calls.filter(u=>u.includes('page=2')).length,1);
});

test('Colorado retains distinct same-day performances but deduplicates duplicate rows',async()=>{
 const $=load(await fixture('colorado.html'));const row=$('.sd-tickets-list-item').filter((i,e)=>$(e).text().includes('Live Streaming')).first();
 row.after(row.clone());assert.equal(parseColorado($.html(),cuUrl).length,1);
 $('.sd-tickets-list-item').last().find('.sdt-time').text('9:30 p.m.');
 const script=$('script[type="application/ld+json"]'),meta=JSON.parse(script.text()),offer=meta.offers.find(o=>o.url);
 meta.offers.push({...offer,validFrom:offer.validFrom.replace('19:30','21:30')});script.text(JSON.stringify(meta));
 const events=parseColorado($.html(),cuUrl),source=sources.find(s=>s.id==='colorado');
 assert.equal(events.length,2);assert.equal(new Set(events.map(e=>normalize(e,source,now).id)).size,2);
});

test('Blair requires positive stream and free evidence, excludes jazz, and converts both Central offsets',async()=>{
 const data=JSON.parse(await fixture('blair.json')),events=parseBlair(data,now);
 assert.equal(events.length,3);assert.equal(events[0].start,'2026-09-30T00:30:00.000Z');
 assert.equal(events.find(e=>e.title.includes('Claire')).start,'2026-11-04T01:30:00.000Z');
 assert.ok(events.every(e=>e.stream_url==='https://blair.vanderbilt.edu/livestreams/'));
 const e=data.find(e=>e.id===104197);
 for(const change of [{is_canceled:1},{title:'Jazz Recital'},{description:e.description.replace('free event','ticketed event')},{description:e.description.replace('Watch the livestream','Past recordings')},{description:e.description.replace('http://vu.edu/livestream','javascript:alert(1)')},{description:e.description+'<p>Password required for private stream</p>'}])assert.deepEqual(parseBlair([{...e,...change}],now),[]);
 assert.equal(parseBlair([{...e,description:e.description+'<p>Includes classical music influenced by jazz.</p>'}],now).length,1);
 assert.equal(parseBlair([e,e],now).length,1);
 assert.throws(()=>parseBlair([{...e,date_ts:e.date_ts+3600}],now),/disagree/);
 assert.throws(()=>parseBlair([{...e,timezone:'America/New_York'}],now),/timezone/);
 assert.throws(()=>parseBlair(Array(500).fill(e),now),/budget/);
 assert.throws(()=>parseBlair({},now),/changed/);assert.deepEqual(parseBlair([],now),[]);
 const later=parseBlair([e],new Date('2027-01-01'));assert.deepEqual(later,[]);
 assert.equal((await adapters.blair(async(url,json)=>{assert.equal(url,blairFeed);assert.equal(json,true);return data;},now)).length,3);
});

test('Iowa checks individual broadcast evidence and cancellation, not generic site links',async()=>{
 const html=await fixture('iowa.html'),e=parseIowa(html,iowaUrl);
 assert.equal(e.start,'2026-09-27T20:00:00.000Z');assert.equal(e.stream_url,iowaIndex);
 assert.equal(parseIowa(html.replace('Key Change:','CANCELED Key Change:'),iowaUrl),null);
 assert.equal(parseIowa(html.replace('Concert can be viewed via livestream here','Related music resources'),iowaUrl),null);
 assert.equal(parseIowa(html.replaceAll(iowaIndex,'https://example.com/subscribe'),iowaUrl),null);
 assert.throws(()=>parseIowa(html.replace('Sunday, September 27, 2026 3:00pm','Sunday, September 27, 3:00pm'),iowaUrl),/year/);
 assert.throws(()=>parseIowa('<h1>Layout changed</h1>',iowaUrl),/layout/);
 const winter=html.replace('Sunday, September 27, 2026 3:00pm','Sunday, November 8, 2026 3:00pm');assert.equal(parseIowa(winter,iowaUrl).start,'2026-11-08T21:00:00.000Z');
 const eleanor=parseIowa(await fixture('iowa-eleanor.html'),'https://music.uiowa.edu/event/38177/0');assert.match(eleanor.title,/Women’s Poetry/);assert.equal(eleanor.start,'2026-09-26T20:00:00.000Z');
});

test('Iowa follows only its broadcast list, deduplicates links and handles genuine empty schedules',async()=>{
 const html=await fixture('iowa.html'),calls=[];
 const index=`<div id="upcoming-livestreams"><a href="/event/38369/0">Concert</a><a href="/event/38369/0">Details</a></div><a href="/event/999/0">Other calendar event</a>`;
 const events=await adapters.iowa(async url=>{calls.push(url);return url===iowaIndex?index:html;},now);
 assert.equal(events.length,1);assert.equal(calls.length,2);
 assert.deepEqual(await adapters.iowa(async()=>'<div id="upcoming-livestreams">No upcoming events</div>',now),[]);
 await assert.rejects(adapters.iowa(async()=>'<div id="upcoming-livestreams"></div>',now),/empty/);
});

test('new American schools use the shared source-failure retention and healthy withdrawal rules',async()=>{
 const source=sources.find(s=>s.id==='iowa'),raw=parseIowa(await fixture('iowa.html'),iowaUrl),previous={sources:[source],events:[normalize(raw,source,now)]};
 const broken=await collect(previous,now,[source],async()=>{}, {iowa:async()=>{throw new Error('changed layout');}});
 assert.equal(broken.sources[0].status,'error');assert.equal(broken.events[0].stale,true);
 const healthy=await collect(previous,now,[source],async()=>{}, {iowa:async()=>[]});assert.equal(healthy.events.length,0);
});

test('American directory metadata and downloaded calendars preserve school scope and correct UTC',async()=>{
 assert.equal(schoolInfo('colorado').size,'unknown');assert.equal(schoolInfo('iowa').enrollment.students,450);assert.equal(schoolInfo('blair').enrollment.students,245);
 for(const id of ['colorado','blair','iowa'])assert.equal(schoolInfo(id).country,'United States');
 const source=sources.find(s=>s.id==='iowa'),e=normalize(parseIowa(await fixture('iowa.html'),iowaUrl),source,now),ics=calendar([e],now);
 assert.match(ics,/DTSTART:20260927T200000Z/);assert.match(ics,/music.uiowa.edu/);
 assert.equal(e.id,normalize(e,source,new Date('2026-09-27')).id);
});
