import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {collect, sources, makeFetcher} from './ingest.mjs';
import {regionConfig, sourcesForRegion, shardFileName} from './regions.mjs';

const shardDir=new URL('../dist/shards/',import.meta.url);
const eventsFile=new URL('../dist/events.json',import.meta.url);

export async function collectRegion(regionId, previous, now=new Date()){
 const region=regionConfig(regionId);
 const registry=sourcesForRegion(sources, region.id);
 if(!registry.length)throw new Error(`No sources registered for region ${region.id}`);
 const get=makeFetcher(region.requestLimit);
 const result=await collect(previous, now, registry, get);
 return {
  ...result,
  region: region.id,
  region_label: region.label,
  collection: {
   ...result.collection,
   region: region.id,
   request_limit: region.requestLimit
  }
 };
}

async function main(){
 const regionId=process.env.COLLECT_REGION;
 if(!regionId)throw new Error('Set COLLECT_REGION to nam, europe, or asia-pacific');
 let previous={events:[],sources:[]};
 try{previous=JSON.parse(await readFile(eventsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const result=await collectRegion(regionId, previous);
 await mkdir(shardDir,{recursive:true});
 const name=shardFileName(regionId);
 const tmp=new URL(name+'.tmp',shardDir);
 await writeFile(tmp,JSON.stringify(result,null,2)+'\n');
 await rename(tmp,new URL(name,shardDir));
 const usage=result.collection;
 console.log(`${regionId}: ${result.events.length} events from ${result.sources.length} schools; ${usage.requests}/${usage.request_limit} requests; ${(usage.duration_ms/1000).toFixed(1)}s`);
 if(process.env.GITHUB_STEP_SUMMARY){
  await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Region \`${regionId}\`\n\n${result.events.length} listings from ${result.sources.length} schools.\n\n${usage.requests}/${usage.request_limit} HTTP requests; ${(usage.duration_ms/1000).toFixed(1)}s.\n\n`+result.sources.map(s=>`- ${s.name}: ${s.status}, ${s.count} events${s.requests!==undefined?`, ${s.requests} requests`:''}${s.error?' ('+s.error+')':''}`).join('\n')+'\n',{flag:'a'});
 }
 const failed=result.sources.filter(s=>!['ok','manual'].includes(s.status));
 if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`degraded=${failed.length>0}\nregion=${regionId}\n`,{flag:'a'});
 if(usage.requests>=usage.request_limit*.8)console.warn(process.env.GITHUB_ACTIONS?`::warning::Region ${regionId} used at least 80% of its request budget.`:`Region ${regionId} used at least 80% of its request budget.`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
