import {load} from 'cheerio';
import {liveWhaleWindow} from './livewhale.mjs';
import {createHash} from 'node:crypto';
import {safeUrl,dayKey} from '../dist/core.js';

export const melbourneFeed='https://events.unimelb.edu.au/live/json/events/group/Faculty%20of%20Fine%20Arts%20and%20Music/max/200';
export const melbourneWatch='https://finearts-music.unimelb.edu.au/about-us/mcm/conservatorium-streamed-concerts';
export const geidaiIndex='https://gma.geidai.ac.jp/';
export const moscowFeed='https://t.me/s/mosconsvtv';
export const moscowWatch='https://www.mosconsv.tv/stream';
export const internationalSources=[
 {id:'melbourne',name:'Melbourne Conservatorium of Music',url:melbourneWatch,timezone:'Australia/Melbourne'},
 {id:'geidai',name:'Tokyo University of the Arts — Geidai',url:geidaiIndex,timezone:'Asia/Tokyo'},
 {id:'moscow',name:'Moscow Tchaikovsky Conservatory',url:moscowWatch,timezone:'Europe/Moscow'}
];
export const internationalHosts=['events.unimelb.edu.au','gma.geidai.ac.jp','t.me','www.mosconsv.tv'];
const cancelled=text=>/cancel(?:led|ed)|postponed|отмен[аыёе]|перенес[её]н|中止|延期|配信.{0,8}(?:終了|行いません)|stream.{0,25}(?:cancel|unavailable|not available)/i.test(text);
const restricted=text=>/pay.per.view|private stream|password|members.only|subscription required|有料配信|視聴.{0,6}(?:購入|料金)|платн.{0,12}трансляц/i.test(text);
const ruMonths=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

