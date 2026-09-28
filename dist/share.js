import {endTime} from './core.js';

const siteUrl='https://classicalwatch.stringfestanalytics.com/';
export function shareDetails(event,now=new Date()){
  const url=new URL(siteUrl);url.searchParams.set('event',event.id);
  const subject=`${event.title} (${event.institution})`;
  let description='',weight=0;
  for(const char of subject){weight+=char.codePointAt(0)>0x10ff?2:1;if(weight>169){description+='…';break;}description+=char;}
  const prefix=new Date(event.start)>now?'On my watchlist:':endTime(event)>now?'I’m watching':'Worth a listen:';
  return {title:`${event.title} | Classical Watch`,text:`${prefix} ${description} — found on Classical Watch.`,url:url.href};
}

export function xShareUrl(text,url){
  const intent=new URL('https://twitter.com/intent/tweet');
  intent.searchParams.set('text',text);intent.searchParams.set('url',url);
  return intent.href;
}

let dialog,details;
function setupDialog(){
  dialog=document.createElement('dialog');dialog.className='share-dialog';
  dialog.setAttribute('aria-labelledby','share-heading');
  dialog.innerHTML=`<div class="share-heading"><h2 id="share-heading">Share this performance</h2><button type="button" class="calendar-button" data-close>Close</button></div>
    <p class="share-intro">Invite someone to listen. The link brings them to this concert on Classical Watch.</p>
    <label for="share-message">Your message<textarea id="share-message" rows="4"></textarea></label>
    <label for="share-url">Performance link<input id="share-url" type="url" readonly></label>
    <div class="share-actions"><a class="watch" data-x target="_blank" rel="noopener noreferrer">Share on X</a><button type="button" class="calendar-button" data-copy-post>Copy message &amp; link</button><button type="button" class="calendar-button" data-copy-link>Copy link</button><button type="button" class="calendar-button" data-native hidden>More options…</button></div>
    <p class="share-status" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const find=selector=>dialog.querySelector(selector),message=find('textarea'),url=find('input'),status=find('[role="status"]');
  find('[data-close]').onclick=()=>dialog.close();
  message.oninput=()=>{find('[data-x]').href=xShareUrl(message.value,details.url);status.textContent='';};
  async function copy(text,success,field){
    status.textContent='';
    try{await navigator.clipboard.writeText(text);status.textContent=success;}
    catch{field.focus();field.select();status.textContent='Copying is unavailable in this browser. Select and copy the message or link above.';}
  }
  find('[data-copy-post]').onclick=()=>copy(`${message.value}\n${details.url}`,'Message and link copied.',message);
  find('[data-copy-link]').onclick=()=>copy(details.url,'Link copied.',url);
  find('[data-native]').onclick=async()=>{
    status.textContent='';
    try{await navigator.share({...details,text:message.value});}
    catch(error){if(error.name!=='AbortError')status.textContent='Sharing is unavailable here. You can copy the message and link or share on X.';}
  };
}

export function createShareButton(event){
  const button=document.createElement('button');button.type='button';button.className='share-button';
  button.textContent='Share performance';button.setAttribute('aria-label',`Share ${event.title}`);button.setAttribute('aria-haspopup','dialog');
  button.onclick=()=>{
    if(!dialog)setupDialog();details=shareDetails(event);
    dialog.querySelector('textarea').value=details.text;dialog.querySelector('input').value=details.url;
    dialog.querySelector('[data-x]').href=xShareUrl(details.text,details.url);
    dialog.querySelector('[data-native]').hidden=typeof navigator.share!=='function';
    dialog.querySelector('[role="status"]').textContent='';dialog.showModal();
  };
  return button;
}
