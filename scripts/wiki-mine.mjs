import {load} from 'cheerio';
import {safeUrl} from '../dist/core.js';

export const peabodyFeed='https://peabody.jhu.edu/wp-json/tribe/events/v1/events?search=Livestream&per_page=50';
export const michiganIndex='https://smtd.umich.edu/events/?_viewing_options=37acb94c8a8ff095031820c312e81ccd';
export const juilliardIndex='https://www.juilliard.edu/stage-beyond/performance/calendar?tags=1816';
export const ihwaIndex='https://www.ihwa.de/event';
export const wikiMineSources=[
 {id:'peabody',name:'Peabody Institute of The Johns Hopkins University',url:'https://peabody.jhu.edu/events/',timezone:'America/New_York'},
 {id:'michigan',name:'University of Michigan School of Music, Theatre & Dance',url:michiganIndex,timezone:'America/New_York'},
 {id:'juilliard',name:'The Juilliard School',url:juilliardIndex,timezone:'America/New_York'},
 {id:'hmdk-stuttgart',name:'HMDK Stuttgart — International Hugo Wolf Academy competition',url:ihwaIndex,timezone:'Europe/Berlin'}
];
export const wikiMineHosts=[
 'peabody.jhu.edu','smtd.umich.edu','www.juilliard.edu','juilliard.edu',
 'www.ihwa.de','ihwa.de','video.ibm.com','www.youtube.com','youtube.com'
];

