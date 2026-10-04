import {load} from 'cheerio';
import {dayKey} from '../dist/core.js';

const texasIndex='https://music.utexas.edu/events?field_cofaevent_types_target_id%5B0%5D=236';
const templeIndex='https://boyer.temple.edu/events';
export const auditedSources=[
 {id:'ut-austin',name:'University of Texas at Austin Butler School of Music',url:texasIndex,timezone:'America/Chicago'},
 {id:'temple',name:'Temple University Boyer College of Music and Dance',url:templeIndex,timezone:'America/New_York'}
];
export const auditedHosts=['music.utexas.edu','boyer.temple.edu','now.temple.edu'];

export function createAudited({clean,zonedTime,clock24,namedDate,DAY}){
 const cancelled=text=>/\bcancel(?:led|ed)\b|\bpostponed\b|\bnot (?:be )?(?:live)?streamed\b|\bno (?:public )?(?:live)?stream\b/i.test(text||'');
 const restricted=text=>/\b(?:private|paid|ticketed) (?:live)?stream\b|(?:live)?stream.{0,45}(?:password|subscription|required purchase|not available)|(?:password|subscription).{0,30}(?:live)?stream/i.test(text||'');
 const outOfScope=text=>/\bdance guest\b|\bdance concert\b|\bhigh school\b|\bgraduation\b|\blecture\b|\bopen house\b/i.test(text||'');
 const current=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;
 function official(href,origin,path){
  const url=new URL(href,origin);
  if(url.origin!==origin||!url.pathname.startsWith(path)||url.username||url.password)throw new Error('Unexpected audited-school URL');
  return url.href;
 }
 function stamp(raw,zone){
  const m=raw?.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?)([+-]\d\d:\d\d)$/);
  if(!m)throw new Error('UT Austin timestamp missing');
  const time=zonedTime(m[1],zone);
  if(Date.parse(raw)!==Date.parse(time))throw new Error('UT Austin offset disagrees with Central time');
  return time;
 }
 function parseTexas(html,url){
  const $=load(html),article=$('main'),heading=article.find('h1'),baseTitle=clean(heading.text());
  // Some program biographies contain nested article markup that closes the outer article.
  if(!article.find('article.cofaevent-event').length||heading.length!==1||!baseTitle)throw new Error('UT Austin event layout changed');
  const subtitle=clean(heading.next('h2').text()),title=baseTitle+(subtitle?' — '+subtitle:'');
  const body=clean(article.text());
  if(cancelled(body)||restricted(body)||outOfScope(title))return null;
  const status=clean(article.find('.field--name-field-cofaevent-status .field__item').text());
  if(status!=='Scheduled')return null;
  if(!article.find('.field--name-field-cofaevent-types a').toArray().some(a=>clean($(a).text())==='Streamed Online'))return null;
  const link=article.find('.field--name-field-cofaevent-add-button a[href]').filter((i,a)=>/^livestream$/i.test(clean($(a).text()))).first();
  // A category alone is insufficient: the event must supply the public viewing link.
  const stream=link.attr('href');if(stream!=='https://www.youtube.com/@BSoMLive')return null;
  const times=article.find('.field--name-field-cofaevent-datetime time');
  if(!times.length||times.length>2)throw new Error('UT Austin date range changed');
  const start=stamp(times.first().attr('datetime'),'America/Chicago');
  const printed=clean(times.first().text());
  if(namedDate(printed)!==dayKey(new Date(start),'America/Chicago')||clock24(printed)!==times.first().attr('datetime').slice(11,19))throw new Error('UT Austin printed date and metadata disagree');
  const end=times.length===2?stamp(times.last().attr('datetime'),'America/Chicago'):null;
  if(end&&end<=start)throw new Error('UT Austin end precedes start');
  return {title,start,end,program:'',event_url:url,stream_url:stream,watch_kind:'channel',watch_note:'Choose this performance on the Butler School’s YouTube channel.',evidence_url:url,evidence:'Official dated event is tagged Streamed Online and explicitly links the public Butler School YouTube livestream. Hall ticket prices do not apply to this stream.'};
 }
 async function texas(get,now){
  let next=texasIndex;const pages=new Set(),seen=new Set(),events=[];
  while(next){
   if(pages.has(next)||pages.size>=6)throw new Error('UT Austin pagination limit reached');pages.add(next);
   const $=load(await get(next)),view=$('.cofaevent-listing-page'),cards=view.find('.cofaevent-listing-page-row--main-content');
   if(!view.length||(!cards.length&&!/no (?:events|results)/i.test(view.text())))throw new Error('UT Austin calendar layout changed');
   let beyond=false;
   for(const card of cards.toArray()){
    const item=$(card),start=stamp(item.find('time[datetime]').first().attr('datetime'),'America/Chicago');
    if(Date.parse(start)>=+now+45*DAY){beyond=true;continue;}
    if(!current(start,now)||cancelled(item.text())||outOfScope(item.find('h2').text()))continue;
    if(!item.find('a[href="https://www.youtube.com/@BSoMLive"]').toArray().some(a=>/^livestream$/i.test(clean($(a).text()))))continue;
    const href=item.find('h2 a[href]').attr('href');if(!href)throw new Error('UT Austin event link missing');
    const url=official(href,'https://music.utexas.edu','/events/');if(seen.has(url))continue;seen.add(url);
    if(seen.size>35)throw new Error('UT Austin event budget exceeded');
    const event=parseTexas(await get(url),url);
    if(event&&event.start!==start)throw new Error('UT Austin calendar and event date disagree');
    if(event)events.push(event);
   }
   const href=view.find('a[rel="next"]').attr('href');next=href&&!beyond?official(new URL(href,next).href,'https://music.utexas.edu','/events'):null;
   if(next&&(new URL(next).pathname!=='/events'||new URL(next).searchParams.get('field_cofaevent_types_target_id[0]')!=='236'))throw new Error('UT Austin stream filter lost during pagination');
  }return events;
 }
 function parseTemple(html,url){
  const $=load(html),article=$('article.page__calendar-event'),title=clean($('main h1').text()),body=article.find('.component__body-text');
  if(!article.length||!title||!body.length)throw new Error('Temple event layout changed');
  const text=clean(body.text());
  if(!/Boyer College of Music and Dance/.test(article.find('.page__calendar-event__department').text())||cancelled(title+' '+article.text())||restricted(text)||outOfScope(title))return null;
  if(!/\bfree and open to the public\b/i.test(text))return null;
  const paragraph=body.find('p').filter((i,p)=>/\b(?:the )?livestream will be available at\b/i.test(clean($(p).text()))).first();
  const stream=paragraph.find('a[href="https://www.youtube.com/@boyercollege/streams"]').attr('href');if(!stream)return null;
  const times=article.find('.page__calendar-event__date time');if(times.length!==1)throw new Error('Temple event has ambiguous occurrences');
  const printed=clean(times.text()),m=printed.match(/^[A-Za-z]+, ([A-Za-z]+ \d{1,2}, \d{4})\s*\/\/\s*(\d{1,2}(?::\d{2})?\s*[ap]m)(?:\s+to\s+(\d{1,2}(?::\d{2})?\s*[ap]m))?$/i);
  if(!m)throw new Error('Temple event date format changed');
  const date=namedDate(m[1]);
  if(new URL(url).pathname.split('/')[2]!==date)throw new Error('Temple event URL and printed date disagree');
  const start=zonedTime(date+'T'+clock24(m[2]),'America/New_York'),end=m[3]?zonedTime(date+'T'+clock24(m[3]),'America/New_York'):null;
  if(end&&end<=start)throw new Error('Temple end precedes start');
  return {title,start,end,program:'',event_url:url,stream_url:stream,watch_kind:'channel',watch_note:'Choose this performance on the Boyer College YouTube channel.',evidence_url:url,evidence:'Official Boyer concert is free and public and explicitly announces a livestream on the school’s YouTube channel.'};
 }
 async function temple(get,now){
  // Listing teasers omit livestream copy; bound the complete date-window walk.
  let next=templeIndex;const pages=new Set(),seen=new Set(),events=[];
  const first=dayKey(new Date(+now-2*DAY),'America/New_York'),last=dayKey(new Date(+now+45*DAY),'America/New_York');
  while(next){
   if(pages.has(next)||pages.size>=6)throw new Error('Temple pagination limit reached');pages.add(next);
   const $=load(await get(next)),list=$('main .catalog__items'),cards=list.find('.teaser__legacy-event');
   if(!list.length||(!cards.length&&!/no (?:events|results)/i.test($('main').text())))throw new Error('Temple calendar layout changed');
   let beyond=false;
   for(const card of cards.toArray()){
    const item=$(card),trackingDate=item.attr('data-gtm-event-datevalue');
    const printed=clean(item.find('.date__short').text()),dateParts=printed.match(/^([A-Za-z]+)\.? (\d{1,2}), (\d{4})\b/);
    const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const month=dateParts&&months.find(m=>m.startsWith(dateParts[1]));
    if(!month||!/^\d{4}-\d\d-\d\d$/.test(trackingDate||''))throw new Error('Temple calendar date missing');
    // The analytics date uses UTC; the visible calendar date uses Philadelphia time.
    const date=namedDate(`${month} ${dateParts[2]}, ${dateParts[3]}`);
    if(date>last){beyond=true;continue;}
    if(date<first||cancelled(item.text())||outOfScope(item.find('h2').text()))continue;
    const href=item.find('a[href]').first().attr('href');if(!href)throw new Error('Temple event link missing');
    const url=official(href,'https://now.temple.edu','/events/');if(seen.has(url))continue;seen.add(url);
    if(seen.size>60)throw new Error('Temple event budget exceeded');
    const event=parseTemple(await get(url),url);
    if(event&&(dayKey(new Date(event.start),'America/New_York')!==date||dayKey(new Date(event.start),'UTC')!==trackingDate))throw new Error('Temple calendar and event date disagree');
    if(event&&current(event.start,now))events.push(event);
   }
   const href=$('main a[rel="next"]').attr('href');next=href&&!beyond?official(new URL(href,next).href,'https://boyer.temple.edu','/events'):null;
   if(next&&new URL(next).pathname!=='/events')throw new Error('Unexpected Temple pagination link');
  }return events;
 }
 return {adapters:{'ut-austin':texas,temple},parsers:{parseTexas,parseTemple}};
}
