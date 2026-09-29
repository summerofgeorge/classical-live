import {load} from 'cheerio';
import {dayKey,safeUrl} from '../dist/core.js';

export const ubcIndex='https://music.ubc.ca/events/event/';
export const ubcWatch='https://www.youtube.com/UBCSchoolofMusic';
export const vcassHome='https://apiv2.5stream.com/getMicrositeElementsByPage/39/home';
export const vcassPlaylist=id=>`https://apiv2.5stream.com/getShopContentByID/fashion-luck-m268/playlist/${id}`;
export const pacificSources=[
 {id:'ubc',name:'University of British Columbia School of Music',url:ubcIndex,timezone:'America/Vancouver'},
 {id:'vcass',name:'Victorian College of the Arts Secondary School',url:'https://vcass.vic.edu.au/events',timezone:'Australia/Melbourne'}
];
export const pacificHosts=['music.ubc.ca','apiv2.5stream.com'];
const excluded=text=>/cancelled|canceled|postponed|not (?:(?:be|being) )?(?:live ?streamed|broadcast)|no live ?stream|stream.{0,25}(?:unavailable|cancelled)|private stream|members.only|pay.per.view|subscription required/i.test(text);

export function createPacific({clean,zonedTime,clock24,namedDate,kind,DAY}){
 const inWindow=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;
 function ubcTime(date,time){const d=namedDate(date),m=time.match(/^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)$/i);if(!d||!m)throw Error('UBC concert date or time missing');return {start:zonedTime(d+'T'+clock24(m[1]),'America/Vancouver'),end:zonedTime(d+'T'+clock24(m[2]),'America/Vancouver')};}
 function ubcCandidates(html,now){
  const $=load(html);if(!$('.iso-grid').length)throw Error('UBC calendar layout changed');
  return $('.event-card').toArray().flatMap(el=>{const card=$(el),tags=(card.attr('data-type')||'').split(/\s+/);if(!tags.includes('streaming')||!tags.includes('concerts'))return [];
   const title=clean(card.find('.event-title').text());if(excluded(title))return [];
   const [date,time]=clean(card.find('.event-date').text()).split('|').map(s=>s.trim()),times=ubcTime(date,time||'');if(!inWindow(times.start,now))return [];
   const url=safeUrl(card.find('a.event-a-tag').attr('href'));if(!title||!url||new URL(url).origin!=='https://music.ubc.ca'||!/^\/events\/event\/[^/]+\/$/.test(new URL(url).pathname))throw Error('UBC event identity changed');
   return [{url,title,...times}];
  });
 }
 function parseUbc(html,candidate){
  const $=load(html),area=$('.hentry.event'),title=clean(area.find('h1.entry-title').text()),body=clean(area.find('.entry-content').text());
  if(!area.length||!title)throw Error('UBC event layout changed');
  if(excluded(title+' '+body))return null;
  if(!$('a[href="/events/event?type=streaming"]').length)return null;
  const date=area.find('.date-picker').clone();date.find('a').remove();const times=ubcTime(clean(date.text()),clean(area.find('.time-wrapper .details').text()));
  if(title!==candidate.title||times.start!==candidate.start||times.end!==candidate.end)throw Error('UBC calendar and event times disagree');
  return {title,...times,type:kind(title),program:body,event_url:candidate.url,stream_url:ubcWatch,watch_kind:'channel',watch_note:'Choose the matching performance on the school’s YouTube channel.',evidence_url:candidate.url,evidence:'Official dated concert is tagged Streaming; the school directs online viewers to its public YouTube channel. Venue ticket prices apply to attendance.'};
 }
 async function ubc(get,now){
  const news=load(await get('https://music.ubc.ca/news-events/'));
  if(!news(`a[href="${ubcWatch}"]`).length||!/Streaming concerts/.test(news.text()))throw Error('UBC public streaming destination changed');
  const candidates=ubcCandidates(await get(ubcIndex),now);if(candidates.length>24)throw Error('UBC detail-page budget exceeded');
  const events=[];for(const c of candidates){const e=parseUbc(await get(c.url),c);if(e)events.push(e);}return events;
 }
 function vcassPlaylists(data){
  if(data?.status!==200||!Array.isArray(data.data))throw Error('VCASS public homepage schema changed');
  const ids=[...new Set(data.data.filter(e=>e.type==='FeatureContentColumns').map(e=>e.payload?.playlistID))];
  if(ids.some(id=>!/^\d+$/.test(id))||ids.length>4)throw Error('VCASS playlist identity or budget changed');return ids;
 }
 function parseVcass(data,now){
  if(data?.status!==200||!Array.isArray(data.data)||data.totalPages!==1)throw Error('VCASS playlist schema or pagination changed');
  const events=[];
  for(const list of data.data){if(!Array.isArray(list.playlistContent))throw Error('VCASS playlist contents missing');
   for(const e of list.playlistContent){
    const body=clean(e.description),title=clean(e.title);
    if(e.type!=='live'||!/^MUSIC\s*\|/i.test(title)||!/^0(?:\.0+)?$/.test(String(e.cost))||excluded(title+' '+body)||!/LIVE STREAM/i.test(body))continue;
    if(!/^\d+$/.test(e.contentID)||!/^\d{10}$/.test(e.start))throw Error('VCASS event identity or timestamp missing');
    const opens=Number(e.start)*1000;if(!inWindow(new Date(opens).toISOString(),now))continue;
    const date=dayKey(new Date(opens),'Australia/Melbourne');
    const m=body.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Za-z]+)\s*@\s*(\d{1,2}[.:]\d{2}\s*[AP]M)/i);
    if(!m)throw Error('VCASS performance time missing');
    const printed=namedDate(`${m[3]} ${m[2]}, ${date.slice(0,4)}`),start=zonedTime(`${printed}T${clock24(m[4].replace('.',':'))}`,'Australia/Melbourne');
    const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'Australia/Melbourne',weekday:'long'}).format(new Date(start));
    if(printed!==date||weekday.toLowerCase()!==m[1].toLowerCase()||Date.parse(start)<opens||Date.parse(start)-opens>30*60000)throw Error('VCASS player and performance dates disagree');
    const url=`https://vcasspresents.5stream.com/#/item/${e.contentID}`;
    events.push({id:`vcass-${e.contentID}`,title:title.replace(/^MUSIC\s*\|\s*/i,''),type:/chamber music/i.test(body)?'Chamber':kind(title),start,end:null,program:/chamber music/i.test(body)?'Student chamber music':'',event_url:url,stream_url:`https://vcasspresents.5stream.com/#/play/${e.contentID}`,watch_kind:'registration',watch_note:'A free account on VCASS Presents is required.',evidence_url:url,evidence:'School-linked public streaming provider lists a live music concert at zero cost; printed performance time agrees with the player date. Player opens before the concert.'});
   }
  }return events;
 }
 async function vcass(get,now){const events=[];for(const id of vcassPlaylists(await get(vcassHome,true)))events.push(...parseVcass(await get(vcassPlaylist(id),true),now));return [...new Map(events.map(e=>[e.id,e])).values()];}
 return {ubcCandidates,parseUbc,vcassPlaylists,parseVcass,adapters:{ubc,vcass}};
}
