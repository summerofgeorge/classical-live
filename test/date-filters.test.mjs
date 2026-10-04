import test from 'node:test';
import assert from 'node:assert/strict';
import {matches,periodRange} from '../dist/core.js';
const timeZone='America/New_York';
const event=start=>({start,title:'Concert',institution:'School',program:''});

test('automatic listings disappear at 14 days even if the published site never refreshes',()=>{
 const concert={...event('2026-10-20T19:00:00Z'),last_verified_at:'2026-10-01T12:00:00Z'};
 const filter={timeZone,period:'all'};
 for(const stale of [true,false]){
  assert.equal(matches({...concert,stale},filter,new Date('2026-10-15T11:59:59Z')),true);
  assert.equal(matches({...concert,stale},filter,new Date('2026-10-15T12:00:00Z')),false);
 }
 assert.equal(matches({...concert,last_verified_at:'bad'},filter,new Date('2026-10-04T12:00:00Z')),false);
 assert.equal(matches({...concert,stale:true,last_verified_at:undefined},filter,new Date('2026-10-04T12:00:00Z')),false);
});
test('Today includes daytime and earlier concerts while Tomorrow selects only the next local day',()=>{
 const now=new Date('2026-09-28T00:30:00Z');
 assert.equal(matches(event('2026-09-27T12:00:00-04:00'),{period:'today',timeZone},now),true);
 assert.equal(matches(event('2026-09-28T01:00:00-04:00'),{period:'today',timeZone},now),false);
 assert.equal(matches(event('2026-09-28T01:00:00-04:00'),{period:'tomorrow',timeZone},now),true);
 assert.equal(matches(event('2026-09-29T01:00:00-04:00'),{period:'tomorrow',timeZone},now),false);
 assert.deepEqual(periodRange('week',timeZone,now),{first:'2026-09-27',last:'2026-10-03'});
});
test('Tomorrow follows local calendar dates across DST and year changes',()=>{
 const now=new Date('2026-11-01T04:30:00Z');
 assert.deepEqual(periodRange('tomorrow',timeZone,now),{first:'2026-11-02',last:'2026-11-02'});
 assert.equal(matches(event('2026-11-01T23:30:00-05:00'),{period:'tomorrow',timeZone},now),false);
 assert.equal(matches(event('2026-11-02T00:15:00-05:00'),{period:'tomorrow',timeZone},now),true);
 assert.deepEqual(periodRange('tomorrow','Asia/Tokyo',new Date('2026-12-31T15:30:00Z')),{first:'2027-01-02',last:'2027-01-02'});
});
test('Weekend shows Friday through Sunday, clipping dates already past; All dates keeps the full available schedule',()=>{
 assert.deepEqual(periodRange('weekend',timeZone,new Date('2026-09-28T12:00:00Z')),{first:'2026-10-02',last:'2026-10-04'});
 assert.deepEqual(periodRange('weekend',timeZone,new Date('2026-10-03T12:00:00Z')),{first:'2026-10-03',last:'2026-10-04'});
 assert.deepEqual(periodRange('weekend',timeZone,new Date('2026-10-04T12:00:00Z')),{first:'2026-10-04',last:'2026-10-04'});
 assert.equal(matches(event('2026-11-01T18:00:00-05:00'),{period:'all',timeZone},new Date('2026-09-28T12:00:00Z')),true);
});
