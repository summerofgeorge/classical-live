import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const DAY=86400000;
const cell=value=>String(value??'').replace(/[\r\n|<>]/g,' ').replace(/[[\]`]/g,'');

export function explainSource(source,now=new Date()){
 if(source.status==='review_due'||source.status==='manual')return {category:'review',reason:'These listings need another check on the school website.',action:'Recheck the official concert pages and update the browser-reviewed listings.'};
 const error=source.error||'';
 if(source.status==='stale_region')return {category:'region',reason:'A regional refresh did not finish.',action:'Inspect the failed regional job and retry it.'};
 if(/budget|limit reached|pagination.*limit/i.test(error))return {category:'limit',reason:'The school calendar exceeded the collector’s page limit.',action:'Check the calendar size and adjust its bounded collection limits.'};
 if(/HTTP 403|HTTP 429/i.test(error))return {category:'access',reason:'The school website refused the automated request.',action:'Check whether unattended access is supported; do not repeatedly retry blocked requests.'};
 if(/fetch failed|timeout|timed out|HTTP 5\d\d/i.test(error))return {category:'connection',reason:'The school page could not be reached.',action:source.consecutive_failures>=2?'The problem has repeated. Check the source and the request logs.':'The next daily refresh will retry automatically.'};
 return {category:'verification',reason:'The collector could not verify the school’s current schedule.',action:'Check the official page and update the collector if its format or broadcast details changed.'};
}

// Store only previously alerted problems, outside dist/. Counts and routine daily
// changes must not turn a successful publication into another failure email.
export function maintenanceReport(data,previous={schema_version:1,issues:{}},now=new Date()){
 if(previous.schema_version!==1||!previous.issues||Array.isArray(previous.issues))throw new Error('Invalid maintenance notification state');
 const pending=[],alerts=[],issues={};
 for(const source of data.sources){
  const age=(+now-Date.parse(source.last_success))/DAY;
  const dueSoon=source.status==='manual'&&source.count>0&&Date.parse(source.valid_until)<=+now+3*DAY;
  if(['ok','manual'].includes(source.status)&&!dueSoon)continue;
  const detail=explainSource(source,now);
  const stage=source.status==='review_due'||age>=14?'expired':dueSoon||age>=11?'expires-soon':'retained';
  const actionable=dueSoon||['review_due','stale_region'].includes(source.status)||(source.consecutive_failures||1)>=2||age>=11;
  const fingerprint=[source.status,detail.category,stage].join(':');
  const old=previous.issues[source.id];
  const notify=actionable&&(!old||old.fingerprint!==fingerprint);
  const item={...source,...detail,stage,actionable,notify};
  pending.push(item);
  if(actionable){
   issues[source.id]=notify?{fingerprint,last_alerted_at:now.toISOString()}:old;
   if(notify)alerts.push(item);
  }
 }
 const healthy=data.sources.filter(s=>s.status==='ok').length;
 const manual=data.sources.filter(s=>s.collection==='browser').length;
 const stale=data.events.filter(e=>e.stale).length;
 const heading=alerts.length?'Website updated successfully — school schedules need attention':'Website updated successfully';
 const lines=[`## ${heading}`,'',`${healthy} automatic school checks succeeded; ${manual} schools use browser-reviewed listings. ${data.events.length} concert listings published.`, ''];
 if(!pending.length)lines.push('No school maintenance is needed right now.');
 else{
  lines.push(`${pending.length} school(s) need a retry or review; ${stale} listings use a previously verified schedule.`, '',alerts.length?`**Please review ${alerts.length} new or worsening problem(s).** The separate maintenance alert does not mean the website failed to publish.`:'No new maintenance alert: these problems are awaiting the next retry or have already been reported.', '', '| School | What happened | Next step | Last verified |','| --- | --- | --- | --- |');
  for(const s of pending)lines.push(`| ${cell(s.name)} | ${cell(s.reason)}${s.stage==='expired'?' Unverified listings have expired.':s.stage==='expires-soon'?' Verification expires within three days.':''} | ${cell(s.action)} | ${cell(s.last_success?.slice(0,10)||'Never')} |`);
  lines.push('', 'Listings automatically disappear 14 days after their last verification. The public site displays no maintenance report.', '', '<details><summary>Technical details for troubleshooting</summary>','');
  for(const s of pending)lines.push(`- ${cell(s.name)}: ${cell(s.error||s.status)}`);
  lines.push('','</details>');
 }
 return {alerts,pending,state:{schema_version:1,issues},summary:lines.join('\n')+'\n'};
}

async function main(){
 if(!process.argv.includes('--published'))throw new Error('Run this report only after a successful website deployment (--published)');
 const data=JSON.parse(await readFile(new URL('../dist/events.json',import.meta.url),'utf8'));
 const path=new URL('../data/maintenance-state.json',import.meta.url);
 let previous;
 try{previous=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const report=maintenanceReport(data,previous);
 await writeFile(path,JSON.stringify(report.state,null,2)+'\n');
 console.log(report.summary);
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,report.summary);
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`attention=${report.alerts.length>0}\n`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
