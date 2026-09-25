import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {safeUrl,endTime} from '../dist/core.js';
export const DAY=86400000;
export const clean=value=>load(`<body>${value||''}</body>`)('body').text().replace(/\s+/g,' ').trim();
export const sources=[
 {id:'curtis',name:'Curtis Institute of Music',url:'https://www.curtis.edu/curtis-performances/watch-listen/',timezone:'America/New_York'},
 {id:'cim',name:'Cleveland Institute of Music',url:'https://www.cim.edu/concerts-events',timezone:'America/New_York'},
 {id:'eastman',name:'Eastman School of Music',url:'https://www.esm.rochester.edu/live/',timezone:'America/New_York'},
 {id:'colburn',name:'Colburn School',url:'https://colburnschool.edu/livestream/',timezone:'America/Los_Angeles'},
 {id:'msm',name:'Manhattan School of Music',url:'https://www.msmnyc.edu/livestream/',timezone:'America/New_York'}
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
const allowedHosts=new Set(['www.curtis.edu','www.cim.edu','www.esm.rochester.edu','colburnschool.edu','www.colburnschool.edu','www.msmnyc.edu']);
export function makeFetcher(){let requests=0;return async function get(url,json=false){
 if(++requests>180)throw new Error('Request budget exceeded');
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
export const adapters={curtis,cim,eastman:async(get,now)=>parseEastman(await get('https://www.esm.rochester.edu/live/'),now),colburn:async get=>parseColburn(await get('https://colburnschool.edu/livestream/')),msm:async get=>parseMsm(await get('https://www.msmnyc.edu/livestream/'))};
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
