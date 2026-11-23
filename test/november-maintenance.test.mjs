import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {adapters,american,conservatories,parseMsm,prioritySchools} from '../scripts/ingest.mjs';

// Reduced official page fragments captured on November 23, 2026.
const f=JSON.parse(await readFile(new URL('./fixtures/november-layouts.json',import.meta.url),'utf8'));
const now=new Date('2026-11-23T12:00:00Z');

test('Bard accepts a full date without a weekday and the separate time field',()=>{
 const parse=html=>prioritySchools.parsers.parseBard(html,'https://www.bard.edu/conservatory/events/noon-concert-series-2026-i');
 assert.equal(parse(f.bard).start,'2026-11-30T17:00:00.000Z');
 assert.equal(parse(f.bard.replace('November 30, 2026','Monday, November 30, 2026')).start,'2026-11-30T17:00:00.000Z');
 assert.throws(()=>parse(f.bard.replace('November 30, 2026','Tuesday, November 30, 2026')),/weekday/);
 assert.throws(()=>parse(f.bard.replace('November 30, 2026','November 30')),/year/);
 assert.throws(()=>parse(f.bard.replace('November 30, 2026','November 31, 2026')),/Invalid calendar/);
 const $=load(f.bard);$('.time').text('Time to be announced');
 assert.throws(()=>parse($.html()),/clock time/);
 assert.equal(parse(f.bard.replace('Livestreaming on the Conservatory YouTube Channel','Campus admission only')),null);
});

test('BU ignores outdated weekday typos without accepting conflicting current dates',async()=>{
 const events=await adapters.bu(async()=>f.bu,now);
 assert.equal(events.length,1);
 assert.equal(events[0].title,'All-Campus Orchestra/Concert Band');
 assert.equal(events[0].start,'2026-12-06T00:30:00.000Z');
 // The same incorrect November 12 row must still fail while in the window.
 await assert.rejects(adapters.bu(async()=>f.bu,new Date('2026-11-11T12:00:00Z')),/weekday/);
 assert.throws(()=>conservatories.parsers.parseBu(f.bu.replace('Saturday, December 5','Friday, December 5'),now),/weekday/);
 assert.deepEqual(await adapters.bu(async()=>f.bu,new Date('2027-01-01T12:00:00Z')),[]);
});

test('Colorado accepts the new weekday prefix but checks it and the Mountain offset',async()=>{
 const html=await readFile(new URL('./fixtures/american-colorado.html',import.meta.url),'utf8');
 const parse=html=>american.parsers.parseColorado(html,'https://cupresents.org/show-details/faculty-tuesdays-andrew-lynge-percussion');
 const $=load(html);$('.sdt-date').each((i,e)=>$(e).prepend('Tue, '));
 const updated=$.html();
 assert.equal(parse(updated)[0].start,'2026-09-30T01:30:00.000Z');
 assert.throws(()=>parse(updated.replaceAll('Tue, ','Wed, ')),/missing or ambiguous/);
 assert.throws(()=>parse(updated.replaceAll('-06:00','-07:00')),/missing|disagrees/);
 const winter=updated.replaceAll('2026-09-29','2026-12-01').replaceAll('Sept. 29','Dec. 1').replaceAll('-06:00','-07:00');
 assert.equal(parse(winter)[0].start,'2026-12-02T02:30:00.000Z');
});

test('MSM reads the new upcoming grid, including show-more cards, without importing archives',()=>{
 const events=parseMsm(f.msm);
 assert.equal(events.length,2);
 assert.equal(events[0].title,'MSM Wind Ensemble');
 assert.equal(events[0].start,'2026-11-24T00:30:00.000Z');
 assert.equal(events[0].stream_url,'https://www.msmnyc.edu/livestream/wind-ensemble-2026-11-23/');
 assert.ok(events[1].title.includes('Donny McCaslin'));
 assert.equal(parseMsm(f.msm.replace('<h2>MSM Wind Ensemble','<h2>Canceled: MSM Wind Ensemble')).length,1);
 assert.throws(()=>parseMsm(f.msm.replaceAll('data-list="upcoming"','data-list="archive"')),/list missing/);
 assert.throws(()=>parseMsm(f.msm.replaceAll('livestream-grid','unknown-grid')),/layout changed/);
 assert.throws(()=>parseMsm(f.msm.replace('<date>November 23, 2026</date>','<date>November 23</date>')),/fields missing/);
 assert.deepEqual(parseMsm('<div class="livestream-section" data-list="upcoming"><div class="livestream-grid">No upcoming events</div></div>'),[]);
 assert.throws(()=>parseMsm('<div class="livestream-section" data-list="upcoming"><div class="livestream-grid"></div></div>'),/layout changed/);
});
