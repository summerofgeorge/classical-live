import {readFile,writeFile,rename} from 'node:fs/promises';
import {collect} from './ingest.mjs';
const file=new URL('../dist/events.json',import.meta.url);
let previous;
try{previous=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const result=await collect(previous);
await writeFile(new URL('../dist/events.json.tmp',import.meta.url),JSON.stringify(result,null,2)+'\n');
await rename(new URL('../dist/events.json.tmp',import.meta.url),file);
const failed=result.sources.filter(s=>s.status!=='ok');
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## Calendar refresh\n\n${result.events.length} upcoming livestreams.\n\n`+result.sources.map(s=>`- ${s.name}: ${s.status}, ${s.count} events${s.error?' ('+s.error+')':''}`).join('\n')+'\n',{flag:'a'});
if(failed.length)console.warn(`${failed.length} source(s) need attention. Existing verified events expire after 14 days.`);
if(process.env.GITHUB_OUTPUT)await writeFile(process.env.GITHUB_OUTPUT,`degraded=${failed.length>0}\n`,{flag:'a'});
