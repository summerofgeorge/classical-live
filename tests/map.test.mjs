import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {schoolSummaries, filterSchools, mapRegion} from '../dist/map-data.js';
import {schools} from '../dist/schools.js';
import {locations} from '../dist/school-locations.js';

const now=new Date('2026-11-23T20:00:00Z');
const event=(id,start,extra={})=>({id,source:'curtis',title:id,start,end:null,event_url:'https://example.org/concert',stream_url:'https://example.org/watch',last_verified_at:now.toISOString(),...extra});
const data=events=>({sources:[{id:'curtis',name:'Curtis Institute of Music'},{id:'rcm',name:'Royal College of Music'}],events});

test('map next concert excludes ended events, orders dates, and preserves empty schools',()=>{
  const result=schoolSummaries(data([
    event('later','2026-11-25T20:00:00Z'),event('ended today','2026-11-23T18:00:00Z'),
    event('next','2026-11-24T20:00:00Z'),event('ended explicitly','2026-11-23T19:45:00Z',{end:now.toISOString()})
  ]),now);
  assert.equal(result[0].next.id,'next');assert.equal(result[0].events.length,2);
  assert.equal(result[1].next,null);assert.equal(result[1].events.length,0);
  assert.ok(result[0].location);assert.equal(result[0].mapRegion,'North America');
});

test('in-progress concert is retained, including an overnight event',()=>{
  const earlier=new Date('2026-11-23T00:30:00Z');
  const result=schoolSummaries(data([event('ongoing','2026-11-22T23:45:00Z',{last_verified_at:'2026-11-22T20:00:00Z'})]),earlier);
  assert.equal(result[0].next.id,'ongoing');
  assert.equal(schoolSummaries(data([event('ongoing','2026-11-23T19:00:00Z')]),now)[0].next.id,'ongoing');
});

test('expired, future-dated, missing and malformed verification cannot become the next concert',()=>{
  const candidates=[
    event('expired','2026-11-24T20:00:00Z',{last_verified_at:'2026-11-09T20:00:00Z'}),
    event('future verification','2026-11-24T20:00:00Z',{last_verified_at:'2026-11-24T10:00:00Z'}),
    event('invalid verification','2026-11-24T20:00:00Z',{last_verified_at:'bad'}),
    event('stale without verification','2026-11-24T20:00:00Z',{last_verified_at:undefined,stale:true}),
    event('manual expired','2026-11-24T20:00:00Z',{valid_until:now.toISOString()}),
    event('manual invalid','2026-11-24T20:00:00Z',{valid_until:'bad'}),
    event('retained but valid','2026-11-24T20:00:00Z',{last_verified_at:'2026-11-20T20:00:00Z',stale:true})
  ];
  assert.deepEqual(schoolSummaries(data(candidates),now)[0].events.map(e=>e.id),['retained but valid']);
});

test('bad dates, missing titles, credential URLs and non-HTTPS links are omitted',()=>{
  const candidates=[event('bad start','bad'),event('bad end','2026-11-24T20:00:00Z',{end:'bad'}),
    event('bad watch','2026-11-24T20:00:00Z',{stream_url:'javascript:alert(1)'}),
    event('bad details','2026-11-24T20:00:00Z',{event_url:'https://user:pass@example.org/'}),
    event('empty title','2026-11-24T20:00:00Z',{title:''}),event('valid','2026-11-24T20:00:00Z')];
  assert.deepEqual(schoolSummaries(data(candidates),now)[0].events.map(e=>e.id),['valid']);
});

test('school search combines words, ignores accents and retains schools without concerts by default',()=>{
  const candidates=[{name:'McGill Schulich',city:'Montréal, Quebec',country:'Canada',mapRegion:'North America',next:{}},
    {name:'Royal College of Music',city:'London',country:'United Kingdom',mapRegion:'Europe',next:null}];
  assert.equal(filterSchools(candidates,{query:' canada MONTREAL '})[0].name,'McGill Schulich');
  assert.equal(filterSchools(candidates,{query:'london'}).length,1);
  assert.equal(filterSchools(candidates,{region:'Europe',scheduled:true}).length,0);
  assert.equal(filterSchools(candidates,{query:'zzzz'}).length,0);
  assert.equal(mapRegion({region:'Oceania',country:'Australia'}),'Asia-Pacific');
  assert.equal(mapRegion({region:'Asia',country:'Japan'}),'Asia-Pacific');
});

test('every published school has reviewed city coordinates and same-city schools remain distinct',async()=>{
  const published=JSON.parse(await readFile(new URL('../dist/events.json',import.meta.url),'utf8'));
  for(const id of new Set([...Object.keys(schools),...published.sources.map(s=>s.id)])){
    const p=locations[id];assert.ok(p,`Missing map location for ${id}`);
    assert.ok(Number.isFinite(p.lat)&&Math.abs(p.lat)<=85,id);
    assert.ok(Number.isFinite(p.lon)&&Math.abs(p.lon)<=180,id);
    assert.ok(Number.isInteger(p.geonames_id)&&p.geonames_id>0,id);
  }
  assert.deepEqual(locations.msm,locations.juilliard);
  const result=schoolSummaries({sources:[{id:'msm',name:'MSM'},{id:'juilliard',name:'Juilliard'}],events:[]},now);
  assert.equal(result.length,2);assert.notEqual(result[0].id,result[1].id);
  // Guard against similarly named cities being selected in the wrong state/country.
  assert.equal(locations.indiana.geonames_id,4254679);
  assert.equal(locations.bgsu.geonames_id,5147968);
  assert.notEqual(locations.rcm.geonames_id,locations.western.geonames_id);
});
