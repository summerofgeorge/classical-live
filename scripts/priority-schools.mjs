import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {safeUrl} from '../dist/core.js';
const east='America/New_York',west='America/Los_Angeles';
export const prioritySources=[
 {id:'bard',name:'Bard College Conservatory of Music',url:'https://www.bard.edu/conservatory/events/',timezone:east},
 {id:'ucla',name:'UCLA Herb Alpert School of Music',url:'https://schoolofmusic.ucla.edu/calendar/',timezone:west}
];
// Rutgers denies the identified collector (HTTP block). Parser retained; keep off the scheduled source list and rely on browser-reviewed snapshots until access is permitted.
export const priorityCandidates=[{id:'rutgers',name:'Rutgers Mason Gross School of the Arts',url:'https://www.masongross.rutgers.edu/nicholas-music-center-stream/',timezone:east}];
export const priorityHosts=['www.bard.edu','conservatory.bard.edu','www.masongross.rutgers.edu','schoolofmusic.ucla.edu'];
const info=Object.fromEntries([...prioritySources,...priorityCandidates].map(s=>[s.id,s]));
const excluded=t=>/cancel(?:led|ed)|postponed|\bjazz\b|master\s?class|workshop|conference|lecture|symposium|screening|conversation/i.test(t);
const restricted=t=>/password required|members.only|private stream|login required|pay.per.view|will not be (?:live)?streamed|in.person only/i.test(t);
export function createPrioritySchools({clean,zonedTime,clock24,namedDate,DAY}){
 const inWindow=(s,now)=>Date.parse(s)>=+now-2*DAY&&Date.parse(s)<+now+45*DAY;
 const event=(id,title,start,extra={})=>({id:`${id}-${createHash('sha256').update(title+'|'+start).digest('hex').slice(0,16)}`,title,start,end:null,program:'',event_url:info[id].url,evidence_url:info[id].url,stream_url:info[id].url,watch_kind:'venue',...extra});
 function parseRutgers(html){
  const $=load(html);$('script,style').remove();const text=clean($('body').text()),year=+text.match(/Livestreams\s*\|\s*(20\d{2})[–-]\d{2,4}/)?.[1];
  if(!year||!/regular series of free performances/i.test(text)||!$('iframe[src*="kaltura"]').length)throw new Error('Rutgers free livestream season or player missing');
  const sections=$('.et_pb_toggle');if(!sections.length)throw new Error('Rutgers month sections missing');
  return sections.toArray().flatMap(section=>($(section).find('.et_pb_toggle_content').html()||'').split(/<br\s*\/?\s*>/i).flatMap(line=>{
   const $row=load(line),text=clean($row('body').text());if(!text)return [];const parts=text.split('|');if(parts.length!==2)throw new Error('Rutgers concert row changed');const title=clean(parts[0]);if(excluded(title)||restricted(text))return [];
   return parts[1].split('+').map((part,index)=>{const month=part.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/)?.[1];if(!month)throw new Error('Rutgers concert month missing');const y=/January|February|March|April|May|June/.test(month)?year+1:year,date=namedDate(part,y),start=zonedTime(date+'T'+clock24(part),east);
    const href=$row('a[href^="https://secure.masongross.rutgers.edu/"]').first().attr('href'),stamp=href?.match(/\/(\d{2})-(\d{2})-(20\d{2})$/);if(index===0&&(!stamp||`${stamp[3]}-${stamp[1]}-${stamp[2]}`!==date))throw new Error('Rutgers season date and event link disagree');
    return event('rutgers',title,start,{watch_note:'Watch the public Nicholas Music Center player. Any ticket prices on linked campus events apply to attending in person.',evidence:'Listed in Rutgers’ dated 2026–27 free livestream series. Campus-local Eastern time uses daylight saving, despite the page’s generic EST label.'});
   });
  }));
 }
 function bardCandidates(html){const $=load(html),cards=$('.hpevents > li');if(!cards.length)throw new Error('Bard calendar cards missing');const urls=[...new Set(cards.toArray().filter(e=>/Noon Concert Series/i.test($(e).find('.eventtext').text())).map(e=>$(e).find('a[href]').first().attr('href')))];if(urls.length>12)throw new Error('Bard noon series exceeded bound');return urls.map(url=>{if(!safeUrl(url)||new URL(url).origin!=='https://www.bard.edu'||!new URL(url).pathname.startsWith('/conservatory/events/'))throw new Error('Bard event destination changed');return url;});}
 function parseBard(html,url){const $=load(html),area=$('.cal_event'),title=clean(area.find('h1').text()),text=clean(area.text());if(!area.length||!title)throw new Error('Bard event layout changed');if(excluded(title)||restricted(text)||!/Free and open to the public/i.test(text)||!/Livestreaming on the Conservatory YouTube Channel/i.test(text))return null;
  const date=clean(area.find('.date').text());if(!/20\d{2}/.test(date))throw new Error('Bard event year missing');const day=namedDate(date),week=date.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/)?.[1];if(new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))!==week)throw new Error('Bard weekday disagrees with date');
  return event('bard',title,zonedTime(day+'T'+clock24(clean(area.find('.location').text())),east),{event_url:url,evidence_url:url,stream_url:'https://www.youtube.com/user/BardConservatory',watch_kind:'channel',watch_note:'Select the Noon Concert on Bard Conservatory’s YouTube channel.',evidence:'Official dated Noon Concert event explicitly states free public access and streaming on the Conservatory YouTube channel.'});
 }
 const unfold=ics=>ics.replace(/\r?\n[ \t]/g,'');
 const value=(block,key)=>block.match(new RegExp('^'+key+':(.*)$','m'))?.[1]?.trim();
 const stamp=(block,key)=>{const v=value(block,key+';TZID=America/Los_Angeles');if(!/^\d{8}T\d{6}$/.test(v||''))throw new Error('UCLA iCal campus time missing');return zonedTime(v.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,'$1-$2-$3T$4:$5:$6'),west);};
 const unescape=s=>(s||'').replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1');
 function uclaCandidates(ics,now){const blocks=unfold(ics).match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);if(!blocks?.length||blocks.length>100)throw new Error('UCLA iCal feed missing or exceeded bound');const events=blocks.flatMap(block=>{const categories=value(block,'CATEGORIES')||'',title=unescape(value(block,'SUMMARY'));if(excluded(categories+' '+title)||!/Classical|Chamber Music|Contemporary|Opera/i.test(categories)||value(block,'STATUS')==='CANCELLED')return [];const start=stamp(block,'DTSTART');if(!inWindow(start,now))return [];const url=value(block,'URL');if(!safeUrl(url)||new URL(url).origin!=='https://schoolofmusic.ucla.edu'||!new URL(url).pathname.startsWith('/event/'))return [];return [{title,start,end:stamp(block,'DTEND'),url}];});if(events.length>35)throw new Error('UCLA detail requests exceeded bound');return events;}
 function parseUcla(html,candidate){const $=load(html),area=$('section.b-event'),title=clean($('h1').first().text());if(!area.length||!title)throw new Error('UCLA event layout changed');if(excluded(title)||restricted(area.text()))return null;
  // Navigation contains generic Livestreams links even on concerts with no broadcast.
  const a=area.find('a').filter((i,e)=>/^Watch Livestream$/i.test(clean($(e).text()))).first();if(!a.length)return null;const url=safeUrl(new URL(a.attr('href'),candidate.url).href);if(!url||new URL(url).origin!=='https://schoolofmusic.ucla.edu'||new URL(url).pathname!=='/school-of-music-live-streams/'||!new URL(url).hash)throw new Error('UCLA hall player destination changed');
  const calendar=$('a[href^="https://www.google.com/calendar/event"]').first().attr('href');if(!calendar)throw new Error('UCLA detail date link missing');const query=new URL(calendar).searchParams,dates=query.get('dates')?.split('/');if(query.get('ctz')!==west||!dates||stamp(`DTSTART;TZID=${west}:${dates[0]}`,'DTSTART')!==candidate.start||stamp(`DTEND;TZID=${west}:${dates[1]}`,'DTEND')!==candidate.end)throw new Error('UCLA event and calendar times disagree');
  return event('ucla',title,candidate.start,{end:candidate.end,event_url:candidate.url,evidence_url:candidate.url,stream_url:url,watch_note:'Open the named hall’s public player on UCLA’s livestream page.',evidence:'The individual UCLA concert supplies a Watch Livestream hall link. Date and time agree between the official iCal feed and event detail. Generic navigation links alone are excluded.'});
 }
 const raw={rutgers:async get=>parseRutgers(await get(info.rutgers.url)),bard:async get=>{const events=[];for(const url of bardCandidates(await get(info.bard.url))){const e=parseBard(await get(url),url);if(e)events.push(e);}return events;},ucla:async(get,now)=>{const events=[];for(const c of uclaCandidates(await get('https://schoolofmusic.ucla.edu/events/list/?ical=1&posts_per_page=100'),now)){const e=parseUcla(await get(c.url),c);if(e)events.push(e);}return events;}};
 return {parsers:{parseRutgers,bardCandidates,parseBard,uclaCandidates,parseUcla},adapters:Object.fromEntries(Object.entries(raw).map(([id,fn])=>[id,async(get,now)=>(await fn(get,now)).filter(e=>inWindow(e.start,now))]))};
}
