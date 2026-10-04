import test from 'node:test';
import assert from 'node:assert/strict';
import {campus,collect,sources,normalize} from '../scripts/ingest.mjs';
import {schoolInfo} from '../dist/schools.js';
const {parseToronto,parseStanford}=campus.parsers;
const torontoUrl='https://music.utoronto.ca/event/noon';
const stanfordUrl='https://music.stanford.edu/events/philharmonia';
const t=(date='October 08, 2026',offer='Livestream available on the')=>`<h1>Thursdays at Noon</h1><div class="o-hero-media__info-date">${date}</div><div class="o-hero-media__info-time">12:10pm - 1:00pm</div><div class="o-hero-media--event__button">Free</div><div class="l-main--event__content"><p>${offer} <a href="https://www.youtube.com/@UofTMusic">Faculty YouTube channel</a></p></div>`;
const s=(date='Saturday November 7th, 2026',times='7:30 - 9:00pm')=>`<article class="event"><h1>Stanford Philharmonia</h1><div class="field-hs-event-date"><div class="field-label">Date and Time</div><div>${date}<br>${times}</div></div><div class="body"><p>Our Fall Concert with a guest composer.</p><ul><li>Beethoven: Symphony No. 1</li></ul><p>General admission $37. This event will be <a href="https://music.stanford.edu/philharmonia_live">livestreamed</a>.</p></div></article>`;
const live='<main><p><a href="https://vimeo.com/event/123456">VIEW THE LIVESTREAM</a></p><p>Our Fall Concert with a guest composer.</p></main>';

test('Stanford omits an announced concert without a player while retaining another confirmed stream',async()=>{
 const base='https://music.stanford.edu/events',other='https://music.stanford.edu/events/other';
 const pages={
  [base]:`<div class="hb-card__title"><a href="${stanfordUrl}">One</a><a href="${other}">Two</a></div>`,
  [stanfordUrl]:s(),[other]:s().replaceAll('philharmonia_live','other_live'),
  'https://music.stanford.edu/philharmonia_live':'<main>Our Fall Concert with a guest composer.</main>',
  'https://music.stanford.edu/other_live':live.replace('/event/123456','/1169395221/a640de2b1c?share=copy')
 };
 const events=await campus.adapters.stanford(async url=>pages[url],new Date('2026-10-04T12:00:00Z'));
 assert.equal(events.length,1);assert.equal(events[0].event_url,other);
});

