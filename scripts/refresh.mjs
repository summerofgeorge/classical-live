import {readFile,writeFile,rename,readdir,stat} from 'node:fs/promises';
import {collect} from './ingest.mjs';
import {applyReviewed} from './reviewed.mjs';
const file=new URL('../dist/events.json',import.meta.url);
let previous;
try{previous=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const result=applyReviewed(await collect(previous),JSON.parse(await readFile(new URL('../data/browser-reviewed.json',import.meta.url),'utf8')));
await writeFile(new URL('../dist/events.json.tmp',import.meta.url),JSON.stringify(result,null,2)+'\n');
await rename(new URL('../dist/events.json.tmp',import.meta.url),file);
const failed=result.sources.filter(s=>!['ok','manual'].includes(s.status));
const usage=result.collection;
const dist=new URL('../dist/',import.meta.url);
async function directoryBytes(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 const sizes=await Promise.all(entries.map(entry=>entry.isDirectory()?directoryBytes(new URL(entry.name+'/',dir)):stat(new URL(entry.name,dir)).then(s=>s.size)));
 return sizes.reduce((a,b)=>a+b,0);
}
const siteBytes=await directoryBytes(dist);
const capacity=`${usage.requests}/${usage.request_limit} HTTP requests (including retries and redirects); ${(usage.duration_ms/1000).toFixed(1)} seconds collecting; ${(siteBytes/1_000_000).toFixed(3)} MB published. Videos remain hosted by their providers.`;
console.log(capacity);
const warnings=[];
if(usage.requests>=usage.request_limit*.8)warnings.push('Collection used at least 80% of the internal request budget. Review per-source usage before adding more sources.');
if(usage.duration_ms>=600_000)warnings.push('Collection exceeded 10 minutes of the 15-minute workflow timeout. Review slow sources.');
if(siteBytes>=800_000_000)warnings.push('Published files approach the 1 GB GitHub Pages site limit.');
for(const message of warnings)console.warn(process.env.GITHUB_ACTIONS?`::warning::${message}`:message);
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Calendar refresh\n\n${result.events.length} retained calendar listings from ${result.sources.length} schools.\n\n${capacity}\n\n${warnings.map(w=>'**Capacity warning:** '+w+'\n\n').join('')}`+result.sources.map(s=>`- ${s.name}: ${s.status}, ${s.count} events${s.requests!==undefined?`, ${s.requests} requests, ${(s.duration_ms/1000).toFixed(1)}s`:''}${s.error?' ('+s.error+')':''}`).join('\n')+'\n',{flag:'a'});
if(failed.length)console.warn(`${failed.length} source(s) need attention. Existing verified events expire after 14 days.`);
if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`degraded=${failed.length>0}\n`,{flag:'a'});
