import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {audited,normalize,sources} from '../scripts/ingest.mjs';
import {applyReviewed} from '../scripts/reviewed.mjs';
import {calendar,matches} from '../dist/core.js';
const {parseTexas,parseTemple}=audited.parsers;
const fixture=async name=>readFile(new URL(`./fixtures/${name}.html`,import.meta.url),'utf8');
const [texas,program,temple,unstreamed]=await Promise.all(['ut-austin-event','ut-austin-program','temple-event','temple-unstreamed'].map(fixture));
const texasUrl='https://music.utexas.edu/events/6117-butler-opera-international-competition';
const templeUrl='https://now.temple.edu/events/2026-10-09/mosaic-concert-0';
const now=new Date('2026-09-28T00:00:00Z');

test('Temple does not abandon later pages after an unstreamed page and supports more than 18 candidates',async()=>{
 const base='https://boyer.temple.edu/events';
 const card=(url,date,printed)=>`<section class="teaser__legacy-event" data-gtm-event-datevalue="${date}"><a href="${url}"><p class="date__short">${printed}</p><h2>Concert</h2></a></section>`;
 const page=(cards,next='')=>`<main><ul class="catalog__items">${cards}</ul>${next?`<a rel="next" href="${next}">Next</a>`:''}</main>`;
 const unstreamedUrl='https://now.temple.edu/events/2026-09-29/student-recital-shawn-garrone-oboe';
 const get=async url=>{
  if(url===base)return page(card(unstreamedUrl,'2026-09-29','Sep. 29, 2026 7:30 p.m.'),'?page=1');
  if(url===base+'?page=1')return page(Array.from({length:25},(_,i)=>card(templeUrl+'-'+i,'2026-10-09','Oct. 9, 2026 7:30 p.m.')).join(''));
  return url===unstreamedUrl?unstreamed:temple;
 };
 assert.equal((await audited.adapters.temple(get,now)).length,25);
});

test('UT Austin keeps event subtitles, public streaming evidence and Central time despite paid hall tickets',()=>{
 const event=parseTexas(texas,texasUrl);
 assert.equal(event.title,'Butler Opera International Competition — Finals');
 assert.equal(event.start,'2026-10-01T23:30:00.000Z');assert.equal(event.end,null);
 assert.equal(event.watch_kind,'channel');assert.equal(event.stream_url,'https://www.youtube.com/@BSoMLive');
 assert.equal(parseTexas(program,'https://music.utexas.edu/events/6089-symphony-band').start,'2026-10-04T21:00:00.000Z');
 for(const html of [texas.replaceAll('Streamed Online','In person'),texas.replaceAll('@BSoMLive','@unverified'),texas.replace('>Livestream<','>Recording<'),texas.replace('>Scheduled<','>Canceled<'),texas.replace('>Finals<','>Finals — no livestream<')])assert.equal(parseTexas(html,texasUrl),null);
 assert.throws(()=>parseTexas(texas.replace('2026-10-01T18:30:00-05:00','2026-10-01T18:30:00-06:00'),texasUrl),/offset/);
 assert.throws(()=>parseTexas(texas.replace('Thursday, October 1, 2026','Friday, October 2, 2026'),texasUrl),/disagree/);
 assert.throws(()=>parseTexas('<main>Changed site</main>',texasUrl),/layout/);
});

test('UT Austin follows the streaming filter, skips missing destinations and stops beyond the horizon',async()=>{
 const base=sources.find(s=>s.id==='ut-austin').url,next=base+'&page=1';
 const card=(url,start,link=true)=>`<div class="cofaevent-listing-page-row--main-content"><h2><a href="${url}">Opera</a></h2><time datetime="${start}"></time>${link?'<a href="https://www.youtube.com/@BSoMLive">Livestream</a>':''}</div>`;
 const page=(cards,next)=>`<div class="cofaevent-listing-page">${cards}${next?`<a rel="next" href="${next}">Next</a>`:''}</div>`;
 const pages={[base]:page(card(texasUrl,'2026-10-01T18:30:00-05:00')+card('/events/not-announced','2026-10-02T18:30:00-05:00',false),next),[next]:page(card(texasUrl,'2026-10-01T18:30:00-05:00')+card('/events/later','2026-12-01T18:30:00-06:00'),base+'&page=2'),[texasUrl]:texas};
 const calls=[],get=async url=>{calls.push(url);assert.ok(url in pages,url);return pages[url];};
 assert.equal((await audited.adapters['ut-austin'](get,now)).length,1);assert.equal(calls.length,3);
 pages[base]=page('',base);await assert.rejects(audited.adapters['ut-austin'](get,now),/layout|pagination/);
 pages[base]=page(card(texasUrl,'2026-10-01T18:30:00-05:00'),'?page=1');await assert.rejects(audited.adapters['ut-austin'](get,now),/filter lost/);
});

