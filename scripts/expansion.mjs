import {load} from 'cheerio';
import {safeUrl,dayKey} from '../dist/core.js';

export const expansionSources=[
 {id:'indiana',name:'Indiana University Jacobs School of Music',url:'https://liveatjacobs.music.indiana.edu/',timezone:'America/New_York'},
 {id:'ohio-state',name:'Ohio State University School of Music',url:'https://music.osu.edu/events',timezone:'America/New_York'},
 {id:'ohio',name:'Ohio University School of Music',url:'https://www.ohio.edu/fine-arts/music',timezone:'America/New_York'},
 {id:'unt',name:'University of North Texas College of Music',url:'https://recording.music.unt.edu/webcasts',timezone:'America/Chicago'},
 {id:'rcm',name:'Royal College of Music, London',url:'https://www.rcm.ac.uk/events/live/',timezone:'Europe/London'},
 {id:'western',name:'Western University Don Wright Faculty of Music',url:'https://music.uwo.ca/events/livestream/index.html',timezone:'America/Toronto'}
];
export const expansionHosts=['events.iu.edu','liveatjacobs.music.indiana.edu','music.osu.edu','calendar.ohio.edu','recording.music.unt.edu','www.rcm.ac.uk','music.uwo.ca'];
export const indianaFeed='https://events.iu.edu/live/json/v2/events/paginate/false/group_id/56/tag_id/2752/response_fields/summary,image,location';
const rcmIndex='https://www.rcm.ac.uk/events/live/';
const ohioIndex='https://calendar.ohio.edu/api/2/events?keyword=music&days=45&pp=100';
const untIndex='https://recording.music.unt.edu/webcasts';
const westernIndex='https://music.uwo.ca/events/livestream/index.html';