test('Stanford matches the full opening sentence despite later repertoire spelling corrections',async()=>{
 const first='Experience the enveloping aural phenomenon of echoes in Stanford’s stunning Memorial Church.';
 const event=s().replace('Our Fall Concert with a guest composer.',first+' Join us for Marsh and others.');
 const player=live.replace('Our Fall Concert with a guest composer.',first+' Join us for Morsh and others.');
 const pages={'https://music.stanford.edu/events':`<div class="hb-card__title"><a href="${stanfordUrl}">Chorale</a></div>`,[stanfordUrl]:event,'https://music.stanford.edu/philharmonia_live':player};
 assert.equal((await campus.adapters.stanford(async url=>pages[url],new Date('2026-10-04T12:00:00Z'))).length,1);
 pages['https://music.stanford.edu/philharmonia_live']=player.replace('echoes','singing');
 await assert.rejects(campus.adapters.stanford(async url=>pages[url],new Date('2026-10-04T12:00:00Z')),/no longer confirms/);
});
test('Toronto requires event-specific free public viewing evidence and converts both Eastern offsets',()=>{
 assert.equal(parseToronto(t(),torontoUrl).start,'2026-10-08T16:10:00.000Z');
 assert.equal(parseToronto(t('November 08, 2026'),torontoUrl).end,'2026-11-08T18:00:00.000Z');
 for(const html of [t().replace('>Free<','>Paid<'),t().replace('Thursdays at Noon','POSTPONED: Thursdays at Noon'),t(undefined,'No livestream available on the'),t(undefined,'Recording available on the'),t().replace('@UofTMusic','@unverified'),t().replace('l-main--event__content','related-events')]){
  if(html.includes('related-events'))assert.throws(()=>parseToronto(html,torontoUrl),/layout/);else assert.equal(parseToronto(html,torontoUrl),null);
 }
 assert.throws(()=>parseToronto(t().replace('1:00pm','11:00am'),torontoUrl),/precedes/);
 assert.throws(()=>parseToronto(t('October 08'),torontoUrl),/date/);
});
test('Toronto paginates, skips private and paid listings, deduplicates and stops beyond the dated horizon',async()=>{
 const card=(path,category='Free - Public - Concert')=>`<div class="m-listing-item--events-condensed"><div class="m-listing-item--events-condensed__category">${category}</div><h3><a href="/event/${path}">Recital</a></h3></div>`;
 const base='https://music.utoronto.ca/events',calls=[];
 const pages={[base]:card('noon')+card('private','Free - Current Students - Workshop')+card('paid','Public - Concert')+'<a rel="next" href="?page=1">Next</a>',[base+'?page=1']:card('noon')+card('future'),[torontoUrl]:t(), 'https://music.utoronto.ca/event/future':t('December 08, 2026')};
 const events=await campus.adapters.toronto(async url=>{calls.push(url);assert.ok(url in pages,url);return pages[url];},new Date('2026-09-27T12:00:00Z'));
 assert.equal(events.length,1);assert.equal(calls.length,4);
 await assert.rejects(campus.adapters.toronto(async()=>'<main>Broken page</main>',new Date()),/layout/);
});
test('Stanford uses the dated event, permits paid hall admission, and rejects restricted or ambiguous broadcasts',()=>{
 const event=parseStanford(s(),stanfordUrl);assert.equal(event.start,'2026-11-08T03:30:00.000Z');assert.equal(event.end,'2026-11-08T05:00:00.000Z');
 assert.equal(parseStanford(s('Saturday October 10th, 2026'),stanfordUrl).start,'2026-10-11T02:30:00.000Z');
 assert.equal(parseStanford(s().replace('This event will be','This event will not be'),stanfordUrl),null);
 assert.equal(parseStanford(s().replace('>livestreamed<','>recorded<'),stanfordUrl),null);
 assert.equal(parseStanford(s().replace('This event will be','A private livestream. This event will be'),stanfordUrl),null);
 assert.throws(()=>parseStanford(s(undefined,'11:30 - 1:00pm'),stanfordUrl),/Ambiguous/);
});
test('Stanford matches the current program, detects changed access, and stops at the date horizon',async()=>{
 const base='https://music.stanford.edu/events',index=`<div class="hb-card__title"><a href="${stanfordUrl}">Philharmonia</a></div><div class="hb-card__title"><a href="/events/future">Orchestra</a></div>`;
 const pages={[base]:index,[stanfordUrl]:s(),'https://music.stanford.edu/events/future':s('Friday December 4th, 2026'),'https://music.stanford.edu/philharmonia_live':live};
 const now=new Date('2026-09-27T12:00:00Z'),get=async url=>{assert.ok(url in pages,url);return pages[url];};
 const events=await campus.adapters.stanford(get,now);assert.equal(events.length,1);assert.ok(!('description' in events[0]));
 pages['https://music.stanford.edu/philharmonia_live']=live.replace('Fall Concert','Spring Concert');
 await assert.rejects(campus.adapters.stanford(get,now),/no longer confirms/);
 pages['https://music.stanford.edu/philharmonia_live']=live+'<main>Password required</main>';
 await assert.rejects(campus.adapters.stanford(get,now),/no longer confirms/);
});
test('new schools integrate with location metadata and failed-source expiry',async()=>{
 const now=new Date('2026-09-27T12:00:00Z'),registry=sources.filter(s=>['toronto','stanford'].includes(s.id));
 assert.equal(registry.length,2);assert.equal(schoolInfo('toronto').country,'Canada');assert.equal(schoolInfo('stanford').region,'US West');
 const old=normalize(parseToronto(t(),torontoUrl),registry.find(s=>s.id==='toronto'),now);
 const result=await collect({sources:[],events:[old]},now,registry,async()=>{throw new Error('Offline');});
 assert.equal(result.events.length,1);assert.equal(result.events[0].stale,true);assert.ok(result.sources.every(s=>s.status==='error'));
});