const cancelled=text=>/\bcancel(?:led|ed)\b|\bpostponed\b|\babgesagt\b|\bentfällt\b|\bnot (?:be )?(?:live)?streamed\b/i.test(text||'');
const restricted=text=>/password|login required|members.only|pay.per.view|subscription required|(?:stream|broadcast).{0,25}(?:paid|ticket required)/i.test(text||'');
const ibmChannel=href=>{
 const url=safeUrl(href);if(!url)return null;
 const u=new URL(url);if(u.hostname!=='video.ibm.com'||!/^\/channel\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))return null;
 return url.replace(/\/$/,'');
};
const juilliardEventUrl=(href,base)=>{
 if(!href)throw new Error('Juilliard event link missing');
 const url=safeUrl(new URL(href,base).href);
 if(!url||!['www.juilliard.edu','juilliard.edu'].includes(new URL(url).hostname)||!/^\/event\/\d+\//.test(new URL(url).pathname))throw new Error('Juilliard event link changed');
 return url;
};
const ihwaEventUrl=(href,base)=>{
 if(!href)throw new Error('IHWA event link missing');
 const url=safeUrl(new URL(href,base).href);
 if(!url||!['www.ihwa.de','ihwa.de'].includes(new URL(url).hostname)||!/^\/event\/[\w-]+\/?$/.test(new URL(url).pathname))throw new Error('IHWA event link changed');
 return url.replace(/\/$/,'');
};
const dedup=events=>[...new Map(events.map(e=>[e.event_url+'|'+e.start,e])).values()];

export function createWikiMine({clean,zonedTime,clock24,namedDate,DAY}){
 const inWindow=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;
 const usableEnd=(start,end)=>end&&Date.parse(end)>Date.parse(start)?end:null;

 function parsePeabody(payload,now){
  if(!Array.isArray(payload?.events)||!Number.isInteger(payload.total)||payload.total!==payload.events.length||(payload.total_pages||1)>1)throw new Error('Peabody livestream feed changed or is incomplete');
  if(payload.events.length>50)throw new Error('Peabody livestream feed budget exceeded');
  return payload.events.flatMap(e=>{
   if(!Number.isInteger(e.id)||typeof e.title!=='string'||typeof e.url!=='string')throw new Error('Peabody event schema changed');
   if(e.status&&e.status!=='publish')return [];
   if(!/^Free$/i.test(clean(e.cost||'')))return [];
   if(e.timezone!=='America/New_York')throw new Error('Peabody timezone changed');
   if(!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(e.start_date||''))throw new Error('Peabody start date missing');
   const $=load(`<div>${e.description||''}</div>`);
   const link=$('a[href]').filter((i,a)=>/^livestream$/i.test(clean($(a).text()))).first();
   const streamUrl=ibmChannel(link.attr('href'));
   if(!streamUrl)return [];
   const eventUrl=safeUrl(e.url);
   if(!eventUrl||new URL(eventUrl).hostname!=='peabody.jhu.edu'||!new URL(eventUrl).pathname.startsWith('/event/'))throw new Error('Peabody event URL changed');
   if(cancelled(e.title+' '+clean($.text()))||restricted(clean($.text())))return [];
   const start=zonedTime(e.start_date.replace(' ','T'),'America/New_York');
   if(e.utc_start_date){
    const utc=Date.parse(e.utc_start_date.replace(' ','T')+'Z');
    if(Number.isFinite(utc)&&utc!==Date.parse(start))throw new Error('Peabody local and UTC start disagree');
   }
   if(!inWindow(start,now))return [];
   let end=null;
   if(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(e.end_date||''))end=usableEnd(start,zonedTime(e.end_date.replace(' ','T'),'America/New_York'));
   const cats=(e.categories||[]).map(c=>c.name||'').join(' ');
   return [{id:`peabody-${e.id}`,title:clean(e.title),start,end,program:clean(($('p').eq(1).text()||$.text())).slice(0,300),type:/orchestra/i.test(e.title)?'Orchestra':/chamber/i.test(e.title+cats)?'Chamber':/recital/i.test(e.title+cats)?'Recital':'Concert',event_url:eventUrl,stream_url:streamUrl,watch_kind:'venue',watch_note:'Opens the Peabody hall’s public IBM video channel.',evidence_url:eventUrl,evidence:'Official free Peabody event includes an explicit Livestream button to a public IBM Video channel; Tribe feed date is campus-local Eastern time.'}];
  });
 }

 function parseMichigan(html,now){
  const $=load(html),cards=$('article.event');
  if(!cards.length)throw new Error('Michigan livestream calendar changed');
  if(cards.length>40)throw new Error('Michigan livestream budget exceeded');
  const events=[];
  for(const card of cards.toArray()){
   const item=$(card),text=clean(item.text());
   if(cancelled(text)||restricted(text))continue;
   if(!/Free - no tickets required/i.test(text))continue;
   const streamA=item.find('a[href]').filter((i,a)=>/^Livestream Link$/i.test(clean($(a).text()))).first();
   const stream=safeUrl(streamA.attr('href'));
   if(!stream||new URL(stream).hostname!=='smtd.umich.edu'||!/^\/live-stream-[a-z0-9-]+\/?$/.test(new URL(stream).pathname))continue;
   const eventA=item.find('h2 a[href*="/event/"]').first();
   const eventUrl=safeUrl(eventA.attr('href'));
   if(!eventUrl||new URL(eventUrl).hostname!=='smtd.umich.edu')throw new Error('Michigan event link changed');
   const slug=new URL(eventUrl).pathname.match(/^\/event\/(\d{1,2})-([a-z]+)-(\d{4})(?:-\d+)?\/$/);
   if(!slug)throw new Error('Michigan event date missing from URL');
   const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
   const month=months.indexOf(slug[2])+1;if(!month)throw new Error('Michigan event month invalid');
   const when=clean(item.find('.event-content-wrap').first().text())||text;
   const clock=when.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm))\b/i)||text.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm))\b/i);
   if(!clock)throw new Error('Michigan clock missing');
   const day=`${slug[3]}-${String(month).padStart(2,'0')}-${slug[1].padStart(2,'0')}`;
   const start=zonedTime(day+'T'+clock24(clock[1]),'America/New_York');
   if(!inWindow(start,now))continue;
   const title=clean(eventA.text());if(!title)throw new Error('Michigan title missing');
   const program=clean(item.find('p').filter((i,p)=>!/Free - no tickets|Livestream Link|View Program/i.test(clean($(p).text()))).first().text());
   events.push({id:`michigan-${new URL(eventUrl).pathname.split('/').filter(Boolean).pop()}`,title,start,end:null,program,type:/orchestra|philharmonia|band/i.test(title)?'Orchestra':/quartet|chamber/i.test(title)?'Chamber':/recital|piano|violin|cello/i.test(title)?'Recital':'Concert',event_url:eventUrl,stream_url:stream.replace(/\/$/,'')+'/',watch_kind:'venue',watch_note:'Opens the school’s public hall livestream page.',evidence_url:eventUrl,evidence:'Official Michigan livestream-filter listing marks Free — no tickets required and supplies an explicit Livestream Link; date taken from the event URL and printed Eastern clock.'});
  }
  return dedup(events);
 }

 function parseJuilliard(html,url){
  const $=load(html),title=clean($('h1').first().text())||clean($('script[type="application/ld+json"]').toArray().map(e=>{try{return JSON.parse($(e).text());}catch{return null;}}).flatMap(d=>Array.isArray(d?.['@graph'])?d['@graph']:[d]).find(e=>e?.['@type']==='MusicEvent')?.name||'');
  const ld=$('script[type="application/ld+json"]').toArray().map(e=>{try{return JSON.parse($(e).text());}catch{return null;}}).flatMap(d=>d?Array.isArray(d['@graph'])?d['@graph']:[d]:[]).find(e=>e?.['@type']==='MusicEvent');
  if(!title||!ld?.startDate)throw new Error('Juilliard event layout changed');
  if(cancelled(title)||restricted(clean($('body').text())))return null;
  const body=clean($('body').text());
  if(!/Return to this page to watch/i.test(body)||!/Watch the performance on this page at the scheduled date and time/i.test(body))return null;
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(ld.startDate))throw new Error('Juilliard startDate missing offset');
  const start=zonedTime(ld.startDate.slice(0,19),'America/New_York');
  if(Date.parse(start)!==Date.parse(ld.startDate))throw new Error('Juilliard Eastern offset disagrees');
  if(clean(ld.name||'')&&clean(ld.name)!==title)throw new Error('Juilliard title disagrees with metadata');
  const id=new URL(url).pathname.match(/^\/event\/(\d+)\//)?.[1];
  if(!id)throw new Error('Juilliard event id missing');
  return {id:`juilliard-${id}`,title,start,end:null,program:clean(ld.description||'').slice(0,300),type:/orchestra/i.test(title)?'Orchestra':/quartet|chamber|sonatenabend|liederabend/i.test(title)?'Chamber':/recital|piano|violin|cello|composition/i.test(title)?'Recital':/jazz/i.test(title)?'Jazz':'Concert',event_url:url,stream_url:url,watch_kind:'direct',watch_note:'The player appears on this event page at concert time. Juilliard LIVE may require a free account for some archives.',evidence_url:url,evidence:'Listed under Juilliard’s Live Streaming calendar filter; event page explicitly says to return here to watch at the scheduled Eastern date and time.'};
 }
 async function juilliard(get,now){
  const $=load(await get(juilliardIndex)),rows=$('.views-row');
  if(!rows.length)throw new Error('Juilliard livestream calendar changed');
  if(rows.length>40)throw new Error('Juilliard livestream budget exceeded');
  const seen=new Set(),events=[];
  for(const row of rows.toArray()){
   const item=$(row);
   if(!/>\s*Live Streaming\s*</i.test(item.html()||'')&&!/Live Streaming/i.test(item.text()))continue;
   if(cancelled(item.text()))continue;
   const href=item.find('a[href*="/event/"]').first().attr('href');
   const url=juilliardEventUrl(href,juilliardIndex);if(seen.has(url))continue;
   if(seen.size>=9)break; // Keep index + details ≤10 requests; remaining Live Streaming cards wait for a later refresh window.
   seen.add(url);
   const event=parseJuilliard(await get(url),url);
   if(event&&inWindow(event.start,now))events.push(event);
  }
  return dedup(events);
 }

 function parseIhwa(html,url){
  const $=load(html),title=clean($('h1,h2').first().text())||clean($('title').text().replace(/\s*[|/].*$/,''));
  const body=clean($('body').text());
  if(!title)throw new Error('IHWA event layout changed');
  if(cancelled(title+' '+body)||restricted(body))return null;
  if(!/Livestream ins Internet|streamed live online/i.test(body))return null;
  if(!/Free admission|Eintritt frei/i.test(body))return null;
  const stream=safeUrl($('a[href*="youtube.com/@liedwettbewerb"]').first().attr('href'))||'https://www.youtube.com/@liedwettbewerb';
  if(!['www.youtube.com','youtube.com'].includes(new URL(stream).hostname))return null;
  const stamp=$('time[datetime]').first().attr('datetime')||body.match(/\b(20\d{2}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d)\b/)?.[1];
  if(!stamp)throw new Error('IHWA competition datetime missing');
  const start=zonedTime(stamp.slice(0,19),'Europe/Berlin');
  if(Date.parse(start)!==Date.parse(stamp))throw new Error('IHWA Berlin offset disagrees');
  const slug=new URL(url).pathname.split('/').filter(Boolean).pop();
  return {id:`hmdk-${slug}`,title,start,end:null,program:clean(body).slice(0,300),type:'Competition',event_url:url,stream_url:stream,watch_kind:'channel',watch_note:'Choose the matching competition round on the public YouTube channel.',evidence_url:url,evidence:'Official Hugo Wolf Academy dated competition round at HMDK Stuttgart announces a free-admission internet livestream and links the public competition YouTube channel.'};
 }
 async function ihwa(get,now){
  const $=load(await get(ihwaIndex));
  const hrefs=[...new Set($('a[href*="wettbewerb26-"]').toArray().map(a=>$(a).attr('href')).filter(Boolean))];
  if(!hrefs.length)throw new Error('IHWA competition round links missing');
  const rounds=hrefs.slice(0,10);
  const events=[];
  for(const href of rounds){
   // Skip non-performance companion pages without round/finale/preistraeger markers when possible
   if(/beyondlied/i.test(href))continue;
   const url=ihwaEventUrl(href,ihwaIndex);
   const event=parseIhwa(await get(url),url);
   if(event&&inWindow(event.start,now))events.push(event);
  }
  return dedup(events);
 }

 async function peabody(get,now){
  return parsePeabody(await get(peabodyFeed,true),now);
 }
 async function michigan(get,now){
  return parseMichigan(await get(michiganIndex),now);
 }

 return {
  adapters:{peabody,michigan,juilliard,'hmdk-stuttgart':ihwa},
  parsers:{parsePeabody,parseMichigan,parseJuilliard,parseIhwa}
 };
}
