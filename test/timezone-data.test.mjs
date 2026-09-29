import test from 'node:test';
import assert from 'node:assert/strict';
import {zonedTime} from '../scripts/ingest.mjs';

test('runtime time-zone data reflects Vancouver permanent Pacific time without changing US Pacific rules',()=>{
 // https://news.gov.bc.ca/releases/2026AG0013-000209
 // Node 24.16 includes tzdata 2026b. Older runner caches can silently shift concerts by an hour.
 assert.equal(zonedTime('2026-03-07T19:30:00','America/Vancouver'),'2026-03-08T03:30:00.000Z');
 assert.equal(zonedTime('2026-10-02T19:30:00','America/Vancouver'),'2026-10-03T02:30:00.000Z');
 assert.equal(zonedTime('2026-11-06T19:30:00','America/Vancouver'),'2026-11-07T02:30:00.000Z');
 assert.equal(zonedTime('2027-01-15T19:30:00','America/Vancouver'),'2027-01-16T02:30:00.000Z');
 assert.equal(zonedTime('2026-11-06T19:30:00','America/Los_Angeles'),'2026-11-07T03:30:00.000Z');
 assert.throws(()=>zonedTime('2026-03-08T02:30:00','America/Vancouver'),/Nonexistent/);
});