// Reuse the established date validation without a circular module dependency.
export function createExpansion({clean,zonedTime,clock24,namedDate,DAY}){
 const cancelled=text=>/\bcancel(?:led|ed)\b|\bpostponed\b|\bnot (?:be )?(?:live)?streamed\b/i.test(text||'');
 const current=(start,now)=>Date.parse(start)>=+now-DAY&&Date.parse(start)<+now+45*DAY;
 const checkedIso=value=>{if(!value||!/(Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Missing zoned event date');return value;};
 const usableEnd=(start,end)=>end&&Date.parse(end)>Date.parse(start)?checkedIso(end):null;
 function parseIndiana(payload){
  if(payload.meta?.type!=='events'||!Array.isArray(payload.data)||payload.links?.next||payload.meta.total_results!==payload.data.length)throw new Error('Indiana stream feed changed or is incomplete');
  return payload.data.flatMap(e=>{
   if(e.is_canceled||cancelled(e.title)||e.is_all_day||!e.is_online||!e.online_url)return [];
   const stream=safeUrl(e.online_url);if(!stream||new URL(stream).hostname!=='liveatjacobs.music.indiana.edu')return [];
   if(e.timezone!=='America/New_York'||!e.id||!e.title)throw new Error('Indiana event fields changed');
   const start=checkedIso(e.date_iso);
   return [{id:`indiana-${e.id}-${e.date_ts}`,title:e.title,start,end:usableEnd(start,e.date2_iso),program:e.summary,event_url:e.url,stream_url:stream,watch_kind:'venue',watch_note:'Choose the performance on LIVE@jacobs.',evidence_url:indianaFeed,evidence:'Included in the LIVE@jacobs schedule feed with an explicit online viewing link.'}];
  });
 }
 function parseOhioState(html,url){
  const $=load(html),area=$('article.event'),title=clean($('#block-asc-bux-page-title h1').text()),body=area.find('.field--name-body').first();
  if(!area.length||!title||!body.length)throw new Error('Ohio State event layout changed');
  if(cancelled(title)||cancelled(body.text()))return null;
  const link=body.find('a[href]').filter((i,a)=>/livestream|watch.*live/i.test($(a).text())).first();
  const stream=safeUrl(link.attr('href'));if(!stream||!['youtube.com','www.youtube.com','youtu.be'].includes(new URL(stream).hostname))return null;
  if(!/free and open to the public/i.test(body.text()))return null;
  const calendar=area.find('a[href^="https://calendar.google.com/calendar/render"]').first().attr('href');if(!calendar)throw new Error('Ohio State calendar metadata missing');
  const p=new URL(calendar).searchParams,dates=p.get('dates')?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if(!dates||p.get('ctz')!=='America/New_York')throw new Error('Ohio State date format changed');
  const local=n=>`${dates[n]}-${dates[n+1]}-${dates[n+2]}T${dates[n+3]}:${dates[n+4]}:${dates[n+5]}`;
  const start=zonedTime(local(1),'America/New_York'),end=zonedTime(local(7),'America/New_York');
  const printed=area.find('.icon-calendar').parent().text();
  if(namedDate(clean(printed))!==local(1).slice(0,10)||clock24(area.find('.icon-clock').parent().text())!==local(1).slice(11))throw new Error('Ohio State date disagrees with visible schedule');
  return {title,start,end:usableEnd(start,end),program:clean(body.find('p').first().html()),event_url:url,stream_url:stream,watch_kind:'direct',evidence_url:url,evidence:'Official event provides a public YouTube livestream link and verified Eastern calendar metadata.'};
 }
 async function ohioState(get,now){
  let next='https://music.osu.edu/events';const seen=new Set(),pages=new Set(),events=[];
  while(next){
   if(pages.size>=12||pages.has(next))throw new Error('Ohio State pagination limit reached');pages.add(next);
   const $=load(await get(next)),cards=$('.view-events .bux-card');
   if(!cards.length&&!/0 results found/.test($('.view-events').text()))throw new Error('Ohio State calendar changed');
   let beyond=false;
   for(const card of cards.toArray()){
    const item=$(card),dateText=clean(item.find('.event-date-single,.event-date-range').text()),year=dateText.match(/\b(\d{4})\b/)?.[1];
    if(!year)throw new Error('Ohio State calendar year missing');
    const date=namedDate(dateText,year);
    if(date>dayKey(new Date(+now+45*DAY),'America/New_York')){beyond=true;continue;}
    if(cancelled(item.find('.bux-card__heading').text()))continue;
    const href=item.find('.bux-card__heading a').attr('href');if(!href)throw new Error('Ohio State event link missing');
    const url=new URL(href,next).href;
    // The music calendar also advertises other departments' lectures and activities.
    if(new URL(url).hostname!=='music.osu.edu'||!new URL(url).pathname.startsWith('/events/'))continue;
    if(seen.has(url))continue;seen.add(url);if(seen.size>90)throw new Error('Ohio State event limit reached');
    const event=parseOhioState(await get(url),url);if(event)events.push(event);
   }
   const href=$('a[rel="next"]').attr('href');next=href&&!beyond?new URL(href,next).href:null;
  }
  return events;
 }
 function parseOhio(payload){
  if(!Array.isArray(payload.events)||!payload.page)throw new Error('Ohio University feed changed');
  return payload.events.flatMap(({event:e})=>{
   if(!e||e.private||e.rejected||e.status!=='live'||cancelled(e.title)||!e.stream_url)return [];
   const stream=safeUrl(e.stream_url);
   // The calendar's `free` flag describes physical admission and is frequently unset.
   // Admit only the university's explicitly linked public YouTube music channel.
   if(!stream||!/^https:\/\/www\.youtube\.com\/(?:@|c\/)OhioUniversitySchoolofMusic\/?$/.test(stream))return [];
   if(!Array.isArray(e.event_instances)||!e.localist_url)throw new Error('Ohio University event instances missing');
   return e.event_instances.flatMap(({event_instance:i})=>{
    if(i.all_day)return [];const start=checkedIso(i.start);
    return [{id:`ohio-${e.id}-${i.id}`,title:e.title,start,end:usableEnd(start,i.end),program:e.description_text,event_url:e.localist_url,stream_url:stream,watch_kind:'channel',evidence_url:e.localist_url,evidence:'The official event lists Join Stream and links the public Ohio University School of Music YouTube channel.'}];
   });
  });
 }
 async function ohio(get){
  let next=ohioIndex;const events=[],seen=new Set();
  while(next){if(seen.size>=5||seen.has(next))throw new Error('Ohio University pagination limit reached');seen.add(next);const p=await get(next,true);events.push(...parseOhio(p));
   if(p.page.current<p.page.total){const u=new URL(ohioIndex);u.searchParams.set('page',String(p.page.current+1));next=u.href;}else next=null;
  }return events;
 }
 function parseUnt(html){
  const $=load(html),script=$('script').toArray().map(e=>$(e).text()).find(s=>s.includes('kmsReact.Pages.Webcast.HomePage'));
  const m=script?.match(/createElement\(kmsReact\.Pages\.Webcast\.HomePage,\s*(\{[\s\S]*\})\),\s*document\.getElementById/);
  if(!m)throw new Error('North Texas webcast schedule missing');
  const data=JSON.parse(m[1]);if(!Array.isArray(data.upcomingEntries)||!Array.isArray(data.liveEntries))throw new Error('North Texas schedule fields changed');
  // The public landing page advertises the next batch of streams; recorded entries are excluded.
  return [...data.liveEntries,...data.upcomingEntries].flatMap(e=>{
   if(cancelled(e.name))return [];
   const when=e.schedulingData;if(!/^1_[a-z0-9]+$/.test(e.id)||!Number.isFinite(when?.start?.timestamp)||!['US/Central','America/Chicago'].includes(when.start.timeZoneName))throw new Error('North Texas event date missing');
   const start=new Date(when.start.timestamp*1000).toISOString(),end=when.end?.timestamp?new Date(when.end.timestamp*1000).toISOString():null;
   const url=`https://recording.music.unt.edu/media/t/${e.id}`;
   return [{id:`unt-${e.id}`,title:e.name.replace(/\s*\|\s*[A-Z][a-z]+ \d{1,2}, \d{4}$/,''),start,end:usableEnd(start,end),program:'',event_url:url,stream_url:url,watch_kind:'direct',evidence_url:untIndex,evidence:'Public North Texas Live Events page lists this webcast and its scheduled Unix timestamps.'}];
  });
 }
 function parseRcm(html){
  const $=load(html),cards=$('.Listing[id^="event-"]');
  if(!cards.length&&!/no upcoming|check back/i.test($('#content').text()))throw new Error('RCM live schedule missing');
  return cards.toArray().flatMap(card=>{
   const item=$(card),title=clean(item.find('.index-title').text());if(cancelled(title))return [];
   const player=item.find('iframe').attr('src'),video=player?.match(/^https:\/\/www\.youtube\.com\/embed\/([\w-]{11})(?:\?|$)/);if(!video)return [];
   const date=clean(item.find('.ListingText .bold').text()),d=date.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4}),/);if(!d||!title)throw new Error('RCM date missing');
   const start=zonedTime(namedDate(`${d[2]} ${d[1]}, ${d[3]}`)+'T'+clock24(date),'Europe/London');
   const url=new URL(item.find('.index-title a').attr('href'),rcmIndex).href;
   return [{id:`rcm-${item.attr('id')}`,title,start,end:null,program:clean(item.find('.ListingText p').eq(1).text()),event_url:url,stream_url:`https://www.youtube.com/watch?v=${video[1]}`,watch_kind:'direct',evidence_url:rcmIndex,evidence:'Listed on RCM Live with a scheduled public YouTube embed.'}];
  });
 }
 function parseWestern(html){
  const $=load(html),heading=$('h3').filter((i,e)=>/^\d{4}-\d{2} Livestream Performances$/.test(clean($(e).text()))).first();
  if(!heading.length||!$('iframe[src^="https://vimeo.com/event/"]').length)throw new Error('Western livestream schedule changed');
  return heading.nextUntil('h3','p').toArray().flatMap(p=>{
   const item=$(p);item.find('del,s,strike,[style*="line-through"]').remove();
   const lines=item.html().split(/<br\s*\/?\s*>/i).map(clean).filter(Boolean),date=lines[0]||'';
   if(!/^[A-Z][a-z]+ \d{1,2}, \d{4} \|/.test(date))return [];
   if(cancelled(date))return [];
   const start=zonedTime(namedDate(date)+'T'+clock24(date),'America/Toronto');
   const series=clean(item.find('a').first().text());if(!series)throw new Error('Western concert title missing');
   const program=lines.slice(2).filter(t=>!/^Rescheduled\b|^Please note/i.test(t)).join('; ');
   return [{id:`western-${start.slice(0,10)}`,title:series,start,end:null,program,event_url:westernIndex,stream_url:westernIndex,watch_kind:'venue',watch_note:'The player appears here when the performance begins.',evidence_url:westernIndex,evidence:'Listed in the official upcoming Livestream Performances section with a public Vimeo player and Eastern time.'}];
  });
 }
 return {adapters:{indiana:async get=>parseIndiana(await get(indianaFeed,true)),'ohio-state':ohioState,ohio,unt:async get=>parseUnt(await get(untIndex)),rcm:async get=>parseRcm(await get(rcmIndex)),western:async get=>parseWestern(await get(westernIndex))},parsers:{parseIndiana,parseOhioState,parseOhio,parseUnt,parseRcm,parseWestern},current};
}
