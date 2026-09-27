import test from 'node:test';
import assert from 'node:assert/strict';
import {createFetcher} from '../scripts/http.mjs';
const origin='https://school.example';
const setup=options=>createFetcher({allowedHosts:['school.example'],pause:async()=>{},...options});

test('actual requests count redirects and a transient retry without exceeding the cap',async()=>{
 let calls=0;
 const get=setup({requestLimit:3,fetchImpl:async url=>{calls++;if(calls===1)return new Response(null,{status:302,headers:{location:'/event'}});if(calls===2)return new Response('',{status:503});return new Response('ok');}});
 assert.equal(await get(origin),'ok');
 assert.equal(get.stats().requests,3);
 await assert.rejects(get(origin),/budget/);
 assert.equal(calls,3);
});

test('off-site redirect is rejected before any off-site request or retry',async()=>{
 let calls=0;
 const get=setup({fetchImpl:async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://outside.example/'}});}});
 await assert.rejects(get(origin),/allowlist/);
 assert.equal(calls,1);
 await assert.rejects(get('http://school.example'),/allowlist/);
 assert.equal(calls,1);
});

test('access denied and rate limited responses never trigger retries',async()=>{
 for(const status of [401,403,429]){
  let calls=0;const get=setup({fetchImpl:async()=>{calls++;return new Response('',{status});}});
  await assert.rejects(get(origin),new RegExp(`HTTP ${status}`));assert.equal(calls,1);
 }
});

test('redirect loops stop at four actual requests',async()=>{
 const get=setup({fetchImpl:async()=>new Response(null,{status:302,headers:{location:'/loop'}})});
 await assert.rejects(get(origin),/redirect limit/);assert.equal(get.stats().requests,4);
});

test('pacing applies to subsequent requests and byte accounting measures UTF-8',async()=>{
 let now=10000;const waits=[];
 const get=setup({pacedHosts:['school.example'],clock:()=>now,pause:async ms=>{waits.push(ms);now+=ms;},fetchImpl:async()=>new Response('藝')});
 await get(origin);await get(origin+'/other');
 assert.deepEqual(waits,[1000]);assert.equal(get.stats().response_bytes,6);
 const stats=get.stats();stats.requests=100;assert.equal(get.stats().requests,2);
});

test('malformed JSON and oversized responses do not waste retries',async()=>{
 let calls=0;const get=setup({fetchImpl:async()=>{calls++;return new Response('not json');}});
 await assert.rejects(get(origin,true),/Invalid JSON/);assert.equal(calls,1);
 const large=setup({fetchImpl:async()=>new Response('',{headers:{'content-length':'5000001'}})});
 await assert.rejects(large(origin),/too large/);assert.equal(large.stats().requests,1);
});
