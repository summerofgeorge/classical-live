import {load} from 'cheerio';
import {liveWhaleWindow} from './livewhale.mjs';
const eastern='America/New_York';
const bwIndex='https://www.bw.edu/events/_data/current.json';
const bgsuLive='https://www.bgsu.edu/musical-arts/events/live-streaming.html';
const duqLive='https://www.duq.edu/academics/colleges-and-schools/music/iemma/iemma-broadcast-network.php';
const caseIndex='https://case.edu/artsci/music/news-events/upcoming-concerts-events';
const cmuFeed='https://events.cmu.edu/live/json/events/group/School%20of%20Music/response_fields/description,summary,tags/max/100';
export const greatLakesSources=[
 {id:'baldwin-wallace',name:'Baldwin Wallace University Conservatory of Performing Arts',url:'https://www.bw.edu/events/',timezone:eastern},
 {id:'bgsu',name:'Bowling Green State University College of Musical Arts',url:bgsuLive,timezone:eastern},
 {id:'carnegie-mellon',name:'Carnegie Mellon University School of Music',url:'https://events.cmu.edu/music/',timezone:eastern},
 {id:'duquesne',name:'Duquesne University Mary Pappert School of Music',url:duqLive,timezone:eastern},
 {id:'pittsburgh',name:'University of Pittsburgh Department of Music',url:'https://calendar.pitt.edu/department/department_of_music',timezone:eastern},
 {id:'case-western',name:'Case Western Reserve University Department of Music',url:caseIndex,timezone:eastern}
];
export const greatLakesHosts=['www.bw.edu','www.bgsu.edu','events.bgsu.edu','events.cmu.edu','www.duq.edu','calendar.pitt.edu','case.edu'];
export function createGreatLakes({clean,zonedTime,clock24,namedDate,DAY}){
 const cancelled=text=>/\bcancel(?:led|ed)\b|\bpostponed\b|\bno (?:public )?(?:live)?stream\b|\bnot (?:be )?(?:live)?streamed\b/i.test(text||'');
 const outOfScope=text=>/\bjazz\b|\blecture\b|\bcolloquium\b|\bdissertation\b|\bcomposer talk\b|\bfaculty scholar\b|\bOMEA\b|\bhigh school honor\b/i.test(text||'');
 const current=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;
 function official(href,origin,prefix='/'){
  const u=new URL(href,origin);
  if(u.origin!==origin||!u.pathname.startsWith(prefix)||u.username||u.password)throw new Error('Unexpected official event URL');
  return u.href;
 }
 function stamp(value){
  const normalized=value?.replace(/([+-]\d{2})(\d{2})$/,'$1:$2');
  const m=normalized?.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?)([+-]\d\d:\d\d)$/);
  if(!m||!Number.isFinite(Date.parse(normalized)))throw new Error('Eastern event timestamp missing');
  const result=zonedTime(m[1],eastern);
  if(Date.parse(result)!==Date.parse(normalized))throw new Error('Event offset disagrees with Eastern time');
  return result;
 }
 function event(title,start,url,stream,evidence,watch_kind='direct',extra={}){
  return {title,start,end:null,program:'',event_url:url,stream_url:stream,watch_kind,evidence_url:url,evidence,...extra};
 }
 function parseBaldwinWallace(html,item){
  const $=load(html),body=$('.events-detail .content-detail'),title=clean(body.find('h1').text());
  if(!body.length||!title)throw new Error('Baldwin Wallace event layout changed');
  if(cancelled(title+' '+body.text())||outOfScope(title))return null;
  const heading=body.find('h2').filter((i,h)=>/^watch it live$/i.test(clean($(h).text()))).first();
  const link=heading.nextUntil('h2').find('a[href]').filter((i,a)=>/^live stream$/i.test(clean($(a).text()))).first();
  const stream=link.attr('href');
  // "Link coming soon" is not a usable broadcast destination.
  if(!stream||!/^https:\/\/boxcast\.tv\/view\/[\w-]+$/.test(stream))return null;
  const raw=html.match(/\bvar thisCurrentEvent\s*=\s*(\[\{.*?\}\]);/s)?.[1];
  if(!raw)throw new Error('Baldwin Wallace event date metadata missing');
  const detail=JSON.parse(raw);
  if(detail.length!==1||detail[0].timezone!==eastern||detail[0].allDay!=='false'||detail[0].recurringEvent!=='false'||clean(detail[0].title)!==title||clean(item.title)!==title||detail[0].startDate!==item.startDate||detail[0].endDate!==item.endDate)throw new Error('Baldwin Wallace calendar and detail disagree');
  return event(title,stamp(item.startDate),official(item.url,'https://www.bw.edu','/events/'),stream,'Official conservatory concert is tagged Live Stream and provides a dated BoxCast viewing link.','direct',{id:`baldwin-wallace-${item.id}`,end:stamp(item.endDate)});
 }
 async function baldwinWallace(get,now){
  const feed=await get(bwIndex,true);
  if(!Array.isArray(feed.events)||!feed.lastPublished)throw new Error('Baldwin Wallace calendar format changed');
  const items=feed.events.filter(e=>['Concerts','Conservatory','Live Stream'].every(tag=>e.filter1?.includes(tag))&&!cancelled(e.title)&&!outOfScope(e.title)&&e.allDay==='false'&&e.recurringEvent==='false'&&current(stamp(e.startDate),now));
  if(items.length>40)throw new Error('Baldwin Wallace event budget exceeded');
  const events=[];
  for(const item of items){const url=official(item.url,'https://www.bw.edu','/events/'),parsed=parseBaldwinWallace(await get(url),item);if(parsed)events.push(parsed);}
  return events;
 }
 function parseLocalist(payload,school,now){
  if(!Array.isArray(payload.events)||!payload.page||!Number.isInteger(payload.page.total))throw new Error('Regional Localist feed format changed');
  const events=[];
  for(const wrapper of payload.events){
   const e=wrapper.event;if(!e||!Array.isArray(e.event_instances))throw new Error('Regional Localist event format changed');
   if(e.private||e.rejected||e.status!=='live'||e.publish_status!=='published'||cancelled(e.title+' '+clean(e.description))||outOfScope(e.title+' '+(e.tags||[]).join(' ')))continue;
   let stream,evidence,origin;
   if(school==='bgsu'){
    if(!e.groups?.some(g=>g.id===19572)||!e.tags?.some(t=>/^livestream$/i.test(t))||!e.tags?.some(t=>/^free$/i.test(t)))continue;
    origin='https://events.bgsu.edu';stream='https://www.youtube.com/user/bgsumusic';
    evidence='Official College of Musical Arts event is tagged Livestream and free; the school directs livestream viewers to its public YouTube channel.';
   }else if(school==='pittsburgh'){
    if(!e.departments?.some(g=>g.id===20564)||!e.free||!['hybrid','virtual'].includes(e.experience)||!/^https:\/\/(?:www\.)?youtube\.com\/@musicatpitt\/?$/.test(e.stream_url||''))continue;
    origin='https://calendar.pitt.edu';stream=e.stream_url;
    evidence='Official Department of Music event is free and explicitly supplies its public YouTube stream destination.';
   }else throw new Error('Unknown regional Localist school');
   const url=official(e.localist_url,origin,'/event/');
   for(const {event_instance:i} of e.event_instances){
    if(!i||!i.id)throw new Error('Regional Localist occurrence missing');
    if(i.all_day)continue;
    const start=stamp(i.start);if(!current(start,now))continue;
    events.push(event(clean(e.title),start,url,stream,evidence,'channel',{id:`${school}-${e.id}-${i.id}`,end:i.end?stamp(i.end):null,watch_note:'Choose this performance on the school’s YouTube channel.'}));
   }
  }return events;
 }
 async function localist(get,now,school){
  const origin=school==='bgsu'?'https://events.bgsu.edu':'https://calendar.pitt.edu';
  const query=school==='bgsu'?'group_id=19572&keyword=Livestream':'group_id=20564';
  const events=[];let total=1;
  for(let page=1;page<=total;page++){
   if(page>3)throw new Error('Regional Localist pagination budget exceeded');
   const payload=await get(`${origin}/api/2/events?${query}&days=45&pp=100&page=${page}`,true);
   events.push(...parseLocalist(payload,school,now));
   if(payload.page.current!==page||payload.page.total<0)throw new Error('Regional Localist pagination changed');
   total=payload.page.total;
  }return events;
 }
 async function bgsu(get,now){
  const $=load(await get(bgsuLive));
  if(!$('a[href="https://www.youtube.com/user/bgsumusic"]').length||!/We live stream on our YouTube channel/i.test($.text()))throw new Error('BGSU public viewing destination changed');
  return localist(get,now,'bgsu');
 }
 function parseCarnegieMellon(payload,now){
  if(!Array.isArray(payload.data)||!payload.meta||payload.meta.total_pages>1)throw new Error('Carnegie Mellon feed format or page limit changed');
  const events=[];
  for(const e of payload.data){
   if(e.is_canceled||e.is_all_day||e.gid!==46||cancelled(e.title+' '+clean(e.description))||outOfScope(e.title))continue;
   const $=load(e.description||''),link=$('a[href]').filter((i,a)=>/^watch the livestream video here$/i.test(clean($(a).text()))).first();
   const stream=link.attr('href');if(!stream||!/^https:\/\/(?:www\.)?youtube\.com\/(?:live\/[\w-]{11}(?:\?|$)|watch\?v=[\w-]{11}(?:&|$))/.test(stream))continue;
   const start=stamp(e.date_iso);if(!current(start,now))continue;
   if(Date.parse(start)!==Number(e.date_ts)*1000)throw new Error('Carnegie Mellon date metadata disagrees');
   events.push(event(clean(e.title),start,official(e.url,'https://events.cmu.edu','/music/event/'),stream,'Official dated School of Music event links this public YouTube livestream. Physical ticket charges do not apply to the public stream.','direct',{id:`carnegie-mellon-${e.id}`,end:e.date2_iso?stamp(e.date2_iso):null}));
  }return events;
 }
 function parseDuquesne(html,now){
  const $=load(html),section=$('section.events-feature').filter((i,s)=>/^upcoming live streams$/i.test(clean($(s).find('h2.section-heading__heading').text())));
  if(section.length!==1||!$('iframe[aria-label="Iemma livestream"][src^="https://vimeo.com/event/"]').length)throw new Error('Duquesne livestream schedule or public player changed');
  const cards=section.find('.events-feature__item');
  if(!cards.length&&!/no upcoming/i.test(section.text()))throw new Error('Duquesne livestream entries missing');
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],events=[];
  for(const card of cards.toArray()){
   const item=$(card),title=clean(item.find('h3.events-feature__item__heading').text());
   if(cancelled(item.text())||outOfScope(title))continue;
   const times=item.find('time').toArray().map(t=>clean($(t).text())),date=times[0]?.match(/^([A-Z][a-z]{2})\.?\s+(\d{1,2}),\s+(\d{4})$/);
   if(!title||!date||times.length!==3||!months.includes(date[1]))throw new Error('Duquesne visible dates changed');
   // The site's datetime attributes contain incorrect years and minutes; use printed values.
   const day=`${date[3]}-${String(months.indexOf(date[1])+1).padStart(2,'0')}-${date[2].padStart(2,'0')}`;
   const start=zonedTime(day+'T'+clock24(times[1]),eastern),end=zonedTime(day+'T'+clock24(times[2]),eastern);
   if(!current(start,now))continue;
   const href=item.find('a[href*="#event-details/"]').attr('href');if(!href)throw new Error('Duquesne event link missing');
   const url=official(href,'https://www.duq.edu');
   events.push(event(title,start,url,duqLive,'Included in the official Upcoming Live Streams schedule beside its public Iemma video player.','venue',{end,evidence_url:duqLive,watch_note:'Use the Iemma video player on this page.'}));
  }return events;
 }
 function parseCaseWestern(html,url){
  const $=load(html),body=$('article.event-detail-page .field--name-field-event-description'),title=clean($('h1.page-header').text());
  if(!body.length||!title)throw new Error('Case Western event layout changed');
  // Shared venue links at the bottom of all event pages do not establish streaming.
  const header=body.children('p').first(),text=clean(header.text());
  if(cancelled(title+' '+text)||outOfScope(title)||!/Format:\s*(?:In-Person & Virtual|In Person \/ Livestream)/i.test(text)||!/(?:Tickets:\s*Free\s*\||Admission:\s*Free & Open to the Public)/i.test(text)||!/Watch:/i.test(text))return null;
  const destinations=['https://case.edu/maltzcenter/livestream-silver-hall','https://case.edu/livestream/harkness','https://case.edu/artsci/music/harkness-live-stream','https://case.edu/artsci/music/facilities-policies/buildings-access/harkness-chapel/harkness-livestream'];
  const stream=header.find('a[href]').toArray().map(a=>$(a).attr('href')).find(href=>destinations.includes(href));if(!stream)return null;
  const date=text.match(/Date:\s*.*?([A-Z][a-z]+ \d{1,2}, \d{4})\s*Time:/)?.[1],time=text.match(/Time:\s*(.*?)\s*Location/)?.[1];
  if(!date||!time)throw new Error('Case Western concert date missing');
  return event(title,zonedTime(namedDate(date)+'T'+clock24(time),eastern),url,stream,'Official concert header explicitly offers free virtual admission and a Watch livestream link.','venue',{watch_note:'Use the venue’s video player on this page.'});
 }
 async function caseWestern(get,now){
  let next=caseIndex;const pages=new Set(),seen=new Set(),events=[];
  while(next){
   if(pages.has(next)||pages.size>=6)throw new Error('Case Western pagination budget exceeded');pages.add(next);
   const $=load(await get(next)),view=$('.view-event-listing');if(!view.length)throw new Error('Case Western calendar layout changed');
   const links=view.find('h2 a[href]');
   if(!links.length&&!/no (?:events|results)/i.test(view.text()))throw new Error('Case Western calendar entries missing');
   for(const link of links.toArray()){
    if(cancelled($(link).text())||outOfScope($(link).text()))continue;
    const url=official($(link).attr('href'),'https://case.edu','/artsci/music/news-events/upcoming-concerts-events/');
    if(seen.has(url))continue;seen.add(url);if(seen.size>50)throw new Error('Case Western event budget exceeded');
    const parsed=parseCaseWestern(await get(url),url);if(parsed&&current(parsed.start,now))events.push(parsed);
   }
   const href=view.find('a[rel="next"]').attr('href');next=href?official(new URL(href,next).href,'https://case.edu',new URL(caseIndex).pathname):null;
  }return events;
 }
 return {adapters:{'baldwin-wallace':baldwinWallace,bgsu,'carnegie-mellon':async(get,now)=>parseCarnegieMellon(await get(liveWhaleWindow(cmuFeed,now,eastern),true),now),duquesne:async(get,now)=>parseDuquesne(await get(duqLive),now),pittsburgh:async(get,now)=>localist(get,now,'pittsburgh'),'case-western':caseWestern},parsers:{parseBaldwinWallace,parseLocalist,parseCarnegieMellon,parseDuquesne,parseCaseWestern}};
}
