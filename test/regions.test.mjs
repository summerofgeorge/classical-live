import test from 'node:test';
import assert from 'node:assert/strict';
import {sources, candidateSources} from '../scripts/ingest.mjs';
import {REGIONS, regionIdForSource, sourcesForRegion, partitionSourceIds, regionConfig} from '../scripts/regions.mjs';
import {mergeShards} from '../scripts/merge-shards.mjs';
import {schoolInfo} from '../dist/schools.js';

test('every scheduled source maps to exactly one collection region',()=>{
 const parts=partitionSourceIds(sources);
 const all=Object.values(parts).flat();
 assert.equal(all.length,sources.length);
 assert.equal(new Set(all).size,sources.length);
 assert.ok(parts.nam.length>parts.europe.length);
 assert.ok(parts.europe.includes('liechtenstein'));
 assert.ok(parts.europe.includes('weimar'));
 assert.ok(parts.europe.includes('rcm'));
 assert.ok(parts['asia-pacific'].includes('geidai'));
 assert.ok(parts['asia-pacific'].includes('melbourne'));
 assert.ok(parts.nam.includes('curtis'));
 assert.ok(parts.nam.includes('toronto'));
 assert.equal(candidateSources.length,0);
 for(const source of sources){
  assert.ok(schoolInfo(source.id).region||source.timezone, source.id);
  assert.equal(typeof regionIdForSource(source),'string');
 }
});

test('regional request budgets keep an independent fuse per job',()=>{
 assert.deepEqual(REGIONS.map(r=>r.id),['nam','europe','asia-pacific']);
 assert.equal(regionConfig('nam').requestLimit,600);
 assert.equal(regionConfig('europe').requestLimit,400);
 assert.equal(regionConfig('asia-pacific').requestLimit,300);
 assert.equal(sourcesForRegion(sources,'europe').every(s=>regionIdForSource(s)==='europe'),true);
});

test('shard merge prefers fresh regional data and retains prior events when a shard is missing',()=>{
 const european=sourcesForRegion(sources,'europe')[0];
 const nam=sourcesForRegion(sources,'nam')[0];
 const previous={
  sources:[
   {...european,status:'ok',count:1},
   {...nam,status:'ok',count:1}
  ],
  events:[
   {id:european.id+'-old',source:european.id,title:'Old Europe',start:'2026-10-01T18:00:00.000Z',event_url:'https://example.test/e',stream_url:'https://example.test/e'},
   {id:nam.id+'-old',source:nam.id,title:'Old NAM',start:'2026-10-01T23:00:00.000Z',event_url:'https://example.test/n',stream_url:'https://example.test/n'}
  ]
 };
 const europeShard={
  schema_version:1,
  region:'europe',
  generated_at:'2026-09-29T12:00:00.000Z',
  collection:{requests:3,request_limit:400,response_bytes:10,duration_ms:100,region:'europe'},
  sources:[{...european,status:'ok',count:1}],
  events:[{id:european.id+'-new',source:european.id,title:'New Europe',start:'2026-10-02T18:00:00.000Z',event_url:'https://example.test/e2',stream_url:'https://example.test/e2'}]
 };
 const merged=mergeShards([europeShard], previous);
 assert.equal(merged.events.some(e=>e.id===european.id+'-new'),true);
 assert.equal(merged.events.some(e=>e.id===european.id+'-old'),false);
 const retained=merged.events.find(e=>e.id===nam.id+'-old');
 assert.equal(retained.stale,true);
 assert.ok(merged.sources.some(s=>s.id===nam.id&&s.status==='stale_region'));
 assert.equal(merged.collection.regions.length,1);
 assert.equal(merged.collection.request_limit,400);
});
