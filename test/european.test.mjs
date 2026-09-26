import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {european,adapters,sources,normalize,collect} from '../scripts/ingest.mjs';
import {brucknerIndex} from '../scripts/european.mjs';
import {schoolInfo} from '../dist/schools.js';
import {calendar} from '../dist/core.js';
const fixture=name=>readFile(new URL('./fixtures/europe-'+name,import.meta.url),'utf8');
const {parseUdk,parseSofia,parseBruckner,udkResults}=european.parsers;
const now=new Date('2026-09-26T09:00:00Z');
const udkUrl='https://www.udk-berlin.de/veranstaltung/corporate-concert-3/';
const sofiaUrl='https://www.escuelasuperiordemusicareinasofia.es/evento/ciclo-da-camera-grupos-de-cuerdas/';
const brucknerUrl='https://www.bruckneruni.ac.at/de/besuchen/events/detail/recital-10234';

test('UdK reads all dated occurrences, requires explicit broadcast evidence and preserves stable distinct IDs',async()=>{
 const html=await fixture('udk.html'),events=parseUdk(html,udkUrl),source=sources.find(s=>s.id==='udk');
 assert.equal(events.length,4);assert.equal(events[0].start,'2026-11-04T18:30:00.000Z');assert.equal(events[0].type,'Chamber');
 assert.equal(new Set(events.map(e=>normalize(e,source,now).id)).size,4);
 assert.equal(normalize(events[0],source,now).id,normalize(events[0],source,new Date('2026-09-27')).id);
 assert.equal(parseUdk(html.replaceAll('Zum Livestream','More information'),udkUrl).length,0);
 for(const word of ['Abgesagt','Jazz','Gottesdienst'])assert.equal(parseUdk(html.replace('Corporate Concert',word+' Corporate Concert'),udkUrl).length,0);
 assert.throws(()=>parseUdk(html.replace('19:30','Time TBA'),udkUrl),/clock/);
 const summer=html.replace('2026-11-04 00:00','2026-10-24 00:00');assert.equal(parseUdk(summer,udkUrl)[0].start,'2026-10-24T17:30:00.000Z');
});

test('UdK API handles pagination, deduplicates search hits and applies the actual 45-day window',async()=>{
 const api=JSON.parse(await fixture('udk.json')),event=await fixture('udk.html'),calls=[];
 const initial=api.content.colPos0[0].content.data.documents;
 initial.list.results=initial.list.results.filter(r=>r.url==='/veranstaltung/corporate-concert-3/');initial.list.count=initial.list.results.length;initial.pagination.numberOfPages=2;
 const events=await adapters.udk(async(url,json)=>{calls.push(url);if(json){const p=structuredClone(api);p.content.colPos0[0].content.data.documents.pagination.current=Number(new URL(url).searchParams.get('search[page]')||1);return p;}assert.equal(url,udkUrl);return event;},now);
 assert.equal(events.length,1);assert.equal(calls.filter(u=>u===udkUrl).length,1);
 assert.equal(calls.filter(u=>u.includes('search%5Bpage%5D=2')).length,2);
 const bad=structuredClone(api);bad.content.colPos0[0].content.data.documents.pagination.current=2;
 assert.throws(()=>udkResults(bad,1),/pagination/);assert.throws(()=>udkResults({},1),/changed/);
 const docs=bad.content.colPos0[0].content.data.documents;docs.pagination={current:1,numberOfPages:7};assert.throws(()=>udkResults(bad,1),/budget/);
});

test('Reina Sofía preserves Spanish and Unicode, separates ticketed seats from the announced public video',async()=>{
 const html=await fixture('sofia.html'),e=parseSofia(html,sofiaUrl);
 assert.equal(e.title,'Ciclo Da Camera: Trío Archai y Cuarteto Ineo');assert.equal(e.start,'2026-09-26T10:00:00.000Z');assert.equal(e.watch_kind,'channel');
 assert.equal(parseSofia(html.replace('retransmitirá en directo','no se retransmitirá en directo'),sofiaUrl),null);
 assert.equal(parseSofia(html.replace('retransmitirá en directo','emitirá por Radio Clásica'),sofiaUrl),null);
 assert.equal(parseSofia(html.replace('https://www.youtube.com/escuelademusicareinasofia','javascript:alert(1)'),sofiaUrl),null);
 assert.equal(parseSofia(html.replace('Este concierto se','Cancelado. Este concierto se'),sofiaUrl),null);
 assert.throws(()=>parseSofia(html.replace('26 de septiembre','31 de septiembre'),sofiaUrl),/Invalid|Nonexistent/);
 assert.equal(parseSofia(html.replace('26 de septiembre','26 de octubre'),sofiaUrl).start,'2026-10-26T11:00:00.000Z');
});

