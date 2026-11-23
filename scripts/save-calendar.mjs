import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function saveCalendar(cwd=process.cwd()){
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  git('add','dist/events.json','data/maintenance-state.json');
  if(!git('diff','--cached','--name-only').trim())return false;
  git('commit','-m','Refresh calendar and maintenance state');
  // A PR can merge while collection is running. Replay only our generated-file
  // commit on the latest main; a genuine content conflict must stop the save.
  for(let attempt=0;attempt<3;attempt++){
    git('fetch','origin','main');
    try{git('rebase','origin/main');}
    catch(error){git('rebase','--abort');throw error;}
    try{git('push','origin','HEAD:main');return true;}
    catch(error){if(attempt===2)throw error;}
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)saveCalendar();
