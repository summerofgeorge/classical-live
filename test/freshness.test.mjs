import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleHealth} from '../dist/freshness.js';
const now=new Date('2026-09-28T23:00:00Z');
test('schedule health separates failed automatic checks, expiring reviews and healthy schools',()=>{
 const data={generated_at:now.toISOString(),sources:[{id:'healthy',status:'ok'},{id:'retained',status:'error',count:3},{id:'missing',status:'error',count:0},{id:'review',status:'manual',collection:'browser',valid_until:'2026-10-01T00:00:00Z'},{id:'expired',status:'manual',collection:'browser',valid_until:now.toISOString(),count:3}]};
 const health=scheduleHealth(data,now);assert.equal(health.old,false);assert.deepEqual(health.issues.map(s=>s.id),['retained','missing','expired']);
 assert.equal(health.issues[0].hasOlderListings,true);assert.equal(health.issues[1].hasOlderListings,false);assert.equal(health.issues[2].reviewDue,true);assert.equal(health.issues[2].hasOlderListings,false);
});
test('a two-day-old calendar can need a new check even when every school previously succeeded',()=>{
 const data={generated_at:'2026-09-26T22:59:59Z',sources:[{id:'school',status:'ok'}]};assert.equal(scheduleHealth(data,now).old,true);assert.equal(scheduleHealth(data,now).issues.length,0);
 assert.deepEqual(scheduleHealth({...data,generated_at:now.toISOString()},now),{old:false,issues:[]});
});