test('Reina Sofía follows bounded agenda pagination and does not duplicate the same concert',async()=>{
 const index=await fixture('sofia-index.html'),event=await fixture('sofia.html'),$=load(index);
 const card=$('.e-loop-item').first().prop('outerHTML');const page=(next)=>`<div class="evnt-encuentro-filter-items">${card}${card}</div>${next?'<div class="evnt-encuentro-paginaiton-block"><a class="next" href="/agenda/page/2/">Next</a></div>':''}`;
 const calls=[];const events=await adapters['reina-sofia'](async url=>{calls.push(url);return url===sofiaUrl?event:page(!url.includes('/page/2/'));},now);
 assert.equal(events.length,1);assert.equal(calls.filter(u=>u===sofiaUrl).length,1);assert.equal(calls.length,3);
 assert.equal((await adapters['reina-sofia'](async url=>url===sofiaUrl?event:page(false),new Date('2026-10-01'))).length,0);
 await assert.rejects(()=>adapters['reina-sofia'](async url=>url===sofiaUrl?event:page(true),now),/pagination/);
});

test('Bruckner requires musical tags and a current explicit stream link; DD.MM dates use Vienna daylight saving',async()=>{
 const html=await fixture('bruckner.html'),e=parseBruckner(html,brucknerUrl);
 assert.equal(e.start,'2026-10-19T18:00:00.000Z');assert.match(e.title,/Silvia Roca Gómez/);assert.equal(e.type,'Recital');
 assert.equal(parseBruckner(html.replace('class="livestream-link"','class="ordinary-link"'),brucknerUrl),null);
 assert.equal(parseBruckner(html.replace('Prüfungskonzert, Künstlerische Schlussperformance','Tanz'),brucknerUrl),null);
 assert.equal(parseBruckner(html.replace('Künstlerische Schlussperformance Kontrabass','Abgesagt Künstlerische Schlussperformance Kontrabass'),brucknerUrl),null);
 assert.equal(parseBruckner(html.replace('19.10.2026','06.11.2026'),brucknerUrl).start,'2026-11-06T19:00:00.000Z');
 assert.throws(()=>parseBruckner(html.replace('19.10.2026 - 20:00','19.10.2026 - 21:00'),brucknerUrl),/disagrees/);
 assert.throws(()=>parseBruckner(html.replace('19.10.2026','31.02.2026'),brucknerUrl),/Invalid|Nonexistent/);
});

test('Bruckner respects retracted stream labels and rejects newly introduced pagination',async()=>{
 const html=await fixture('bruckner.html'),index=`<main><div class="events-full-list"><a class="event-item" href="${brucknerUrl}">Recital + Livestream</a></div><ul class="pagination"><a class="disabled" href="#">1</a></ul></main>`;
 assert.equal((await adapters.bruckner(async url=>url===brucknerIndex?index:html,now)).length,1);
 assert.equal((await adapters.bruckner(async url=>url===brucknerIndex?index:html.replace('livestream-link','removed'),now)).length,0);
 await assert.rejects(()=>adapters.bruckner(async()=>index.replace('class="disabled"',''),now),/pagination/);
});

test('European source failures keep recent verified data visibly stale, and healthy removal clears it',async()=>{
 const source=sources.find(s=>s.id==='reina-sofia'),event=normalize(parseSofia(await fixture('sofia.html'),sofiaUrl),source,now);
 const previous={sources:[source],events:[event]};
 const failed=await collect(previous,now,[source],async()=>'',{[source.id]:async()=>{throw new Error('changed layout');}});
 assert.equal(failed.sources[0].status,'error');assert.equal(failed.events[0].stale,true);
 const removed=await collect(previous,now,[source],async()=>'',{[source.id]:async()=>[]});assert.equal(removed.events.length,0);
});

test('New European schools participate in geographic and size filters; calendar downloads preserve accents and UTC',async()=>{
 assert.equal(schoolInfo('udk').country,'Germany');assert.equal(schoolInfo('bruckner').size,'unknown');assert.equal(schoolInfo('reina-sofia').size,'small');
 const source=sources.find(s=>s.id==='reina-sofia'),event=normalize(parseSofia(await fixture('sofia.html'),sofiaUrl),source,now),ics=calendar([event],now);
 assert.match(ics,/DTSTART:20260926T100000Z/);assert.match(ics,/Trío Archai/);assert.match(ics,/youtube.com/);
 assert.equal(sources.filter(s=>s.id==='weimar').length,1);assert.equal(sources.filter(s=>s.id==='rcm').length,1);
});
