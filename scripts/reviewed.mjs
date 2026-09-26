import {normalize,DAY,keepForDisplay} from './ingest.mjs';
import {safeUrl} from '../dist/core.js';

// Browser observations keep their original timestamp across every scheduled build.
// They supplement the automated sources without pretending a refresh rechecked them.
export function applyReviewed(result,payload,now=new Date()){
 if(payload.schema_version!==1||!Array.isArray(payload.sources))throw new Error('Invalid browser review file');
 const ids=new Set(),events=[],statuses=[];
 for(const review of payload.sources){
  const {events:raw,checked_at,...source}=review;
  if(!/^[a-z0-9_-]+$/.test(source.id)||ids.has(source.id)||!safeUrl(source.url)||!Array.isArray(raw))throw new Error('Invalid reviewed source');
  if(result.sources.some(s=>s.id===source.id&&s.collection!=='browser'))throw new Error('Reviewed source conflicts with automatic collector');
  ids.add(source.id);
  const checked=new Date(checked_at);
  if(!Number.isFinite(+checked)||checked>now)throw new Error('Invalid browser review timestamp');
  const valid_until=new Date(+checked+14*DAY).toISOString();
  const normalized=raw.map(item=>{
   if(!item.evidence||item.evidence_url!==item.event_url||new URL(item.event_url).hostname!==new URL(source.url).hostname)throw new Error('Missing official event evidence');
   if(!/(Z|[+-]\d\d:\d\d)$/.test(item.start)||+new Date(item.start)<+checked-DAY)throw new Error('Invalid reviewed event date');
   return {...normalize(item,source,checked),verification_method:'browser',valid_until};
  });
  const active=now<new Date(valid_until)?normalized.filter(e=>keepForDisplay(e,now)&&new Date(e.start)<new Date(+now+45*DAY)):[];
  events.push(...active);
  statuses.push({...source,collection:'browser',status:now<new Date(valid_until)?'manual':'review_due',last_success:checked.toISOString(),valid_until,count:active.length});
 }
 const unique=new Map([...result.events.filter(e=>!ids.has(e.source)),...events].map(e=>[e.id,e]));
 return {...result,sources:[...result.sources.filter(s=>!ids.has(s.id)),...statuses],events:[...unique.values()].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))};
}
