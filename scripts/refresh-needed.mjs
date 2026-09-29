import {readFile,appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function shouldRefresh(eventName,changedPaths){
 if(eventName!=='push'||!Array.isArray(changedPaths))return true;
 return changedPaths.some(path=>
  path.startsWith('data/')||
  (path.startsWith('scripts/')&&!['scripts/serve.mjs','scripts/refresh-needed.mjs'].includes(path))||
  ['dist/core.js','dist/events.json','package.json','pnpm-lock.yaml'].includes(path)
 );
}

async function main(){
 let changedPaths;
 if(process.env.GITHUB_EVENT_NAME==='push'){
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  // Missing history or an initial push conservatively refreshes every source.
  if(/^[a-f0-9]{40}$/.test(event.before||'')&&!/^0+$/.test(event.before)){
   try{changedPaths=execFileSync('git',['diff','--name-only',event.before,'HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n').filter(Boolean);}catch{}
  }
 }
 const required=shouldRefresh(process.env.GITHUB_EVENT_NAME,changedPaths);
 await appendFile(process.env.GITHUB_OUTPUT,`required=${required}\n`);
 console.log(required?'Refresh official schedules before publishing.':'Publish website changes using the most recent collected schedule.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