export function createInternational({clean,zonedTime,kind,DAY}){
 const inWindow=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;

 function melbourneCandidates(data,now){
  if(!Array.isArray(data)||data.length>=200)throw new Error('Melbourne feed changed or reached its complete-feed limit');
  return data.filter(e=>{
   if(typeof e?.title!=='string'||!Array.isArray(e.event_types))throw new Error('Melbourne event schema changed');
   return e.event_types.includes('Performance')&&e.tags?.some(t=>['Music','Conservatorium'].includes(t))&&/^Free$/i.test(clean(e.cost))&&!e.is_canceled&&!e.is_all_day&&!cancelled(e.title)&&inWindow(e.date_iso,now);
  }).map(e=>{
   if(!Number.isInteger(e.id)||!safeUrl(e.url)||new URL(e.url).origin!=='https://events.unimelb.edu.au'||!new URL(e.url).pathname.startsWith('/finearts-music/event/'))throw new Error('Melbourne event identity changed');
   if(!['Australia/Canberra','Australia/Melbourne'].includes(e.timezone)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(e.date_iso))throw new Error('Melbourne date or timezone changed');
   const start=zonedTime(e.date_iso.slice(0,19),'Australia/Melbourne');
   if(Date.parse(start)!==Date.parse(e.date_iso)||Date.parse(start)!==e.date_ts*1000)throw new Error('Melbourne calendar timestamps disagree');
   return {...e,start};
  });
 }
 function parseMelbourne(html,candidate){
  const $=load(html);
  const metadata=$('script[type="application/ld+json"]').toArray().map(e=>JSON.parse($(e).text().replace(/\/\*<!\[CDATA\[\*\/|\/\*\]\]>\*\//g,''))).find(e=>e['@type']==='Event');
  if(!metadata?.name||metadata.url!==candidate.url)throw new Error('Melbourne event metadata missing or mismatched');
  const title=clean(metadata.name),body=clean(metadata.description);
  if(cancelled(title+' '+body+' '+metadata.eventStatus)||restricted(body))return null;
  const hanson=/Hanson Dyer Hall Concert Series/.test(body)&&/All concerts in this series can also be streamed live/i.test(body);
  // The official public player page explicitly covers the Melba lunch-hour series.
  // Require dated series membership on the event; never generate weekly occurrences.
  const melba=/Melba Hall Lunch Hour Concert Series/.test(body)&&metadata.location?.some(l=>/Melba Hall/.test(l.name));
  if(!hanson&&!melba)return null;
  const printed=$('meta[property="og:start_time"]').attr('content');
  if(Date.parse(metadata.startDate)!==Date.parse(candidate.start)||Date.parse(printed)!==Date.parse(candidate.start))throw new Error('Melbourne feed and event times disagree');
  const end=Date.parse(metadata.endDate)>Date.parse(candidate.start)?new Date(metadata.endDate).toISOString():null;
  const program=body.split(/\bPROGRAM\b/)[1]?.split(/\bCREDITS\b/)[0]?.trim()||'';
  return {id:`melbourne-${candidate.id}-${candidate.date_ts}`,title,start:candidate.start,end,program,type:candidate.tags.includes('Jazz')?'Jazz':kind(title+' '+program),event_url:candidate.url,stream_url:melbourneWatch,watch_kind:'venue',watch_note:`Select the ${melba?'Melba Hall Lunch Hour':'Hanson Dyer Hall'} player on the school’s streaming page.`,evidence_url:candidate.url,evidence:melba?'Official free, dated Melba Hall Lunch Hour series event; the university streaming page explicitly provides this series’ public live player.':'Official free event explicitly promises live streaming of the Hanson Dyer Hall series; calendar and event timestamps agree.'};
 }
 async function melbourne(get,now){
  const candidates=melbourneCandidates(await get(liveWhaleWindow(melbourneFeed,now,'Australia/Melbourne'),true),now),events=[];
  if(candidates.length>60)throw new Error('Melbourne detail-page budget exceeded');
  for(const candidate of candidates){const event=parseMelbourne(await get(candidate.url),candidate);if(event)events.push(event);}
  return events;
 }

 function geidaiCandidates(html,now){
  const $=load(html);
  if(!$('#content').length||!$('title').text().includes('GEIDAI'))throw new Error('Geidai recent-post index changed');
  const seen=new Map();
  for(const a of $('#content a[href]').toArray()){
   if(!/【ライブ配信】/.test($(a).text()))continue;
   const url=safeUrl($(a).attr('href'));
   if(!url||new URL(url).origin!==new URL(geidaiIndex).origin)throw new Error('Geidai event link changed');
   const match=new URL(url).pathname.match(/^\/(20\d{2})(\d{2})(\d{2})-[a-z0-9_-]+\/$/i);
   if(!match)throw new Error('Geidai concert date missing from event link');
   const date=`${match[1]}-${match[2]}-${match[3]}`;
   if(date<dayKey(new Date(+now-2*DAY),'Asia/Tokyo')||date>dayKey(new Date(+now+45*DAY),'Asia/Tokyo'))continue;
   seen.set(url,{url,date});
  }
  if(seen.size>20)throw new Error('Geidai announcement budget exceeded');
  return [...seen.values()];
 }
 function parseGeidai(html,candidate){
  const $=load(html),area=$('#single-blocks').clone();area.find('.related-posts').remove();
  const title=clean($('h1.page-header-title').text()),body=clean(area.text());
  if(!title||!area.length)throw new Error('Geidai event layout changed');
  if(!title.includes('【ライブ配信】')||cancelled(title+' '+body)||restricted(body))return null;
  const match=body.match(/日時[：:]\s*(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日\s*[（(][^）)]+[）)]\s*(\d{1,2})[:：](\d{2})\s*開演/);
  if(!match)throw new Error('Geidai broadcast date or start time missing');
  const date=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  if(date!==candidate.date)throw new Error('Geidai index and concert dates disagree');
  return {title:title.replace('【ライブ配信】','').trim(),type:/モーニング/.test(title)?'Orchestra':'Concert',start:zonedTime(`${date}T${match[4].padStart(2,'0')}:${match[5]}:00`,'Asia/Tokyo'),end:null,program:body.split('プログラム・出演者')[1]?.split('Related Posts')[0]||'',event_url:candidate.url,stream_url:candidate.url,watch_kind:'venue',evidence_url:candidate.url,evidence:'Official GEIDAI Music Archive concert explicitly announces a livestream and a matching Japanese date and start time; ended broadcasts excluded.'};
 }
 async function geidai(get,now){
  const candidates=geidaiCandidates(await get(geidaiIndex),now),events=[];
  for(const c of candidates){const event=parseGeidai(await get(c.url),c);if(event&&inWindow(event.start,now))events.push(event);}
  return events;
 }

 function parseMoscow(html,now){
  const $=load(html),posts=$('.tgme_widget_message[data-post^="mosconsvtv/"]');
  if(!posts.length)throw new Error('Moscow official broadcast feed unavailable or changed');
  const events=[];
  for(const post of posts.toArray()){
   const p=$(post),message=p.find('.tgme_widget_message_text'),text=clean(message.text());
   if(!/^Расписание трансляций на /i.test(text))continue;
   const published=new Date(p.find('time[datetime]').attr('datetime'));
   if(!Number.isFinite(+published)||published>now)throw new Error('Moscow announcement timestamp missing or invalid');
   // Tie yearless Russian schedule rows to the actual announcement timestamp,
   // never to today's year; a forgotten old schedule cannot become a new concert.
   if(+now-published>62*DAY)continue;
   const lines=(message.html()||'').split(/<br\s*\/?>/i).map(clean).filter(Boolean),postId=p.attr('data-post').split('/')[1];
   let count=0;
   for(let i=1;i<lines.length;i++){
    const match=lines[i].match(/^(\d{1,2})\s+([а-яё]+),\s*(.+?),\s*(\d{1,2})[.:](\d{2})$/i);
    if(!match){if(/^\d{1,2}\s+[а-яё]+,/i.test(lines[i]))throw new Error('Moscow broadcast date format changed');continue;}
    const month=ruMonths.indexOf(match[2].toLowerCase())+1,title=lines[++i];
    if(!month||!title||/^\d{1,2}\s/.test(title))throw new Error('Moscow broadcast row incomplete');
    count++;
    if(cancelled(title+' '+match[0])||restricted(title))continue;
    const possible=[published.getUTCFullYear()-1,published.getUTCFullYear(),published.getUTCFullYear()+1].flatMap(year=>{try{return [zonedTime(`${year}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}T${match[4].padStart(2,'0')}:${match[5]}:00`,'Europe/Moscow')];}catch{return [];}}).filter(start=>Math.abs(Date.parse(start)-published)<62*DAY);
    if(possible.length!==1)throw new Error('Moscow broadcast year is ambiguous');
    const start=possible[0];if(!inWindow(start,now))continue;
    const url=`https://t.me/mosconsvtv/${postId}`;
    const identity=createHash('sha256').update(title+'|'+match[3]).digest('hex').slice(0,8);
    events.push({id:`moscow-${postId}-${Date.parse(start)}-${identity}`,title,type:/конкурс/i.test(title)?'Competition':/хоров/i.test(title)?'Voice & choral':'Concert',start,end:null,program:match[3],event_url:url,stream_url:moscowWatch,watch_kind:'venue',watch_note:'Opens Moscow Conservatory TV’s public broadcast player.',evidence_url:url,evidence:'Dated monthly broadcast schedule on the conservatory TV service’s official public channel; year anchored to the original announcement timestamp, time interpreted in Moscow.'});
   }
   if(!count)throw new Error('Moscow broadcast schedule format changed');
  }
  return [...new Map(events.map(e=>[e.start+'|'+e.title+'|'+e.program,e])).values()];
 }
 return {melbourneCandidates,parseMelbourne,geidaiCandidates,parseGeidai,parseMoscow,adapters:{melbourne,geidai,moscow:async(get,now)=>parseMoscow(await get(moscowFeed),now)}};
}
