import {calendar,dayKey,endTime,matches,safeUrl,periodRange} from './core.js';
import {schoolInfo} from './schools.js';
import {createShareButton} from './share.js';
import {scheduleHealth} from './freshness.js';
const $=id=>document.getElementById(id);
const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const filterIds=['source','type','query','region','country','size'];
const state={period:'all',...Object.fromEntries(filterIds.map(id=>[id,''])),timeZone};
let data, visible=[];
const sharedEventId=new URLSearchParams(location.search).get('event');
const format=(date,options,zone=timeZone)=>new Intl.DateTimeFormat(undefined,{...options,timeZone:zone}).format(new Date(date));
function el(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
function link(text,url,className){const node=el('a',text,className);node.href=safeUrl(url)||'#';node.target='_blank';node.rel='noopener noreferrer';return node;}
function download(events){const url=URL.createObjectURL(new Blob([calendar(events)],{type:'text/calendar;charset=utf-8'}));const a=el('a');a.href=url;a.download=events.length===1?`${events[0].id}.ics`:'classical-live.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function reset(){state.period='all';filterIds.forEach(id=>{state[id]='';$(id).value='';});render();}
function render(){
  const now=new Date();visible=data.events.filter(event=>matches(event,state,now));
  $('reset-filters').hidden=state.period==='all'&&!filterIds.some(id=>state[id]);
  document.querySelectorAll('[data-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.period===state.period)));
  const range=periodRange(state.period,timeZone,now);
  const last=range.last||dayKey(new Date(Date.parse(data.generated_at)+(data.horizon_days||45)*86400000),timeZone);
  const shortDay=day=>format(`${day}T12:00:00Z`,{weekday:'short',month:'short',day:'numeric',...(day.slice(0,4)!==range.first.slice(0,4)?{year:'numeric'}:{})},'UTC');
  const dates=range.first===last?shortDay(range.first):`${shortDay(range.first)} – ${shortDay(last)}`;
  const context={all:'All listed dates',today:'Today',tomorrow:'Tomorrow',week:'Seven days, including today',weekend:'Weekend dates (Friday–Sunday)'}[state.period];
  $('period-description').textContent=`${context} · ${dates}.${range.first===dayKey(now,timeZone)?' Includes concerts that started earlier today.':''}`;
  $('result-count').textContent=`${visible.length} concert${visible.length===1?'':'s'} · times in ${timeZone.replaceAll('_',' ')}`;
  $('download-all').disabled=!visible.length;
  $('events').replaceChildren();
  if(!visible.length){const empty=el('div',null,'empty');empty.append(el('strong','No concerts in this view.'),el('span','Try another date range or browse all listed concerts.'));const button=el('button','Show all dates','calendar-button');button.onclick=reset;empty.append(el('br'),button);$('events').append(empty);return;}
  const groups=new Map();for(const event of visible){const key=dayKey(new Date(event.start),timeZone);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);}
  for(const [key,events] of groups){
    const group=el('section',null,'day-group'),date=new Date(events[0].start), heading=el('h2',null,'day-heading');
    const today=key===dayKey(now,timeZone);group.classList.toggle('is-today',today);
    heading.id=`day-${key}`;group.setAttribute('aria-labelledby',heading.id);
    heading.append(el('span',`${today?'Today · ':''}${format(date,{weekday:'long'})}`,'weekday'),el('span',format(date,{day:'numeric'}),'day-number'),el('span',format(date,{month:'long',year:'numeric'}),'day-month'),el('span',`${events.length} concert${events.length===1?'':'s'}`,'day-count'));
    const list=el('div',null,'concerts');group.append(heading,list);
    for(const event of events){
      const card=el('article',null,'concert'),time=el('div',null,'concert-time');card.id=`concert-${event.id}`;card.dataset.performance=event.type;card.classList.toggle('shared-concert',event.id===sharedEventId);const timeElement=el('time',format(event.start,{hour:'numeric',minute:'2-digit'}));timeElement.dateTime=event.start;time.append(timeElement);
      time.append(el('small',format(event.start,{timeZoneName:'short'}).split(' ').pop()));
      if(new Date(event.start)<=now && endTime(event)>now)time.append(el('span','Scheduled now','now'));
      else if(new Date(event.start)<=now)time.append(el('span','Started earlier','earlier'));
      const info=el('div',null,'concert-info');if(event.id===sharedEventId)info.append(el('p','Shared performance','shared-label'));info.append(el('p',event.institution,'institution'),el('h3',event.title));
      if(event.program)info.append(el('p',event.program,'program'));
      const meta=el('div',null,'metadata');meta.append(el('span',event.type,'performance-tag'),el('span','Free stream'));
      info.append(meta);
      const original=el('p',null,'program source-time');original.append(el('span',`Source time: ${format(event.start,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'},event.timezone)} · `),link('Event details',event.event_url,'source-link'));info.append(original);
      if(event.stale)info.append(el('p',`Schedule last confirmed ${format(event.last_verified_at,{month:'short',day:'numeric'})}. The latest check did not complete; use Event details to check for time changes or cancellations.`,'program'));
      if(event.verification_method==='browser')info.append(el('p',`Manually checked ${format(event.last_verified_at,{month:'short',day:'numeric'})}. Confirm the latest details with the school.`,'program'));
      const actions=el('div',null,'actions'),watch=link(event.watch_kind==='channel'?'Watch channel':event.watch_kind==='registration'?'Register to watch':'Watch stream',event.stream_url,'watch');watch.setAttribute('aria-label',`${event.watch_kind==='registration'?'Register to watch':'Watch'} ${event.title}`);
      const save=el('button','Add to calendar','calendar-button');save.type='button';save.setAttribute('aria-label',`Add ${event.title} to calendar`);save.onclick=()=>download([event]);actions.append(watch,save,createShareButton(event));
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
    data.events=data.events.filter(e=>e.id&&e.title&&Number.isFinite(Date.parse(e.start))&&safeUrl(e.stream_url)&&safeUrl(e.event_url)).map(e=>({...e,...schoolInfo(e.source)})).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
    $('updated').textContent=`Checked ${format(data.generated_at,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
    for(const source of [...data.sources].sort((a,b)=>a.name.localeCompare(b.name))){
      if(source.collection==='browser'&&Date.parse(source.valid_until)<=Date.now())source.status='review_due';
      const option=el('option',source.name);option.value=source.id;$('source').append(option);
      const school=schoolInfo(source.id),li=el('li'),details=el('span',` — ${[school.city,school.country].filter(Boolean).join(', ')}. Music enrollment: `);
      li.append(link(source.name,source.url),details);
      if(school.enrollment)li.append(link(`${school.enrollment.label}${school.enrollment.year?' ('+school.enrollment.year+')':''}`,school.enrollment.url));else li.append(el('span','Not listed'));
      li.append(el('span',source.status==='review_due'?'. New schedule check needed.':source.status==='error'?'. Check the school for the latest schedule.':source.last_success?`. Checked ${format(source.last_success,{month:'short',day:'numeric'})}.`:'.'));
      $('source-status').append(li);
    }
    for(const type of [...new Set(data.events.map(e=>e.type))].sort()){const option=el('option',type);option.value=type;$('type').append(option);}
    for(const key of ['region','country'])for(const value of [...new Set(data.sources.map(s=>schoolInfo(s.id)[key]).filter(Boolean))].sort()){const option=el('option',value);option.value=value;$(key).append(option);}
    const {old,issues}=scheduleHealth(data);
    if(old||issues.length){
      const notice=$('notice');notice.hidden=false;
      notice.append(el('strong',old?'The calendar needs a fresh schedule check.':`${issues.length} school schedule${issues.length===1?' needs':'s need'} another check.`));
      notice.append(el('p',old?'The calendar has not been updated in over two days. Concert times or cancellations may have changed; check the school’s Event details page before watching.':'We could not confirm the latest concert times and cancellations for the schools below. Their streams may still work; check the school’s event page for the latest schedule.'));
      if(issues.length){const details=el('details'),summary=el('summary',`Affected schools (${issues.length})`),list=el('ul');details.open=issues.length<=3;
        for(const source of issues){const row=el('li'),checked=source.last_success?format(source.last_success,{month:'short',day:'numeric'}):null;
          const explanation=source.reviewDue?'Another manual review is due. Older listings are hidden.':source.hasOlderListings?`Showing earlier information${checked?' checked '+checked:''}; affected concerts are marked below.`:'New concerts from this school may be missing until its schedule can be checked again.';
          row.append(link(source.name,source.url),el('span',' — '+explanation));list.append(row);
        }details.append(summary,list);notice.append(details);
      }
    }
    $('events').setAttribute('aria-busy','false');render();
    if(sharedEventId){
      const sharedCard=$(`concert-${sharedEventId}`);
      if(sharedCard){sharedCard.tabIndex=-1;sharedCard.focus({preventScroll:true});sharedCard.scrollIntoView({block:'center'});}
      else{const notice=el('p','This shared performance is no longer listed. Browse upcoming concerts below.','notice');$('events').before(notice);}
    }
    setInterval(()=>{if(!document.querySelector('dialog[open]')&&!$('events').contains(document.activeElement))render();},60000);
  }catch(error){$('events').setAttribute('aria-busy','false');$('events').replaceChildren(el('p','The calendar could not be loaded. Please reload the page, or use the school links below.','empty'));$('updated').textContent='Calendar unavailable';$('source-status').append(el('li','Sources: Curtis Institute of Music and Cleveland Institute of Music.'));}
}
document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{state.period=button.dataset.period;if(data)render();});
for(const id of filterIds)$(id).addEventListener(id==='query'?'input':'change',()=>{state[id]=$(id).value;if(data)render();});
$('reset-filters').onclick=()=>{if(data)reset();};
$('download-all').onclick=()=>download(visible);
load();
