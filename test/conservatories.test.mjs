import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {conservatories} from '../scripts/ingest.mjs';
const f=JSON.parse(await readFile(new URL('./fixtures/conservatories.json',import.meta.url),'utf8'));
const p=conservatories.parsers,now=new Date('2026-09-28T22:00:00Z');
test('BU uses the published term year and rejects a conflicting weekday',()=>{
 const events=p.parseBu(f.bu);assert.equal(events.length,3);assert.equal(events.at(-1).start,'2026-10-01T23:30:00.000Z');
 assert.throws(()=>p.parseBu(f.bu.replace('Fall 2026','Fall 2025')),/weekday/);
});
test('Hartt requires a dated public player and interprets campus local time with DST',()=>{
 const [e]=p.parseHartt(f.hartt);assert.equal(e.start,'2026-09-29T23:30:00.000Z');assert.equal(e.stream_url,'https://www.youtube.com/watch?v=7pvljc3x8Jw');
 assert.equal(p.parseHartt(f.hartt.replace('Hartt Wind Ensemble','Canceled: Hartt Wind Ensemble')).length,0);
 assert.equal(p.parseHartt(f.hartt.replace('Hartt Wind Ensemble','Hartt Wind Ensemble (password required)')).length,0);
});
test('Ithaca resolves the nearby weekday schedule without using copyright years',()=>{
 const e=p.parseIthaca(f.ithaca+'<footer>Copyright 2099</footer>',now);assert.equal(e.length,2);assert.equal(e[0].start,'2026-10-11T20:00:00.000Z');
 assert.throws(()=>p.parseIthaca(f.ithaca,new Date('2027-09-28T22:00:00Z')),/year/);
 assert.throws(()=>p.parseIthaca(f.ithaca.replace('list of all that we will have available to stream','Campus concerts'),now),/policy/);
});
test('FSU converts the campus clock across DST despite the generic EDT label',()=>{
 const e=p.parseFsu(f.fsu);assert.equal(e.length,2);assert.equal(e[0].start,'2026-10-10T23:30:00.000Z');assert.equal(e[1].start,'2026-11-01T20:00:00.000Z');
});
test('Crane admits only the explicit next webcast, not other campus performances',()=>{
 const e=p.parseCrane(f.crane);assert.equal(e.length,1);assert.equal(e[0].title,'Faculty Chamber Recital, Julia Trio');
 assert.equal(p.parseCrane(f.crane.replace('Watch the Livestream','Read the program')).length,0);
});
test('Long Beach requires both the hall-specific policy and an exact venue match',()=>{
 const policy='We are streaming all our live concerts from the Daniel Recital Hall';
 assert.equal(p.parseCsulb(f.csulb,policy).length,2);
 assert.equal(p.parseCsulb(f.csulb.replaceAll('data-venue="Daniel Recital Hall"','data-venue="Carpenter Center"'),policy).length,0);
 assert.throws(()=>p.parseCsulb(f.csulb,'Some concerts may be streamed'),/policy/);
});
test('Frost accepts event-specific public live URLs and rejects restricted, canceled or mismatched feeds',()=>{
 assert.equal(p.parseFrost(f.frost,now).length,1);
 for(const patch of [{private:true},{status:'canceled'},{stream_info:'NEC community members only; password required'},{stream_url:'https://example.com/private'},{experience:'inperson'}]){const d=structuredClone(f.frost);Object.assign(d.events[0].event,patch);assert.equal(p.parseFrost(d,now).length,0);}
 const bad=structuredClone(f.frost);bad.events[0].event.departments=[];assert.throws(()=>p.parseFrost(bad,now),/department/);
 const offset=structuredClone(f.frost);offset.events[0].event.event_instances[0].event_instance.start='2026-10-01T19:30:00-05:00';assert.throws(()=>p.parseFrost(offset,now),/offset/);
});
test('BYU cross-checks the streaming calendar against authoritative iCal, not URL slugs',()=>{
 const [c]=p.byuCandidates(f.byu,now),e=p.parseByuIcs(f.byuIcs,c);assert.equal(e.start,'2026-09-30T01:30:00.000Z');assert.equal(e.stream_url,'https://musicstreaming.byu.edu/recital-hall-stream');
 assert.throws(()=>p.parseByuIcs(f.byuIcs.replace('20260929T193000','20260929T183000'),c),/disagree/);
 assert.equal(p.parseByuIcs(f.byuIcs.replace('Recital Hall','Off-campus venue'),c),null);
});
