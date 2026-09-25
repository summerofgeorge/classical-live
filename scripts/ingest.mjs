import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {safeUrl,endTime,dayKey} from '../dist/core.js';
export const DAY=86400000;
export const clean=value=>load(`<body>${value||''}</body>`)('body').text().replace(/\s+/g,' ').trim();
export const sources=[
 {id:'curtis',name:'Curtis Institute of Music',url:'https://www.curtis.edu/curtis-performances/watch-listen/',timezone:'America/New_York'},
 {id:'cim',name:'Cleveland Institute of Music',url:'https://www.cim.edu/concerts-events',timezone:'America/New_York'},
 {id:'eastman',name:'Eastman School of Music',url:'https://www.esm.rochester.edu/live/',timezone:'America/New_York'},
 {id:'colburn',name:'Colburn School',url:'https://colburnschool.edu/livestream/',timezone:'America/Los_Angeles'},
 {id:'msm',name:'Manhattan School of Music',url:'https://www.msmnyc.edu/livestream/',timezone:'America/New_York'},
 {id:'northwestern',name:'Northwestern Bienen School of Music',url:'https://www.music.northwestern.edu/live',timezone:'America/Chicago'},
 {id:'rice',name:'Rice Shepherd School of Music',url:'https://music.rice.edu/events',timezone:'America/Chicago'},
 {id:'sfcm',name:'San Francisco Conservatory of Music',url:'https://www.sfcm.edu/experience/performance-calendar',timezone:'America/Los_Angeles'},
 {id:'liechtenstein',name:'Music Academy in Liechtenstein',url:'https://www.kulmag.live/de/Partner/2/musikakademie-in-liechtenstein',timezone:'Europe/Vaduz'},
 {id:'weimar',name:'Franz Liszt University of Music Weimar',url:'https://www.hfm-weimar.de/en/visiting/events/calendar',timezone:'Europe/Berlin'}
];
export function zonedTime(local,zone){
 const m=local?.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
 if(!m)throw new Error(`Missing or ambiguous date: ${local}`);
 const parts=m.slice(1).map(Number);parts[5] ||= 0;
 const target=Date.UTC(parts[0],parts[1]-1,...parts.slice(2));
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const asWall=ms=>{const p=Object.fromEntries(formatter.formatToParts(ms).map(p=>[p.type,p.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);};
 let guess=target;for(let i=0;i<3;i++)guess+=target-asWall(guess);
 if(asWall(guess)!==target || asWall(guess-DAY/24)===target || asWall(guess+DAY/24)===target)throw new Error(`Nonexistent or ambiguous local time: ${local}`);
 // Also rejects dates that Date.UTC would silently normalize.
 const normalized=new Date(target).toISOString().slice(0,19);
 if(normalized!==`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]||'00'}`)throw new Error('Invalid calendar date');
 return new Date(guess).toISOString();
}
export function clock24(value){const m=value.toLowerCase().replaceAll('.','').match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);if(!m||+m[1]<1||+m[1]>12||+(m[2]||0)>59)throw new Error('Unrecognized clock time');return `${String(+m[1]%12+(m[3]==='pm'?12:0)).padStart(2,'0')}:${m[2]||'00'}:00`;}
export function kind(title){if(/jazz/i.test(title))return 'Jazz';if(/orchestra|philharmonia|sinfonietta|symphony/i.test(title))return 'Orchestra';if(/quartet|\bchamber\b|trio|virtuosi/i.test(title))return 'Chamber';if(/opera|chorale|choir|chorus/i.test(title))return 'Voice & choral';if(/master\s?class|symposium/i.test(title))return 'Masterclass';if(/recital|faculty artist series/i.test(title))return 'Recital';return 'Concert';}
export function normalize(raw,source,now){
 const event={...raw,source:source.id,institution:source.name,timezone:source.timezone,title:clean(raw.title).replace(/^SOLD OUT:?\s*/i,''),program:clean(raw.program).slice(0,300),type:raw.type||kind(raw.title),free:true,replay:'unknown',last_verified_at:now.toISOString(),stale:false};
 event.id=raw.id||`${source.id}-${createHash('sha256').update(raw.event_url+'|'+raw.start.slice(0,10)).digest('hex').slice(0,16)}`;
 if(!/^[a-z0-9_-]{1,100}$/i.test(event.id)||!event.title||event.title.length>300)throw new Error('Invalid title or identifier');
 for(const key of ['event_url','stream_url']){event[key]=safeUrl(event[key]);if(!event[key])throw new Error(`Unsafe ${key}`);}
 if(!Number.isFinite(Date.parse(event.start))||!/(Z|[+-]\d\d:\d\d)$/.test(event.start))throw new Error('Start must include a time zone');
 if(event.end && (!Number.isFinite(Date.parse(event.end))||new Date(event.end)<=new Date(event.start)))throw new Error('Invalid end time');
 return event;
}
const allowedHosts=new Set(['www.curtis.edu','www.cim.edu','www.esm.rochester.edu','colburnschool.edu','www.colburnschool.edu','www.msmnyc.edu','www.music.northwestern.edu','music.northwestern.edu','music.rice.edu','www.sfcm.edu','sfcm.edu','www.hfm-weimar.de','hfm-weimar.de','www.kulmag.live','kulmag.live']);
export function makeFetcher(){let requests=0;return async function get(url,json=false){
 if(++requests>280)throw new Error('Request budget exceeded');
 if(!safeUrl(url)||!allowedHosts.has(new URL(url).hostname))throw new Error('Source URL is outside the allowlist');
 for(let attempt=0;attempt<2;attempt++){
  try{let current=url,r;
   for(let redirects=0;redirects<4;redirects++){
    if(!safeUrl(current)||!allowedHosts.has(new URL(current).hostname))throw new Error('Redirect outside source allowlist');
    r=await fetch(current,{signal:AbortSignal.timeout(20000),redirect:'manual',headers:{'User-Agent':'ClassicalLive/1.0 (+https://github.com/summerofgeorge/classical-live)','Accept':json?'application/json':'text/html'}});
    if(r.status>=300&&r.status<400&&r.headers.get('location')){current=new URL(r.headers.get('location'),current).href;continue;}
    break;
   }
   if(!r.ok)throw new Error(`HTTP ${r.status} from ${new URL(url).hostname}`);
   const body=await r.text();if(body.length>5_000_000)throw new Error('Response too large');
   return json?JSON.parse(body):body;
  }catch(error){if(attempt||/HTTP 4\d\d/.test(error.message))throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
 }
};}
export function curtisCandidates(payload,now){
 if(payload.success!==true||!Array.isArray(payload.data))throw new Error('Curtis feed format changed');
 return payload.data.filter(e=>e.date>=new Date(+now-DAY).toISOString().slice(0,10)&&e.date<=new Date(+now+45*DAY).toISOString().slice(0,10)&&e.categories?.includes('broadcast')&&e.categories?.includes('free')&&!/cancelled|canceled|postponed/i.test(e.title));
}
async function curtis(get,now){
 const entries=curtisCandidates(await get('https://www.curtis.edu/wp-json/curtis/v1/events',true),now),events=[];
 for(const item of entries){
  const url=new URL(item.url,'https://www.curtis.edu').href,$=load(await get(url));
  if(!$('.module__title').length)throw new Error('Curtis event layout changed');
  if(/cancelled|canceled|postponed/i.test($('.module__title').text()))continue;
  const program=$('.module__table tr').toArray().map(row=>{const composer=clean($(row).find('th').text());return composer?composer+' — '+clean($(row).find('td > span').first().text()):'';}).filter(Boolean).join('; ');
  const direct=$('main a').toArray().find(a=>/watch|livestream/i.test($(a).text())&&/youtube\.com\/watch|vimeo\.com\/\d/.test($(a).attr('href')||''));
  events.push({id:`curtis-${item.id}`,title:item.title,type:item.categories.includes('student-recital')?'Recital':kind(item.title),start:zonedTime(item.datetime,'America/New_York'),end:null,program,event_url:url,stream_url:direct?$(direct).attr('href'):'https://www.youtube.com/c/curtisinstitute',watch_kind:direct?'direct':'channel',evidence_url:url,evidence:'Official event is categorized Broadcast and Free.'});
 }
 return events;
}
export function parseCim(html,url){
 const $=load(html),area=$('article.article-detail');if(!area.length||!area.find('.atc_date_start').length)throw new Error('CIM event layout changed');
 const title=clean(area.find('h1').text());if(/cancelled|canceled|postponed/i.test(title))return null;
 const stream=area.find('.livestream a[href]').first().attr('href');if(!stream)return null;
 const zone=clean(area.find('.atc_timezone').text());if(zone!=='America/New_York')throw new Error('Unexpected CIM time zone');
 const repertoire=area.find('h3').filter((i,x)=>/repertoire/i.test($(x).text())).next('ul').find('li').toArray().map(x=>clean($(x).text())).join('; ');
 return {title,start:zonedTime(clean(area.find('.atc_date_start').text()),zone),end:zonedTime(clean(area.find('.atc_date_end').text()),zone),program:repertoire,event_url:url,stream_url:stream,watch_kind:'direct',evidence_url:url,evidence:'Official event page provides a public Watch the performance live link.'};
}
async function cim(get,now){
 let next='https://www.cim.edu/concerts-events',page=0;const seen=new Set(),events=[];
 while(next){if(++page>10)throw new Error('CIM pagination exceeded safety limit');const $=load(await get(next));const cards=$('.event-teaser');if(!cards.length&&!/no events/i.test($('main').text()))throw new Error('CIM calendar layout changed');
  let allBeyond=cards.length>0;
  for(const card of cards.toArray()){
   if(/cancelled|canceled|postponed/i.test($(card).find('.event-teaser-title').text()))continue;
   const href=$(card).find('.event-teaser-title a').attr('href');if(!href)throw new Error('CIM event link missing');
   const url=new URL(href,next).href;if(seen.has(url))continue;seen.add(url);
   const html=await get(url),event=parseCim(html,url);
   const rawStart=clean(load(html)('.atc_date_start').text());
   if(zonedTime(rawStart,'America/New_York')<new Date(+now+45*DAY).toISOString())allBeyond=false;
   if(event)events.push(event);await new Promise(resolve=>setTimeout(resolve,150));
  }
  const href=$('a[rel="next"]').attr('href');next=href&&!allBeyond?new URL(href,next).href:null;
 }
 return events;
}
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function namedDate(text,year){const m=text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/);if(!m)throw new Error('Unrecognized date');return `${m[3]||year}-${String(months.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
export function parseEastman(html,now){
 const $=load(html),items=$('.streamed-events li');if(!$('.streamed-events').length)throw new Error('Eastman livestream list missing');
 return items.toArray().map(li=>{
  const item=$(li),dateText=clean(item.find('strong').text()),body=clean(item.text());
  const candidates=[now.getUTCFullYear()-1,now.getUTCFullYear(),now.getUTCFullYear()+1].map(year=>namedDate(dateText,year));
  const date=candidates.find(date=>{const d=new Date(date+'T12:00:00Z');return Math.abs(+d-now)<180*DAY && dateText.startsWith(new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(d));});
  if(!date)throw new Error('Eastman date year could not be resolved safely');
  const title=clean(item.find('.event-link').text()),url=item.find('.event-link').attr('href'),stream=item.find('.streamed-event').attr('href');
  if(!title||!url||!stream)throw new Error('Eastman event is incomplete');
  return {title,start:zonedTime(date+'T'+clock24(body.split('@')[1]||''),'America/New_York'),end:null,program:'',event_url:new URL(url,'https://www.esm.rochester.edu').href,stream_url:new URL(stream,'https://www.esm.rochester.edu').href,watch_kind:'venue',evidence_url:'https://www.esm.rochester.edu/live/',evidence:'Included in the official upcoming live streamed events list.'};
 });
}
export function parseColburn(html){
 const $=load(html),items=$('h3.event__title');if(!items.length)throw new Error('Colburn livestream list missing');
 return items.toArray().map(h=>{const heading=$(h),body=clean(heading.next('.em__event__date').text()),title=clean(heading.text()),url=heading.find('a').attr('href');
  if(!/\b20\d\d\b/.test(body))throw new Error('Colburn year missing');
  return {title,start:zonedTime(namedDate(body)+'T'+clock24(body),'America/Los_Angeles'),end:null,program:'',event_url:url,stream_url:'https://colburnschool.edu/livestream/',watch_kind:'venue',evidence_url:'https://colburnschool.edu/livestream/',evidence:'Included on the official livestream page.'};
 });
}
export function parseMsm(html){
 const $=load(html),heading=$('.browseCollection_list > h3').filter((i,h)=>clean($(h).text())==='Upcoming Events').first();
 if(!heading.length)throw new Error('MSM upcoming livestream list missing');
 return heading.nextUntil('h3','.newsBlock').toArray().map(block=>{
  const item=$(block),title=clean(item.find('h2').html()?.replace(/<br\s*\/?>/gi,' — ')),date=clean(item.find('date').text()),time=clean(item.find('time').text()),url=item.find('h2 a').attr('href');
  if(!/\b20\d\d\b/.test(date)||!title||!url)throw new Error('MSM event fields missing');
  // The site prints EST year-round; its published New York wall clock is authoritative.
  return {title,start:zonedTime(namedDate(date)+'T'+clock24(time),'America/New_York'),end:null,program:'',event_url:url,stream_url:url,watch_kind:'direct',evidence_url:'https://www.msmnyc.edu/livestream/',evidence:'Listed as an upcoming event on the official livestream index.'};
 }).filter(e=>!/cancelled|canceled|postponed/i.test(e.title));
}
const cancelled=text=>/\bcancelled\b|\bcanceled\b|\bpostponed\b/i.test(text);
function streamLink(href,base){return href&&href.trim()&&!href.trim().startsWith('#')?safeUrl(new URL(href,base).href):null;}
export function parseNorthwestern(html){
 const $=load(html),area=$('#upcoming-events-slider');
 if(!area.length)throw new Error('Northwestern livestream list missing');
 const cards=area.find('.event-slide');
 if(!cards.length&&!/no (upcoming |scheduled )?(events|performances)/i.test(area.text()))throw new Error('Northwestern livestream layout changed');
 return cards.toArray().flatMap(card=>{
  const item=$(card),title=clean(item.find('.event-title').text());
  if(cancelled(title))return [];
  const stream=streamLink(item.find('.event-btns a').filter((i,a)=>/^Watch Live$/i.test(clean($(a).text()))).first().attr('href'),'https://www.music.northwestern.edu');
  if(!stream)return [];
  const date=clean(item.find('.date').text()),href=item.find('.event-title').attr('href');
  if(!title||!href||!/\b20\d\d\b/.test(date)||!/(CDT|CST)\b/.test(date))throw new Error('Northwestern event fields missing');
  const url=new URL(href,'https://www.music.northwestern.edu').href;
  return [{title,start:zonedTime(namedDate(date)+'T'+clock24(date),'America/Chicago'),end:null,program:'',event_url:url,stream_url:stream,watch_kind:'venue',evidence_url:'https://www.music.northwestern.edu/live',evidence:'Official livestream schedule provides a Watch Live venue link.'}];
 });
}
export function riceStart(html){
 const $=load(html),area=$('.event-sidebar').first(),date=clean(area.find('.event-date').text());
 const m=date.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/);
 if(!m)throw new Error('Rice event date missing');
 const month=months.findIndex(value=>value.startsWith(m[1]))+1;
 // Rice's datetime attributes label local wall times +00:00. Use the printed date and Central clock.
 return zonedTime(`${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}T${clock24(clean(area.find('.event-time').text()))}`,'America/Chicago');
}
export function parseRice(html,url){
 const $=load(html),area=$('.event-sidebar').first(),heading=$('#block-views-block-event-info-date');
 if(!area.length||!heading.find('h1').length)throw new Error('Rice event layout changed');
 const title=clean(heading.find('h1').text());
 if(cancelled(title+' '+$('.event-status').text()))return null;
 const stream=streamLink(area.find('.livestream-info a.stream-link').attr('href'),url);
 if(!stream)return null;
 if(!/\bC[DS]?T\b/.test(area.find('.stream-time').text()))throw new Error('Rice stream time zone missing');
 const type=clean(heading.find('.event-type').text());
 return {title,type:kind(type+' '+title),start:riceStart(html),end:null,program:clean($('.field--name-field-repertoire .field__item').html()?.replace(/<br\s*\/?>/gi,'; ')),event_url:url,stream_url:stream,watch_kind:new URL(stream).hostname==='music.rice.edu'?'venue':'direct',evidence_url:url,evidence:'Official event page provides a View Livestream link and Central Time.'};
}
async function rice(get,now){
 let next='https://music.rice.edu/events',page=0;const seen=new Set(),pages=new Set(),events=[];
 while(next){
  if(++page>20||pages.has(next))throw new Error('Rice pagination exceeded safety limit');pages.add(next);
  const $=load(await get(next)),area=$('.view-calendar-example.view-display-id-listing'),cards=area.find('.event-wrapper-link');
  if(!area.length||(!cards.length&&!area.find('.view-empty').length))throw new Error('Rice calendar layout changed');
  const broadcasts=cards.filter((i,card)=>$(card).find('.stream-icon').length&&!cancelled($(card).find('.event-title,.event-status').text()));
  let allBeyond=broadcasts.length>0;
  for(const card of broadcasts.toArray()){
   const item=$(card);if(cancelled(item.find('.event-title,.event-status').text()))continue;
   const href=item.attr('href');if(!href)throw new Error('Rice event link missing');
   const url=new URL(href,next).href;
   // /content/ links describe festivals or several performances, not one dated concert.
   if(new URL(url).pathname.startsWith('/content/')){allBeyond=false;continue;}
   if(seen.has(url))throw new Error('Rice calendar repeated an event across pages');seen.add(url);
   // Only inspect marked broadcasts; other cards can point to undated, multi-performance landing pages.
   const html=await get(url);if(Date.parse(riceStart(html))<+now+45*DAY)allBeyond=false;
   if(item.find('.stream-icon').length){const event=parseRice(html,url);if(event)events.push(event);}
   await new Promise(resolve=>setTimeout(resolve,150));
  }
  const href=area.find('a[rel="next"]').attr('href');next=href&&!allBeyond?new URL(href,next).href:null;
 }
 return events;
}
export function parseSfcm(html,url){
 const $=load(html),area=$('article.event').first(),title=clean(area.find('h1').text());
 if(!area.length||!title)throw new Error('SFCM event layout changed');
 if(cancelled(title))return null;
 const stream=streamLink(area.find('.event-cta-live-stream').first().attr('href'),url);if(!stream)return null;
 // Some SFCM "Livestream" buttons lead to a partner's ticket-sales page. Admit public video links only.
 if(!['vimeo.com','www.vimeo.com','youtube.com','www.youtube.com','youtu.be'].includes(new URL(stream).hostname))return null;
 const date=clean(area.find('.event__info time').first().text());
 if(!/\b20\d\d\b/.test(date))throw new Error('SFCM event date missing');
 const start=zonedTime(namedDate(date)+'T'+clock24(date),'America/Los_Angeles');
 const calendarHref=area.find('.add-cal-event [data-addtocal-type="google"] a').attr('href');
 if(!calendarHref)throw new Error('SFCM calendar metadata missing');
 const params=new URL(calendarHref).searchParams,dates=params.get('dates')?.split('/');
 if(params.get('ctz')!=='America/Los_Angeles'||dates?.length!==2||dates.some(d=>!/^\d{8}T\d{6}$/.test(d)))throw new Error('SFCM calendar metadata changed');
 const convert=value=>zonedTime(value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,'$1-$2-$3T$4:$5:$6'),'America/Los_Angeles');
 if(convert(dates[0])!==start)throw new Error('SFCM displayed date disagrees with calendar');
 const body=area.find('.field--name-body'),programHeading=body.find('h2,h3,h4').filter((i,e)=>/^Program$/i.test(clean($(e).text()))).first();
 const program=programHeading.nextUntil('h2,h3,h4,h5,h6','p').toArray().map(p=>clean($(p).text())).filter(Boolean).join('; ');
 return {title,type:kind(area.find('.entity-categories').first().text()+' '+title),start,end:convert(dates[1]),program,event_url:url,stream_url:stream,watch_kind:'direct',evidence_url:url,evidence:'Public event page provides a video livestream link and calendar dates.'};
}
async function sfcm(get,now){
 const first=dayKey(new Date(+now-DAY),'America/Los_Angeles'),last=dayKey(new Date(+now+45*DAY),'America/Los_Angeles'),events=[],seen=new Set();
 const month=new Date(first.slice(0,7)+'-01T12:00:00Z');
 while(month.toISOString().slice(0,7)<=last.slice(0,7)){
  const index=`https://www.sfcm.edu/experience/performance-calendar?calendar_event_month=${String(month.getUTCMonth()+1).padStart(2,'0')}&calendar_event_year=${month.getUTCFullYear()}`;
  const $=load(await get(index)),area=$('.view-sfcm-calendar'),links=area.find('.performance-title a');
  if(!area.length||(!links.length&&!area.find('.view-empty').length))throw new Error('SFCM calendar layout changed');
  for(const link of links.toArray()){
   const href=$(link).attr('href');if(!href)throw new Error('SFCM event link missing');
   const url=new URL(href,index).href;if(seen.has(url))continue;seen.add(url);
   const row=$(link).closest('.performance-row'),day=clean(row.find('.compact-listing__date-date').first().text()),monthName=clean(row.find('.compact-listing__date-month').first().text());
   if(!/^\d{1,2}$/.test(day)||monthName!==months[month.getUTCMonth()].slice(0,3))throw new Error('SFCM calendar row date missing');
   const date=`${month.toISOString().slice(0,7)}-${day.padStart(2,'0')}`;if(date<first||date>last||cancelled($(link).text()))continue;
   const event=parseSfcm(await get(url),url);if(event)events.push(event);
   await new Promise(resolve=>setTimeout(resolve,150));
  }
  month.setUTCMonth(month.getUTCMonth()+1);
 }
 return events;
}
const cancelledEuropean=text=>cancelled(text)||/\babgesagt\b|\bentfällt\b|\bverschoben\b/i.test(text);
function europeanDate(text){
 const m=text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
 if(!m)throw new Error('European event date missing');
 return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}
