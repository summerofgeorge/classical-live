import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {safeUrl} from '../dist/core.js';
const cu='https://cupresents.org',iowa='https://music.uiowa.edu';
export const blairFeed='https://events.vanderbilt.edu/live/json/events/tag/blair/max/500';
export const iowaIndex=iowa+'/events/school-music-livestream';
export const blairWatch='https://blair.vanderbilt.edu/livestreams/';
export const yaleFeed='https://music.yale.edu/api/events/next_livestream?keyword_term_ids=69';
export const americanSources=[
 {id:'yale',name:'Yale School of Music',url:'https://music.yale.edu/live',timezone:'America/New_York'},
 {id:'colorado',name:'University of Colorado Boulder College of Music',url:cu+'/performances',timezone:'America/Denver'},
 {id:'blair',name:'Vanderbilt Blair School of Music',url:blairWatch,timezone:'America/Chicago'},
 {id:'iowa',name:'University of Iowa School of Music',url:iowaIndex,timezone:'America/Chicago'}
];
export const americanHosts=['cupresents.org','events.vanderbilt.edu','music.uiowa.edu','music.yale.edu','music-tickets.yale.edu'];
const cancelled=text=>/\bcancel(?:led|ed)\b|\bpostponed\b|will not be (?:live)?streamed/i.test(text);
// Classify titles, not a musician's biography or a classical work's influences.
const outsideScope=title=>/\bjazz\b|big band|\bpop\b|\brock\b|\bDJ\b|lecture|conference|preshow talk|West African Highlife|Gamelan|Sweeney Todd|musical theatre/i.test(title);
const restricted=text=>/password|login required|members.only|private stream|pay.per.view|(?:stream|broadcast).{0,25}(?:paid|ticket required|subscription)/i.test(text);
const dedup=events=>[...new Map(events.map(e=>[e.event_url+'|'+e.start,e])).values()];
function localUrl(href,base,path){
 if(!href)throw new Error('American source event link missing');
 const url=safeUrl(new URL(href,base).href);
 if(!url||new URL(url).origin!==base||!new URL(url).pathname.startsWith(path))throw new Error('American source link changed');
 return url;
}
function coloradoStream(href){
 const url=localUrl(href,cu,'/'),path=new URL(url).pathname.toLowerCase().replace(/\/$/,'');
 // These legacy links were verified to redirect to the same free-player portal.
 if(!['/livestreaming','/cu-boulder-college-of-music-livestream','/cu-boulder-college-of-music-livestreams'].includes(path))throw new Error('Colorado livestream destination changed');
 return cu+'/livestreaming';
}
export function createAmerican({clean,zonedTime,clock24,namedDate,DAY}){
 const inWindow=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;
 function yaleCandidate(data){
  if(data?.nid===0&&data.output===''&&data.date==='')return null;
  if(!/^\d+$/.test(String(data?.nid))||!/^\d{10}$/.test(data?.date)||typeof data?.output!=='string')throw new Error('Yale next-broadcast API changed');
  const $=load(data.output),title=clean($('article h2').text());
  if(!title)throw new Error('Yale next-broadcast title missing');
  if(cancelled(title)||outsideScope(title))return null;
  const url=localUrl($('a.learn-more').attr('href'),'https://music-tickets.yale.edu','/');
  return {title,url,id:String(data.nid),start:new Date(Number(data.date)*1000).toISOString()};
 }
 function parseYale(html,candidate){
  const $=load(html),title=clean($('.tn-event-detail__title').text()),date=clean($('.tn-event-detail__display-time').text());
  if(!title||!date)throw new Error('Yale event detail unavailable or layout changed');
  if(cancelled(title)||outsideScope(title))return null;
  if(title!==candidate.title)throw new Error('Yale API and event title disagree');
  const paragraph=$('p').filter((i,p)=>/no purchase or registration required/i.test(clean($(p).text()))&&$(p).find('a[href="https://music.yale.edu/live"]').length).first();
  if(!paragraph.length||restricted(paragraph.text()))return null;
  if(!/\b\d{4}\b/.test(date))throw new Error('Yale event year missing');
  const start=zonedTime(namedDate(date)+'T'+clock24(date),'America/New_York');
  if(start!==candidate.start)throw new Error('Yale API and Eastern concert time disagree');
  return {id:`yale-${candidate.id}-${Date.parse(start)}`,title,start,end:null,program:'',event_url:candidate.url,stream_url:'https://music.yale.edu/live',watch_kind:'venue',watch_note:'Yale’s main public player. This feed covers the next announced main broadcast.',evidence_url:candidate.url,evidence:'Official next-livestream API and matching dated concert page; explicitly no purchase or registration required for online viewing.'};
 }
 async function yale(get,now){
  const c=yaleCandidate(await get(yaleFeed,true));if(!c||!inWindow(c.start,now))return [];
  const event=parseYale(await get(c.url),c);return event?[event]:[];
 }
 function parseColorado(html,url){
  const $=load(html),title=clean($('.show-detail-title').find('h1,h2').map((i,e)=>$(e).text()).get().join(': '));
  if(!title)throw new Error('Colorado event layout changed');
  if(cancelled(title)||outsideScope(title)||/Takács|Student Recitals in /i.test(title))return [];
  if(!/^Free\b/i.test(clean($('.show-price').first().text())))return [];
  const rows=$('.sd-tickets-list-item').filter((i,e)=>/Live Streaming/i.test($(e).find('.sdt-medium').text()));
  if(!rows.length)return [];
  const metadata=$('script[type="application/ld+json"]').toArray().map(e=>JSON.parse($(e).text())).find(e=>Array.isArray(e.offers));
  if(!metadata)throw new Error('Colorado performance metadata missing');
  if(/Cancelled|Postponed/.test(metadata.eventStatus||''))return [];
  const events=[];
  for(const row of rows.toArray()){
   const item=$(row),a=item.find('a').filter((i,e)=>/^Watch Here$/i.test(clean($(e).text()))).first();if(!a.length)continue;
   const stream=coloradoStream(a.attr('href'));
   const printed=clean(item.find('.sdt-date').text()),clock=clock24(clean(item.find('.sdt-time').text()));
   // Cross-check the full year and offset against the visible broadcast row.
   const offers=metadata.offers.filter(o=>{if(!/^\d{4}-\d\d-\d\dT/.test(o.validFrom||''))return false;if(!o.url)return true;try{return coloradoStream(o.url)===stream;}catch{return false;}});
   const matching=offers.filter(o=>{
    const d=new Date(o.validFrom);if(!Number.isFinite(+d))return false;
    const date=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',month:'short',day:'numeric',year:'numeric'}).format(d);
    return date.replaceAll('.','')===printed.replaceAll('.','').replace(/^Sept\b/,'Sep')&&o.validFrom.slice(11,19)===clock;
   });
   const stamps=[...new Set(matching.map(o=>o.validFrom))];
   if(stamps.length!==1)throw new Error('Colorado stream date is missing or ambiguous');
   const stamp=stamps[0],start=zonedTime(stamp.slice(0,19),'America/Denver');
   if(Date.parse(start)!==Date.parse(stamp))throw new Error('Colorado time-zone metadata disagrees');
   events.push({id:'colorado-'+createHash('sha256').update(url+'|'+start).digest('hex').slice(0,16),title,start,end:null,program:'',event_url:url,stream_url:stream,watch_kind:'venue',watch_note:'Use the Free College of Music Livestreams section and select the concert’s hall.',evidence_url:url,evidence:'Free concert with an event-specific Live Streaming / Watch Here performance; published date and Mountain offset cross-checked.'});
  }
  return dedup(events);
 }
 function coloradoPage(data,page){
  if(data?.status!==true||typeof data.newHtml!=='string'||+data.currentPage!==page||!Number.isInteger(+data.lastPage)||+data.lastPage<1||+data.lastPage>6)throw new Error('Colorado calendar pagination changed');
  const $=load(data.newHtml),cards=$('.show-item');
  if(!cards.length&&!/No Shows Found/i.test(data.newHtml))throw new Error('Colorado calendar unexpectedly empty');
  return {pages:+data.lastPage,urls:cards.toArray().flatMap(card=>{
   const item=$(card),title=clean(item.find('.show-item-title').text());
   if(clean(item.find('.show-item-type').text())!=='College of Music'||cancelled(title)||outsideScope(title)||/Takács|Student Recitals in /i.test(title))return [];
   return [localUrl(item.find('a.read-more-btn').attr('href'),cu,'/show-details/')];
  })};
 }
 async function colorado(get,now){
  let pages=1;const seen=new Set(),events=[];
  for(let page=1;page<=pages;page++){
   const url=new URL(cu+'/show-filtered-results');url.searchParams.set('start_date',new Date(+now-2*DAY).toISOString().slice(0,10));url.searchParams.set('end_date',new Date(+now+45*DAY).toISOString().slice(0,10));url.searchParams.set('page',String(page));
   const result=coloradoPage(await get(url.href,true),page);pages=result.pages;
   for(const eventUrl of result.urls){
    if(seen.has(eventUrl))continue;seen.add(eventUrl);if(seen.size>65)throw new Error('Colorado event budget exceeded');
    events.push(...parseColorado(await get(eventUrl),eventUrl).filter(e=>inWindow(e.start,now)));
   }
  }
  return dedup(events);
 }
 function parseBlair(data,now){
  if(!Array.isArray(data)||data.length>=500)throw new Error('Blair feed changed or exceeded its complete-feed budget');
  return dedup(data.flatMap(e=>{
   if(!e||typeof e.title!=='string'||(e.description!==null&&typeof e.description!=='string'))throw new Error('Blair event schema changed');
   const title=clean(e.title),$=load(e.description||''),body=clean(e.description);
   if([true,1,'1'].includes(e.is_canceled)||e.is_all_day||cancelled(title+' '+body)||outsideScope(title)||restricted(body))return [];
   if(!/\bfree (?:event|and open to the public)\b/i.test(body))return [];
   const paragraph=$('p').filter((i,p)=>/watch the livestream/i.test($(p).text())).first();
   const href=paragraph.find('a[href]').map((i,a)=>$(a).attr('href')).get().find(h=>/^https?:\/\/vu\.edu\/livestream\/?$/.test(h)||h===blairWatch);if(!href)return [];
   if(e.timezone!=='America/Chicago'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(e.date_iso||''))throw new Error('Blair date or timezone changed');
   const start=zonedTime(e.date_iso.slice(0,19),'America/Chicago');
   if(Date.parse(start)!==Date.parse(e.date_iso)||Date.parse(start)!==e.date_ts*1000)throw new Error('Blair calendar timestamps disagree');
   if(!inWindow(start,now))return [];
   const url=localUrl(e.url,'https://events.vanderbilt.edu','/blair/event/');if(!Number.isInteger(e.id))throw new Error('Blair native ID missing');
   return [{id:`blair-${e.id}-${e.date_ts}`,title,start,end:null,program:body,event_url:url,stream_url:blairWatch,watch_kind:'venue',watch_note:`Select ${clean(e.location)||'the concert’s hall'} on Blair’s public livestream page.`,evidence_url:url,evidence:'Official LiveWhale event explicitly says free and Watch the livestream; school shortlink resolves to the public hall-player portal.'}];
  }));
 }
 function parseIowa(html,url){
  const $=load(html),title=clean($('h1.page-title').text()),area=$('.sitenow-event-single'),body=area.find('.event-description');
  if(!title||!area.length||!body.length)throw new Error('Iowa event layout changed');
  const description=clean(body.text());if(cancelled(title+' '+description)||outsideScope(title)||restricted(description))return null;
  const paragraph=body.find('p').filter((i,p)=>/(?:concert|performance) can be viewed via livestream here/i.test($(p).text())).first();
  const href=paragraph.find('a[href]').map((i,a)=>$(a).attr('href')).get().find(h=>h===iowaIndex||h===iowaIndex+'-2');if(!href)return null;
  const date=clean(area.find('.event-time .date-instance__next-upcoming .date-instance__date').text());
  if(!/\b\d{4}\b/.test(date))throw new Error('Iowa event year missing');
  const start=zonedTime(namedDate(date)+'T'+clock24(date),'America/Chicago');
  return {title,start,end:null,program:description,event_url:url,stream_url:href,watch_kind:'venue',watch_note:'The public player starts when the announced performance begins.',evidence_url:url,evidence:'Listed on the dedicated upcoming-livestream schedule and explicitly linked to the public player by the individual event; cancellations rechecked.'};
 }
 async function iowaAdapter(get,now){
  const $=load(await get(iowaIndex)),area=$('#upcoming-livestreams');if(!area.length)throw new Error('Iowa livestream schedule changed');
  const links=area.find('a[href*="/event/"]');if(!links.length&&!/no (?:upcoming )?events|no results/i.test(area.text()))throw new Error('Iowa livestream schedule unexpectedly empty');
  const seen=new Set(),events=[];
  for(const a of links.toArray()){
   if(cancelled($(a).closest('.card').text()))continue;
   const url=localUrl($(a).attr('href'),iowa,'/event/');if(seen.has(url))continue;seen.add(url);if(seen.size>30)throw new Error('Iowa schedule budget exceeded');
   const event=parseIowa(await get(url),url);if(event&&inWindow(event.start,now))events.push(event);
  }
  return dedup(events);
 }
 return {adapters:{yale,colorado,blair:async(get,now)=>parseBlair(await get(blairFeed,true),now),iowa:iowaAdapter},parsers:{yaleCandidate,parseYale,parseColorado,coloradoPage,parseBlair,parseIowa}};
}
