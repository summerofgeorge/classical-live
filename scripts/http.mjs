import {safeUrl} from '../dist/core.js';

export const REQUEST_LIMIT=600;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class StopRequest extends Error {}

// One transport owns pacing, redirects, retries and accounting for every adapter.
// The limit applies to actual network requests, including retries and redirects.
export function createFetcher({allowedHosts,pacedHosts=[],fetchImpl=fetch,pause=sleep,clock=Date.now,requestLimit=REQUEST_LIMIT,interval=1000}={}){
 const allowed=new Set(allowedHosts),paced=new Set(pacedHosts),lastRequest=new Map();
 let requests=0,responseBytes=0;
 function check(url){
  if(!safeUrl(url)||!allowed.has(new URL(url).hostname))throw new StopRequest('Source URL or redirect is outside the allowlist');
 }
 async function get(url,json=false){
  check(url);
  for(let attempt=0;attempt<2;attempt++){
   try{
    let current=url;
    for(let redirect=0;redirect<4;redirect++){
     check(current);
     if(requests>=requestLimit)throw new StopRequest('Request budget exceeded');
     const host=new URL(current).hostname;
     if(paced.has(host)){
      const delay=interval-(clock()-(lastRequest.get(host)??-Infinity));
      if(delay>0)await pause(delay);
      lastRequest.set(host,clock());
     }
     requests++;
     const response=await fetchImpl(current,{signal:AbortSignal.timeout(20000),redirect:'manual',headers:{'User-Agent':'ClassicalLive/1.0 (+https://github.com/summerofgeorge/classical-live)','Accept':json?'application/json':'text/html'}});
     if(response.status>=300&&response.status<400&&response.headers.get('location')){
      await response.body?.cancel();
      current=new URL(response.headers.get('location'),current).href;
      continue;
     }
     if(!response.ok){
      await response.body?.cancel();
      const ErrorType=response.status>=500?Error:StopRequest;
      throw new ErrorType(`HTTP ${response.status} from ${host}`);
     }
     if(Number(response.headers.get('content-length'))>5_000_000){await response.body?.cancel();throw new StopRequest('Response too large');}
     const body=await response.text();responseBytes+=Buffer.byteLength(body);
     if(Buffer.byteLength(body)>5_000_000)throw new StopRequest('Response too large');
     if(!json)return body;
     try{return JSON.parse(body);}catch{throw new StopRequest(`Invalid JSON from ${host}`);}
    }
    throw new StopRequest('Source redirect limit exceeded');
   }catch(error){
    if(attempt||error instanceof StopRequest||requests>=requestLimit)throw error;
    await pause(1000);
   }
  }
 }
 get.stats=()=>({requests,request_limit:requestLimit,response_bytes:responseBytes});
 return get;
}
