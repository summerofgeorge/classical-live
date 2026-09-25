import {calendar,dayKey,endTime,matches,safeUrl} from './core.js';
const $=id=>document.getElementById(id);
const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const state={period:'upcoming',source:'',type:'',query:'',timeZone};
let data, visible=[];
const format=(date,options,zone=timeZone)=>new Intl.DateTimeFormat(undefined,{...options,timeZone:zone}).format(new Date(date));
function el(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
function link(text,url,className){const node=el('a',text,className);node.href=safeUrl(url)||'#';node.target='_blank';node.rel='noopener noreferrer';return node;}
function download(events){const url=URL.createObjectURL(new Blob([calendar(events)],{type:'text/calendar;charset=utf-8'}));const a=el('a');a.href=url;a.download=events.length===1?`${events[0].id}.ics`:'classical-live.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function reset(){Object.assign(state,{period:'upcoming',source:'',type:'',query:''});['source','type','query'].forEach(id=>$(id).value='');render();}
function render(){
  const now=new Date();visible=data.events.filter(event=>matches(event,state,now));
  document.querySelectorAll('[data-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.period===state.period)));
  $('result-count').textContent=`${visible.length} concert${visible.length===1?'':'s'} · times in ${timeZone.replaceAll('_',' ')}`;
  $('download-all').disabled=!visible.length;
  $('events').replaceChildren();
  if(!visible.length){const empty=el('div',null,'empty');empty.append(el('strong','No concerts in this view.'),el('span','Try another date range or browse all upcoming concerts.'));const button=el('button','Show all upcoming','calendar-button');button.onclick=reset;empty.append(el('br'),button);$('events').append(empty);return;}
  const groups=new Map();for(const event of visible){const key=dayKey(new Date(event.start),timeZone);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}
  for(const events of groups.values()){
    const group=el('section',null,'day-group'),date=new Date(events[0].start), heading=el('h2',null,'day-heading');
    heading.append(el('span',format(date,{weekday:'long'}),'weekday'),el('span',format(date,{day:'numeric'}),'day-number'),el('span',format(date,{month:'long',year:'numeric'})));
    const list=el('div',null,'concerts');group.append(heading,list);
    for(const event of events){
      const card=el('article',null,'concert'),time=el('div',null,'concert-time');const timeElement=el('time',format(event.start,{hour:'numeric',minute:'2-digit'}));timeElement.dateTime=event.start;time.append(timeElement);
      time.append(el('small',format(event.start,{timeZoneName:'short'}).split(' ').pop()));
      if(new Date(event.start)<=now && endTime(event)>now)time.append(el('span','Scheduled now','now'));
      const info=el('div',null,'concert-info');info.append(el('p',event.institution,'institution'),el('h3',event.title));
      if(event.program)info.append(el('p',event.program,'program'));
      const meta=el('div',null,'metadata');meta.append(el('span',event.type),el('span','Free stream'));
      info.append(meta);
      const original=el('p',null,'program');original.append(el('span',`Source time: ${format(event.start,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'},event.timezone)} · `),link('Event details',event.event_url,'source-link'));info.append(original);
      if(event.stale)info.append(el('p','Could not recheck this listing. Confirm the time and stream on the source page.','program'));
      if(event.verification_method==='browser')info.append(el('p',`Browser-checked ${format(event.last_verified_at,{month:'short',day:'numeric'})}; not automatically rechecked. Confirm details on the school’s page.`,'program'));
      const actions=el('div',null,'actions'),watch=link(event.watch_kind==='channel'?'Watch channel':'Watch stream',event.stream_url,'watch');watch.setAttribute('aria-label',`Watch ${event.title}`);
      const save=el('button','Add to calendar','calendar-button');save.type='button';save.setAttribute('aria-label',`Add ${event.title} to calendar`);save.onclick=()=>download([event]);actions.append(watch,save);
      if(event.watch_kind==='channel')actions.append(el('small','Opens the school’s official video channel.'));
      if(event.watch_note)actions.append(el('small',event.watch_note));
      card.append(time,info,actions);list.append(card);
    }
    $('events').append(group);
  }
}
async function load(){
  $('timezone').textContent=timeZone.replaceAll('_',' ');
  try{
    const response=await fetch('./events.json',{cache:'no-cache'});if(!response.ok)throw new Error('Calendar unavailable');
    data=await response.json();if(data.schema_version!==1||!Array.isArray(data.events))throw new Error('Invalid calendar');
    data.events=data.events.filter(e=>e.id&&e.title&&Number.isFinite(Date.parse(e.start))&&safeUrl(e.stream_url)&&safeUrl(e.event_url)).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
    $('updated').textContent=`Checked ${format(data.generated_at,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
    for(const source of data.sources){
      if(source.collection==='browser'&&Date.parse(source.valid_until)<=Date.now())source.status='review_due';
      const option=el('option',source.name);option.value=source.id;$('source').append(option);
      const li=el('li'),label=source.status==='manual'?'browser-checked; manual updates':source.status==='review_due'?'browser review expired; new check needed':source.status==='ok'?'checked successfully':'refresh needs attention';
      li.append(link(source.name,source.url),el('span',` — ${label}${source.last_success?'; last successful check '+format(source.last_success,{month:'short',day:'numeric'}):''}.`));$('source-status').append(li);
    }
    for(const type of [...new Set(data.events.map(e=>e.type))].sort()){const option=el('option',type);option.value=type;$('type').append(option);}
    const old=Date.now()-Date.parse(data.generated_at)>2*86400000, failed=data.sources.some(s=>!['ok','manual'].includes(s.status));
    if(old||failed){$('notice').hidden=false;$('notice').textContent=old?'This calendar has not been refreshed in over two days. Check each school’s event page before making plans.':'Some sources could not be refreshed. Previously verified listings are marked; check the source before watching.';}
    $('events').setAttribute('aria-busy','false');render();setInterval(render,60000);
  }catch(error){$('events').setAttribute('aria-busy','false');$('events').replaceChildren(el('p','The calendar could not be loaded. Please reload the page, or use the school links below.','empty'));$('updated').textContent='Calendar unavailable';$('source-status').append(el('li','Sources: Curtis Institute of Music and Cleveland Institute of Music.'));}
}
document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{state.period=button.dataset.period;if(data)render();});
for(const id of ['source','type','query'])$(id).addEventListener(id==='query'?'input':'change',()=>{state[id]=$(id).value;if(data)render();});
$('download-all').onclick=()=>download(visible);
load();
