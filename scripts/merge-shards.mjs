import {readdir, readFile, writeFile, rename, mkdir, stat} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {applyReviewed} from './reviewed.mjs';
import {REGIONS, regionIdForSource, sourcesForRegion} from './regions.mjs';
import {sources} from './ingest.mjs';

const shardDir=new URL('../dist/shards/',import.meta.url);
const eventsFile=new URL('../dist/events.json',import.meta.url);
const distDir=new URL('../dist/',import.meta.url);

export function mergeShards(shards, previous={events:[],sources:[]}, registry=sources){
 const byRegion=new Map(shards.map(s=>[s.region,s]));
 const events=[], statuses=[], collections=[];
 const covered=new Set();
 for(const region of REGIONS){
  const shard=byRegion.get(region.id);
  const regionSourceIds=new Set(sourcesForRegion(registry, region.id).map(s=>s.id));
  if(shard){
   if(shard.schema_version!==1)throw new Error(`Invalid shard for ${region.id}`);
   for(const source of shard.sources){
    if(!regionSourceIds.has(source.id))throw new Error(`Shard ${region.id} contains out-of-region source ${source.id}`);
    statuses.push({...source, collection_region: region.id});
    covered.add(source.id);
   }
   for(const event of shard.events){
    if(!regionSourceIds.has(event.source))throw new Error(`Shard ${region.id} contains out-of-region event ${event.id}`);
    events.push(event);
   }
   if(shard.collection)collections.push({region: region.id, ...shard.collection});
  }else{
   // Missing shard (job skipped/failed): retain prior verified data for that region only.
   for(const source of previous.sources||[]){
    if(!regionSourceIds.has(source.id)||covered.has(source.id))continue;
    statuses.push({...source, collection_region: region.id, status: source.status==='manual'?source.status:'stale_region', error: source.error||'Region shard missing; retained prior listings'});
    covered.add(source.id);
   }
   for(const event of previous.events||[]){
    if(regionSourceIds.has(event.source))events.push({...event, stale:true});
   }
  }
 }
 // Keep browser-reviewed / unknown prior ids out of automatic region sets for later applyReviewed.
 for(const source of previous.sources||[]){
  if(covered.has(source.id))continue;
  if(source.collection==='browser')continue;
  // Source removed from registry: drop.
 }
 const unique=new Map();
 for(const event of events)unique.set(event.id,event);
 const requests=collections.reduce((n,c)=>n+(c.requests||0),0);
 const response_bytes=collections.reduce((n,c)=>n+(c.response_bytes||0),0);
 const duration_ms=collections.reduce((n,c)=>Math.max(n,c.duration_ms||0),0);
 const request_limit=collections.reduce((n,c)=>n+(c.request_limit||0),0);
 return {
  schema_version:1,
  generated_at: new Date(Math.max(0,...shards.map(s=>Date.parse(s.generated_at)||0), Date.now())).toISOString(),
  horizon_days:45,
  collection:{
   requests,
   request_limit: request_limit||REGIONS.reduce((n,r)=>n+r.requestLimit,0),
   response_bytes,
   duration_ms,
   regions: collections
  },
  sources: statuses,
  events: [...unique.values()].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))
 };
}

async function directoryBytes(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 const sizes=await Promise.all(entries.map(entry=>entry.isDirectory()?directoryBytes(new URL(entry.name+'/',dir)):stat(new URL(entry.name,dir)).then(s=>s.size)));
 return sizes.reduce((a,b)=>a+b,0);
}

async function main(){
 let previous={events:[],sources:[]};
 try{previous=JSON.parse(await readFile(eventsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 await mkdir(shardDir,{recursive:true});
 const names=(await readdir(shardDir)).filter(name=>name.endsWith('.json'));
 const shards=[];
 for(const name of names){
  const shard=JSON.parse(await readFile(new URL(name,shardDir),'utf8'));
  if(!shard.region)throw new Error(`Shard ${name} missing region`);
  shards.push(shard);
 }
 const expected=new Set(REGIONS.map(r=>r.id));
 const got=new Set(shards.map(s=>s.region));
 for(const id of got)if(!expected.has(id))throw new Error(`Unexpected shard region ${id}`);
 const merged=mergeShards(shards, previous);
 const reviewed=applyReviewed(merged, JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8')));
 await writeFile(new URL('../dist/events.json.tmp',import.meta.url),JSON.stringify(reviewed,null,2)+'\n');
 await rename(new URL('../dist/events.json.tmp',import.meta.url),eventsFile);
 const usage=reviewed.collection;
 const siteBytes=await directoryBytes(distDir);
 const capacity=`${usage.requests}/${usage.request_limit} HTTP requests across ${usage.regions?.length||0} regions (including retries and redirects); ${(usage.duration_ms/1000).toFixed(1)} seconds longest region; ${(siteBytes/1_000_000).toFixed(3)} MB published. Videos remain hosted by their providers.`;
 console.log(capacity);
 const warnings=[];
 for(const region of usage.regions||[]){
  if(region.requests>=region.request_limit*.8)warnings.push(`Region ${region.region} used at least 80% of its request budget (${region.requests}/${region.request_limit}).`);
 }
 if(usage.duration_ms>=600_000)warnings.push('A regional collection exceeded 10 minutes of the 15-minute workflow timeout. Review slow sources.');
 if(siteBytes>=800_000_000)warnings.push('Published files approach the 1 GB GitHub Pages site limit.');
 for(const message of warnings)console.warn(process.env.GITHUB_ACTIONS?`::warning::${message}`:message);
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Calendar merge\n\n${reviewed.events.length} retained calendar listings from ${reviewed.sources.length} schools.\n\n${capacity}\n\n${warnings.map(w=>'**Capacity warning:** '+w+'\n\n').join('')}`+REGIONS.map(r=>{
  const n=reviewed.sources.filter(s=>s.collection_region===r.id||(!s.collection_region&&regionIdForSource({id:s.id,timezone:s.timezone})===r.id)).length;
  return `- ${r.label} (\`${r.id}\`): ${n} automatic sources`;
 }).join('\n')+'\n'+reviewed.sources.map(s=>`- ${s.name}: ${s.status}, ${s.count} events${s.collection_region?` [${s.collection_region}]`:''}${s.error?' ('+s.error+')':''}`).join('\n')+'\n',{flag:'a'});
 const failed=reviewed.sources.filter(s=>!['ok','manual'].includes(s.status));
 if(failed.length)console.warn(`${failed.length} source(s) need attention. Existing verified events expire after 14 days.`);
 if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`degraded=${failed.length>0}\n`,{flag:'a'});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
