import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pacific,normalize,sources,adapters} from '../scripts/ingest.mjs';
import {pacificSources} from '../scripts/pacific.mjs';
import {schools} from '../dist/schools.js';
const fixture=name=>readFile(new URL('./fixtures/pacific-'+name,import.meta.url),'utf8');
const [index,detail,home,list]=await Promise.all(['ubc-index.html','ubc-oct.html','vcass-home.json','vcass-list.json'].map(fixture));
const now=new Date('2026-09-29T04:00:00Z');
test('UBC includes only upcoming streaming concerts and preserves local evening time',()=>{
 const events=pacific.ubcCandidates(index,now);assert.equal(events.length,4);
 assert.equal(events[0].start,'2026-10-03T02:30:00.000Z');
 assert.equal(events[1].start,'2026-10-11T02:30:00.000Z');
 const e=pacific.parseUbc(detail,events[0]);assert.equal(e.end,'2026-10-03T04:30:00.000Z');assert.equal(e.watch_kind,'channel');
 assert.equal(normalize(e,pacificSources[0],now).source,'ubc');
 assert.equal(pacific.ubcCandidates(index.replaceAll('concerts streaming','concerts'),now).length,0);
 assert.equal(pacific.parseUbc(detail.replace('/events/event?type=streaming','/events/event?type=concerts'),events[0]),null);
 assert.equal(pacific.parseUbc(detail.replace('Program details: TBD','This concert will not be live streamed.'),events[0]),null);
 assert.throws(()=>pacific.parseUbc(detail.replace('7:30 PM','6:30 PM'),events[0]),/disagree/);
 assert.throws(()=>pacific.ubcCandidates(index.replace('https://music.ubc.ca/events/event/ubc-symphony-orchestra-oct-2026/','https://example.org/event/'),now),/identity/);
 assert.throws(()=>pacific.ubcCandidates('<h1>Unavailable</h1>',now),/layout/);
});
test('VCASS uses concert start rather than early player opening and requires free music stream',()=>{
 assert.deepEqual(pacific.vcassPlaylists(JSON.parse(home)),['148791']);
 const rows=pacific.parseVcass(JSON.parse(list),now);assert.equal(rows.length,1);assert.equal(rows[0].start,'2026-10-29T01:45:00.000Z');assert.equal(rows[0].watch_kind,'registration');
 assert.equal(normalize(rows[0],pacificSources[1],now).source,'vcass');
 for(const change of [e=>e.cost='17.00',e=>delete e.cost,e=>e.title='DANCE | CONCERT',e=>e.type='ondemand',e=>e.description+=' Cancelled',e=>e.description=e.description.replace(/live stream/gi,'IN PERSON')]){const data=JSON.parse(list);change(data.data[0].playlistContent[0]);assert.deepEqual(pacific.parseVcass(data,now),[]);}
 const mismatch=JSON.parse(list);mismatch.data[0].playlistContent[0].description=mismatch.data[0].playlistContent[0].description.replace('29 October','28 October');assert.throws(()=>pacific.parseVcass(mismatch,now),/disagree/);
 assert.deepEqual(pacific.parseVcass(JSON.parse(list),new Date('2027-09-29')),[]);
 assert.throws(()=>pacific.parseVcass({...JSON.parse(list),totalPages:2},now),/pagination/);
 assert.throws(()=>pacific.vcassPlaylists({status:200,data:[{type:'FeatureContentColumns',payload:{playlistID:'../private'}}]}),/identity/);
});
test('Pacific schools are registered for refresh and geographic discovery',()=>{for(const source of pacificSources){assert.equal(sources.filter(s=>s.id===source.id).length,1);assert.equal(typeof adapters[source.id],'function');assert.ok(schools[source.id]);}});
