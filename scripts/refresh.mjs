import {mkdir, readFile, writeFile, rename, readdir, stat, rm} from 'node:fs/promises';
import {collectRegion} from './collect-region.mjs';
import {mergeShards} from './merge-shards.mjs';
import {REGIONS, shardFileName} from './regions.mjs';
import {applyReviewed} from './reviewed.mjs';
import {pathToFileURL} from 'node:url';

const eventsFile=new URL('../dist/events.json',import.meta.url);
const shardDir=new URL('../dist/shards/',import.meta.url);
const distDir=new URL('../dist/',import.meta.url);

async function directoryBytes(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 const sizes=await Promise.all(entries.map(entry=>entry.isDirectory()?directoryBytes(new URL(entry.name+'/',dir)):stat(new URL(entry.name,dir)).then(s=>s.size)));
 return sizes.reduce((a,b)=>a+b,0);
}

async function main(){
 let previous;
 try{previous=JSON.parse(await readFile(eventsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error; previous={events:[],sources:[]};}
 await mkdir(shardDir,{recursive:true});
 // Drop stale shards so a partial prior run cannot mix with this refresh.
 for(const name of await readdir(shardDir)){
  if(name.endsWith('.json'))await rm(new URL(name,shardDir),{force:true});
 }
 const shards=[];
 for(const region of REGIONS){
  const shard=await collectRegion(region.id, previous);
  const file=new URL(shardFileName(region.id),shardDir);
  await writeFile(new URL(shardFileName(region.id)+'.tmp',shardDir),JSON.stringify(shard,null,2)+'\n');
  await rename(new URL(shardFileName(region.id)+'.tmp',shardDir),file);
  shards.push(shard);
 }
 const merged=mergeShards(shards, previous);
 const result=applyReviewed(merged, JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8')));
 await writeFile(new URL('../dist/events.json.tmp',import.meta.url),JSON.stringify(result,null,2)+'\n');
 await rename(new URL('../dist/events.json.tmp',import.meta.url),eventsFile);
 const failed=result.sources.filter(s=>!['ok','manual'].includes(s.status));
 const usage=result.collection;
 const siteBytes=await directoryBytes(distDir);
 const capacity=`${usage.requests}/${usage.request_limit} HTTP requests across ${usage.regions?.length||REGIONS.length} regions (including retries and redirects); ${(usage.duration_ms/1000).toFixed(1)} seconds longest region; ${(siteBytes/1_000_000).toFixed(3)} MB published. Videos remain hosted by their providers.`;
 console.log(capacity);
 const warnings=[];
 for(const region of usage.regions||[]){
  if(region.requests>=region.request_limit*.8)warnings.push(`Region ${region.region} used at least 80% of its request budget (${region.requests}/${region.request_limit}).`);
 }
 if(usage.duration_ms>=600_000)warnings.push('A regional collection exceeded 10 minutes of the 15-minute workflow timeout. Review slow sources.');
 if(siteBytes>=800_000_000)warnings.push('Published files approach the 1 GB GitHub Pages site limit.');
 for(const message of warnings)console.warn(process.env.GITHUB_ACTIONS?`::warning::${message}`:message);
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Calendar refresh\n\n${result.events.length} retained calendar listings from ${result.sources.length} schools.\n\n${capacity}\n\n${warnings.map(w=>'**Capacity warning:** '+w+'\n\n').join('')}`+result.sources.map(s=>`- ${s.name}: ${s.status}, ${s.count} events${s.requests!==undefined?`, ${s.requests} requests, ${(s.duration_ms/1000).toFixed(1)}s`:''}${s.collection_region?` [${s.collection_region}]`:''}${s.error?' ('+s.error+')':''}`).join('\n')+'\n',{flag:'a'});
 if(failed.length)console.warn(`${failed.length} source(s) need attention. Existing verified events expire after 14 days.`);
 if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`degraded=${failed.length>0}\n`,{flag:'a'});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
