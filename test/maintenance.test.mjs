import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceReport} from '../scripts/maintenance.mjs';
import {collect} from '../scripts/ingest.mjs';
import {readFile} from 'node:fs/promises';

const now=new Date('2026-10-04T12:00:00Z');
const source={id:'test',name:'Test School',status:'error',last_success:'2026-10-03T12:00:00Z',consecutive_failures:1,count:2,error:'fetch failed'};
const data=(s=source)=>({sources:[s],events:[{stale:true}]});

test('one connection failure retries quietly, a repeat alerts once, recovery resets notification state',()=>{
 const first=maintenanceReport(data(),undefined,now);
 assert.equal(first.alerts.length,0);
 assert.match(first.summary,/retry automatically/);
 const repeated={...source,consecutive_failures:2};
 const second=maintenanceReport(data(repeated),first.state,now);
 assert.equal(second.alerts.length,1);
 assert.match(second.summary,/Website updated successfully/);
 const unchanged=maintenanceReport(data({...repeated,count:1,consecutive_failures:3}),second.state,new Date('2026-10-05T12:00:00Z'));
 assert.equal(unchanged.alerts.length,0);
 assert.deepEqual(unchanged.state,second.state);
 const recovered=maintenanceReport(data({...source,status:'ok'}),second.state,now);
 assert.deepEqual(recovered.state.issues,{});
 assert.equal(maintenanceReport(data(repeated),recovered.state,now).alerts.length,1);
});

test('new failure types and approaching expiry alert again without repeating daily',()=>{
 const repeated={...source,consecutive_failures:2};
 const initial=maintenanceReport(data(repeated),undefined,now);
 const changed=maintenanceReport(data({...repeated,error:'Event budget exceeded'}),initial.state,now);
 assert.equal(changed.alerts.length,1);
 const near=maintenanceReport(data(repeated),initial.state,new Date('2026-10-14T12:00:00Z'));
 assert.equal(near.alerts.length,1);
 assert.equal(maintenanceReport(data(repeated),near.state,new Date('2026-10-15T12:00:00Z')).alerts.length,0);
 assert.equal(maintenanceReport(data(repeated),near.state,new Date('2026-10-17T12:00:00Z')).alerts.length,1);
});

test('browser reviews notify before expiry and on expiry, while empty current reviews remain quiet',()=>{
 const manual={...source,collection:'browser',status:'manual',valid_until:'2026-10-06T12:00:00Z'};
 const report=maintenanceReport(data(manual),undefined,now);
 assert.equal(report.alerts.length,1);
 assert.match(report.summary,/Recheck the official/);
 assert.equal(maintenanceReport(data({...manual,count:0}),undefined,now).alerts.length,0);
 assert.equal(maintenanceReport(data({...manual,status:'review_due',count:0}),report.state,now).alerts.length,1);
});

test('missing regions alert immediately and invalid state is not silently discarded',()=>{
 assert.equal(maintenanceReport(data({...source,status:'stale_region'}),undefined,now).alerts.length,1);
 assert.throws(()=>maintenanceReport(data(),{schema_version:2,issues:{}},now),/Invalid maintenance/);
});

test('consecutive source failures increase only while unsuccessful and reset after recovery',async()=>{
 const registry=[{id:'test',name:'Test'}],handlers={test:async()=>{throw new Error('Offline');}};
 const first=await collect(undefined,now,registry,null,handlers);
 assert.equal(first.sources[0].consecutive_failures,1);
 const second=await collect(first,now,registry,null,handlers);
 assert.equal(second.sources[0].consecutive_failures,2);
 const recovered=await collect(second,now,registry,null,{test:async()=>[]});
 assert.equal(recovered.sources[0].consecutive_failures,undefined);
 assert.equal((await collect(recovered,now,registry,null,handlers)).sources[0].consecutive_failures,1);
});

test('maintenance alerts follow confirmed deployment and do not replace real workflow failures',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/refresh-and-deploy.yml',import.meta.url),'utf8');
 assert.ok(workflow.indexOf('uses: actions/deploy-pages@v4')<workflow.indexOf('run: node scripts/maintenance.mjs --published'));
 assert.match(workflow,/needs\.publish\.result == 'success' && needs\.publish\.outputs\.attention == 'true'/);
 assert.doesNotMatch(workflow,/continue-on-error|Report merge degradation|Report source failures after publishing/);
 assert.match(workflow,/git add dist\/events\.json data\/maintenance-state\.json/);
 assert.equal(workflow,await readFile(new URL('../docs/workflows/refresh-and-deploy.yml',import.meta.url),'utf8'));
});