function europeanClock(text){const m=text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);if(!m)throw new Error('European event time missing');return `${m[1].padStart(2,'0')}:${m[2]}:00`;}
const liechtensteinIndex='https://www.kulmag.live/de/Partner/2/musikakademie-in-liechtenstein';
export function liechtensteinCandidates(html){
 const $=load(html),area=$('#body_konzerte_divKonzerte');
 if(!area.length||clean(area.find('#body_konzerte_hTitle').text())!=='Live-Streams')throw new Error('Liechtenstein livestream section missing');
 const cards=area.find('a[id*="_repKonzerte_aLink_"]');
 const germanMonths=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 return cards.toArray().flatMap(card=>{
  const item=$(card),title=clean(item.find('.titel').text());
  if(cancelledEuropean(title)||clean(item.find('[id*="_spanFree_"]').text())!=='Gratis')return [];
  const date=clean(item.find('.datum').text()),m=date.match(/^(\d{1,2})\.\s*([A-Za-zÄä]+)\s+(\d{4})/),month=m&&germanMonths.indexOf(m[2])+1;
  if(!title||!month)throw new Error('Liechtenstein event fields missing');
  const url=streamLink(item.attr('href'),liechtensteinIndex);
  if(!url||!['kulmag.live','www.kulmag.live'].includes(new URL(url).hostname)||!/^\/de\/Konzerte\/\d+\//.test(new URL(url).pathname))throw new Error('Liechtenstein event URL changed');
  return [{title,url,start:zonedTime(`${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}T${europeanClock(date)}`,'Europe/Vaduz')}];
 });
}
export function parseLiechtenstein(html,candidate){
 const $=load(html),title=clean($('#body_divTitel').text());
 if(!title||!$('#body_divKonzert').length)throw new Error('Liechtenstein event layout changed');
 if(cancelledEuropean(title))return null;
 // Verify the event belongs to the academy; other Kulmag partners have separate schedules.
 const partner=$('#body_aPartner').attr('href');
 if(!partner||!/^\/de\/partner\/2\//i.test(new URL(partner,candidate.url).pathname))throw new Error('Liechtenstein event partner changed');
 const date=clean($('#body_divZeit').text());
 const start=zonedTime(europeanDate(date)+'T'+europeanClock(date),'Europe/Vaduz');
 if(start!==candidate.start||title!==candidate.title)throw new Error('Liechtenstein schedule disagrees with event details');
 const program=$('#body_divKapitel h3,#body_divKapitel h4').toArray().map(e=>clean($(e).text())).filter(t=>t!=='Programm').join('; ');
 return {id:`liechtenstein-${new URL(candidate.url).pathname.split('/')[3]}`,title,type:/quintett|quartett|trio/i.test(title)?'Chamber':kind(title),start,end:null,program,event_url:candidate.url,stream_url:candidate.url,watch_kind:'direct',evidence_url:liechtensteinIndex,evidence:'Listed in the academy’s official broadcast partner’s Live-Streams section and explicitly marked Gratis (free); date checked against event details.'};
}
async function liechtenstein(get,now){
 const candidates=liechtensteinCandidates(await get(liechtensteinIndex)).filter(c=>Date.parse(c.start)>=+now-DAY&&Date.parse(c.start)<+now+45*DAY),events=[];
 if(candidates.length>60)throw new Error('Liechtenstein event budget exceeded');
 for(const candidate of candidates){const event=parseLiechtenstein(await get(candidate.url),candidate);if(event)events.push(event);}
 return events;
}
const weimarIndex='https://www.hfm-weimar.de/en/visiting/events/calendar';
export function parseWeimar(html,url){
 const $=load(html),area=$('.eventlist.event-id'),title=clean(area.find('.joVeranstaltungsTeaserHeadline').text());
 if(!area.length||!title)throw new Error('Weimar event layout changed');
 if(cancelledEuropean(title+' '+area.find('.description').text()))return null;
 // Only explicit broadcast announcements qualify; ordinary free concerts are excluded.
 const broadcast=area.find('p').filter((i,p)=>/\b(?:auch\s+)?im\s+livestream\b/i.test(clean($(p).text()))&&!/\bkein\w*\b|\bnicht\b/i.test(clean($(p).text()))).first();
 const href=broadcast.find('a[href]').first().attr('href');if(!href)return null;
 const declared=new URL(href,url);if(!['hfm-weimar.de','www.hfm-weimar.de','youtube.com','www.youtube.com','youtu.be'].includes(declared.hostname))return null;
 // Official announcements direct viewers to the homepage, which hosts the player when live.
 if(declared.protocol==='http:')declared.protocol='https:';
 const stream=safeUrl(declared.href);if(!stream)return null;
 const start=zonedTime(europeanDate(clean(area.find('.day').text()))+'T'+europeanClock(clean(area.find('.time').text())),'Europe/Berlin');
 const paragraphs=area.find('.joVeranstaltungsTeaserinnenabstand p').toArray(),at=paragraphs.findIndex(p=>/^Repertoire:$/i.test(clean($(p).text())));
 const program=at<0?'':paragraphs.slice(at+1).map(p=>clean($(p).text())).filter(Boolean).join('; ');
 return {title,type:/Competition/i.test(title)?'Competition':kind(title),start,end:null,program,event_url:url,stream_url:stream,watch_kind:'venue',watch_note:declared.hostname.endsWith('hfm-weimar.de')?'The school hosts the live player on its homepage when broadcasting.':'',evidence_url:url,evidence:'Official event explicitly announces a livestream and links the public viewing destination.'};
}
async function weimar(get,now){
 const first=dayKey(now,'Europe/Berlin'),last=dayKey(new Date(+now+45*DAY),'Europe/Berlin'),html=await get(weimarIndex),$=load(html),pages=[{url:weimarIndex,html}],monthsSeen=new Set([first.slice(0,7)]);
 if(!$('.joEventJahr').length||!$('.eventlist').length)throw new Error('Weimar calendar layout changed');
 for(const a of $('a.nextmonth').toArray()){
  const url=new URL($(a).attr('href'),weimarIndex),stamp=Number(url.searchParams.get('tx_jobase_pi5[loadDate]'));
  if(!Number.isFinite(stamp)||stamp<=0)throw new Error('Weimar month navigation changed');
  const month=dayKey(new Date(stamp*1000),'Europe/Berlin').slice(0,7);
  if(month<=first.slice(0,7)||month>last.slice(0,7)||monthsSeen.has(month))continue;
  monthsSeen.add(month);pages.push({url:url.href,html:await get(url.href)});
 }
 const expected=new Date(first.slice(0,7)+'-01T12:00:00Z');
 while(expected.toISOString().slice(0,7)<=last.slice(0,7)){if(!monthsSeen.has(expected.toISOString().slice(0,7)))throw new Error('Weimar calendar is missing a month');expected.setUTCMonth(expected.getUTCMonth()+1);}
 const seen=new Set(),events=[];
 for(const page of pages){
  const p=load(page.html);if(!p('.eventlist').length)throw new Error('Weimar month layout changed');
  for(const a of p('.eventlist a[href*="/detail/"]').toArray()){
   const item=p(a),date=europeanDate(clean(item.find('.joVeranstaltungsTeaserAdresse').text()));
   if(date<first||date>last||cancelledEuropean(item.find('.joVeranstaltungsTeaserHeadline').text()))continue;
   const url=new URL(item.attr('href'),page.url).href;if(seen.has(url))continue;seen.add(url);
   if(seen.size>80)throw new Error('Weimar event budget exceeded');
   const event=parseWeimar(await get(url),url);if(event)events.push(event);
  }
 }
 return events;
}
export const adapters={curtis,cim,eastman:async(get,now)=>parseEastman(await get('https://www.esm.rochester.edu/live/'),now),colburn:async get=>parseColburn(await get('https://colburnschool.edu/livestream/')),msm:async get=>parseMsm(await get('https://www.msmnyc.edu/livestream/')),northwestern:async get=>parseNorthwestern(await get('https://www.music.northwestern.edu/live')),rice,sfcm,liechtenstein,weimar};
export async function collect(previous={events:[],sources:[]},now=new Date(),registry=sources,get=makeFetcher(),handlers=adapters){
 const events=[],statuses=[];
 for(const source of registry){
  const old=previous.sources.find(s=>s.id===source.id);
  try{const raw=await handlers[source.id](get,now),parsed=raw.map(e=>normalize(e,source,now));
   const active=parsed.filter(e=>endTime(e)>now&&new Date(e.start)<new Date(+now+45*DAY));
   events.push(...active);statuses.push({...source,status:'ok',last_success:now.toISOString(),count:active.length});
   console.log(`${source.name}: ${active.length} upcoming streams`);
  }catch(error){
   const kept=previous.events.filter(e=>e.source===source.id&&endTime(e)>now&&+now-Date.parse(e.last_verified_at)<14*DAY).map(e=>({...e,stale:true}));
   events.push(...kept);statuses.push({...source,status:'error',last_success:old?.last_success||null,count:kept.length,error:String(error.message).slice(0,200)});
   console.error(`${source.name}: ${error.message}; retained ${kept.length}`);
  }
 }
 const unique=new Map();for(const event of events)unique.set(event.id,event);
 return {schema_version:1,generated_at:now.toISOString(),horizon_days:45,sources:statuses,events:[...unique.values()].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))};
}