test('Temple requires an event-specific broadcast and public access, not a generic channel or free hall admission',()=>{
 const event=parseTemple(temple,templeUrl);assert.equal(event.start,'2026-10-09T23:30:00.000Z');assert.equal(event.watch_kind,'channel');
 assert.equal(parseTemple(unstreamed,'https://now.temple.edu/events/2026-09-29/student-recital-shawn-garrone-oboe'),null);
 for(const html of [temple.replace('livestream will be available','recording will be available'),temple.replace('free and open to the public','for invited guests'),temple.replaceAll('@boyercollege','@othercollege'),temple.replace('Mosaic Concert</h1>','Canceled: Mosaic Concert</h1>'),temple.replaceAll('Boyer College of Music and Dance','Other Department')])assert.equal(parseTemple(html,templeUrl),null);
 assert.throws(()=>parseTemple(temple,templeUrl.replace('10-09','10-10')),/disagree/);
 assert.throws(()=>parseTemple(temple.replace('7:30 pm','TBA'),templeUrl),/date format/);
});

test('Temple uses printed local dates through DST while checking the UTC analytics date and keeping occurrences distinct',async()=>{
 const base='https://boyer.temple.edu/events',night='https://now.temple.edu/events/2026-11-07/senior-recital',noon=templeUrl.replace(/-0$/,'');
 const card=(url,date,printed)=>`<section class="teaser__legacy-event" data-gtm-event-datevalue="${date}"><a href="${url}"><p class="date__short">${printed}</p><h2>Mosaic Concert</h2></a></section>`;
 const page=(cards,next)=>`<main><ul class="catalog__items">${cards}</ul>${next?`<a rel="next" href="${next}">Load more</a>`:''}</main>`;
 const pages={[base]:page(card(templeUrl,'2026-10-09','Oct. 9, 2026 7:30 p.m.')+card(noon,'2026-10-09','Oct. 9, 2026 12:00 p.m.'),'?page=1'),[base+'?page=1']:page(card(night,'2026-11-08','Nov. 7, 2026 7:30 p.m.')+card('https://now.temple.edu/events/2026-12-01/later','2026-12-01','Dec. 1, 2026 2:00 p.m.'),'?page=2'),[templeUrl]:temple,[noon]:temple.replace('7:30 pm','12:00 pm'),[night]:temple.replace('Friday, October 9, 2026','Saturday, November 7, 2026')};
 const calls=[],get=async url=>{calls.push(url);assert.ok(url in pages,url);return pages[url];};
 const events=await audited.adapters.temple(get,now);assert.equal(events.length,3);assert.equal(calls.length,5);
 assert.equal(events[2].start,'2026-11-08T00:30:00.000Z');
 const source=sources.find(s=>s.id==='temple'),normalized=events.map(e=>normalize(e,source,now));assert.equal(new Set(normalized.map(e=>e.id)).size,3);
 assert.match(calendar([normalized[2]],now),/DTSTART:20261108T003000Z/);
 pages[base+'?page=1']=page(card(night,'2026-11-09','Nov. 7, 2026 7:30 p.m.'));await assert.rejects(audited.adapters.temple(get,now),/disagree/);
});

test('McGill and Mannes retain browser verification expiry and disclose free registration',async()=>{
 const file=JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8'));
 const payload={...file,sources:file.sources.filter(s=>['mcgill','mannes'].includes(s.id))};
 const checked=new Date(Math.max(...payload.sources.map(s=>Date.parse(s.checked_at))));
 const result=applyReviewed({events:[],sources:[]},payload,checked);
 assert.deepEqual(result.sources.map(s=>s.count),[2,1]);
 const mannes=result.events.find(e=>e.source==='mannes');assert.match(mannes.watch_note,/Free registration required \(\$0 option/);
 assert.equal(mannes.start,'2026-10-04T14:00:00-04:00');
 const mcgill=result.events.find(e=>e.id==='mcgill-374055'),expiry=new Date(mcgill.valid_until);
 assert.equal(matches(mcgill,{timeZone:'America/Toronto'},expiry),false);
 const expired=applyReviewed(result,payload,expiry);assert.equal(expired.events.length,0);assert.ok(expired.sources.every(s=>s.status==='review_due'));
 assert.ok(result.events.every(e=>e.last_verified_at===checked.toISOString()));
});
