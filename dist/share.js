import {endTime} from './core.js';

const siteUrl='https://classicalwatch.stringfestanalytics.com/';
export function shareDetails(event,now=new Date()){
  const url=new URL(siteUrl);url.searchParams.set('event',event.id);
  const subject=`${event.title} (${event.institution})`;
  let description='',weight=0;
  for(const char of subject){weight+=char.codePointAt(0)>0x10ff?2:1;if(weight>169){description+='…';break;}description+=char;}
  const prefix=new Date(event.start)>now?'On my watchlist:':endTime(event)>now?'I’m watching':'Worth a listen:';
  const timeZone=event.timezone||'UTC';
  const when=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(event.start));
  const performance=[event.title,event.institution,`${when} (${timeZone})`,event.watch_note].filter(Boolean).join('\n');
  return {title:`${event.title} | Classical Watch`,text:`${prefix} ${description} — found on Classical Watch.`,url:url.href,performance};
}

export function xShareUrl(text,url){
  const intent=new URL('https://twitter.com/intent/tweet');
  intent.searchParams.set('text',text);intent.searchParams.set('url',url);
  return intent.href;
}

export function facebookShareUrl(url){
  const intent=new URL('https://www.facebook.com/sharer/sharer.php');
  intent.searchParams.set('u',url);return intent.href;
}
export const invitationBody=(details,message)=>`${message}\n\n${details.performance}\n\n${details.url}`;
export const emailShareUrl=(details,message)=>`mailto:?subject=${encodeURIComponent(details.title.replace(/[\r\n]+/g,' '))}&body=${encodeURIComponent(invitationBody(details,message).replace(/\r?\n/g,'\r\n'))}`;
export const smsShareUrl=(details,message,apple=false)=>`sms:${apple?'&':'?'}body=${encodeURIComponent(invitationBody(details,message))}`;

let dialog,details;
function setupDialog(){
  dialog=document.createElement('dialog');dialog.className='share-dialog';
  dialog.setAttribute('aria-labelledby','share-heading');
  dialog.innerHTML=`<div class="share-heading"><h2 id="share-heading">Share this performance</h2><button type="button" class="calendar-button" data-close>Close</button></div>
    <p class="share-intro">Invite someone to listen. The link brings them to this concert on Classical Watch.</p>
    <label for="share-message">Your message<textarea id="share-message" rows="4"></textarea></label>
    <label for="share-url">Performance link<input id="share-url" type="url" readonly></label>
    <div class="share-actions"><a class="watch" data-email>Email</a><a class="watch" data-sms>Text message</a><a class="calendar-button" data-facebook target="_blank" rel="noopener noreferrer">Share on Facebook</a><a class="calendar-button" data-x target="_blank" rel="noopener noreferrer">Share on X</a><button type="button" class="calendar-button" data-copy-post>Copy details &amp; link</button><button type="button" class="calendar-button" data-copy-link>Copy link</button><button type="button" class="calendar-button" data-native hidden>More options…</button></div>
    <p class="share-help">Email and text include the concert details and time zone. Choose a recipient in your app, then send. Facebook opens the link; add your message there. You can also copy the details if an app doesn’t open.</p>
    <details class="share-details"><summary>Concert details included with email and text</summary><p data-details></p></details>
    <figure class="share-preview"><img src="./social-card-v3.jpg" width="1200" height="630" alt="Classical Watch — Free classical livestreams, beside a photograph of a cello."><figcaption>Link preview image. Availability and appearance vary by app.</figcaption></figure>
    <textarea data-copy-fallback aria-label="Text to copy manually" rows="6" readonly hidden></textarea>
    <p class="share-status" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const find=selector=>dialog.querySelector(selector),message=find('textarea'),url=find('input'),status=find('[role="status"]');
  find('[data-close]').onclick=()=>dialog.close();
  message.oninput=()=>{updateLinks();status.textContent='';};
  async function copy(text,success){
    status.textContent='';
    try{await navigator.clipboard.writeText(text);status.textContent=success;}
    catch{const fallback=find('[data-copy-fallback]');fallback.hidden=false;fallback.value=text;fallback.focus();fallback.select();status.textContent='Copying is unavailable in this browser. Copy the selected text above.';}
  }
  find('[data-copy-post]').onclick=()=>copy(invitationBody(details,message.value),'Concert details and link copied.');
  find('[data-copy-link]').onclick=()=>copy(details.url,'Link copied.');
  find('[data-native]').onclick=async()=>{
    status.textContent='';
    try{await navigator.share({title:details.title,text:`${message.value}\n\n${details.performance}`,url:details.url});}
    catch(error){if(error.name!=='AbortError')status.textContent='Sharing is unavailable here. You can copy the details and link or use a sharing button above.';}
  };
}

function updateLinks(){
  const message=dialog.querySelector('textarea').value;
  const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  dialog.querySelector('[data-x]').href=xShareUrl(message,details.url);
  dialog.querySelector('[data-facebook]').href=facebookShareUrl(details.url);
  dialog.querySelector('[data-email]').href=emailShareUrl(details,message);
  dialog.querySelector('[data-sms]').href=smsShareUrl(details,message,apple);
}

export function createShareButton(event){
  const button=document.createElement('button');button.type='button';button.className='share-button';
  button.textContent='Share performance';button.setAttribute('aria-label',`Share ${event.title}`);button.setAttribute('aria-haspopup','dialog');
  button.onclick=()=>{
    if(!dialog)setupDialog();details=shareDetails(event);
    dialog.querySelector('textarea').value=details.text;dialog.querySelector('input').value=details.url;
    dialog.querySelector('[data-details]').textContent=details.performance;
    dialog.querySelector('[data-copy-fallback]').hidden=true;
    updateLinks();
    dialog.querySelector('[data-native]').hidden=typeof navigator.share!=='function';
    dialog.querySelector('[role="status"]').textContent='';dialog.showModal();
  };
  return button;
}
