import {load} from 'cheerio';
import {safeUrl,dayKey} from '../dist/core.js';
export const campusSources=[
 {id:'toronto',name:'University of Toronto Faculty of Music',url:'https://music.utoronto.ca/events',timezone:'America/Toronto'},
 {id:'stanford',name:'Stanford University Department of Music',url:'https://music.stanford.edu/events',timezone:'America/Los_Angeles'}
];
export const campusHosts=['music.utoronto.ca','music.stanford.edu'];
export function createCampus({clean,zonedTime,clock24,namedDate,DAY}){
 const cancelled=text=>/\bcancel(?:led|ed)\b|\bpostponed\b|\bnot (?:be )?(?:live)?streamed\b/i.test(text||'');
 const current=(start,now)=>Date.parse(start)>=+now-DAY&&Date.parse(start)<+now+45*DAY;
 function torontoDate($){
  const date=clean($('.o-hero-media__info-date').text());
  if(!/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(date))throw new Error('Toronto event date missing');
  return namedDate(date);
 }
 function parseToronto(html,url){
  const $=load(html),body=$('.l-main--event__content'),title=clean($('h1').text());
  if(!body.length||!title)throw new Error('Toronto event layout changed');
  if(cancelled(title+' '+body.text())||clean($('.o-hero-media--event__button').text())!=='Free'||/\bno (?:public )?livestream|livestream.{0,60}(?:not available|password|subscription|paid|\$)/i.test(body.text()))return null;
  const offer=body.find('p').filter((i,p)=>/\blivestream available on\b/i.test($(p).text())).first();
  const stream=safeUrl(offer.find('a[href]').first().attr('href'));
  if(!stream||stream!=='https://www.youtube.com/@UofTMusic')return null;
  const date=torontoDate($),times=clean($('.o-hero-media__info-time').text()).split(/\s*[-–]\s*/);
  if(times.length!==2)throw new Error('Toronto time range changed');
  const start=zonedTime(date+'T'+clock24(times[0]),'America/Toronto'),end=zonedTime(date+'T'+clock24(times[1]),'America/Toronto');
  if(end<=start)throw new Error('Toronto event end precedes start');
  return {title,start,end,program:'',event_url:url,stream_url:stream,watch_kind:'channel',watch_note:'Choose the performance on the Faculty of Music YouTube channel.',evidence_url:url,evidence:'Official free public music event explicitly offers a livestream on the Faculty of Music YouTube channel.'};
 }
 async function toronto(get,now){
  let next='https://music.utoronto.ca/events';const pages=new Set(),seen=new Set(),events=[];
  const cutoff=dayKey(new Date(+now+45*DAY),'America/Toronto');
  while(next){
   if(pages.has(next)||pages.size>=12)throw new Error('Toronto pagination limit reached');pages.add(next);
   const $=load(await get(next)),cards=$('.m-listing-item--events-condensed');
   if(!cards.length&&!/no (?:events|results)/i.test($('main').text()))throw new Error('Toronto calendar layout changed');
   let beyond=false;
   for(const card of cards.toArray()){
    const item=$(card),category=clean(item.find('.m-listing-item--events-condensed__category').text());
    if(!/Free - Public - (?:Concert|Guest Recital|Student Recital|Masterclass)\b/i.test(category)||cancelled(item.text()))continue;
    const href=item.find('h3 a[href]').attr('href');if(!href)throw new Error('Toronto event link missing');
    const url=new URL(href,next).href;
    if(new URL(url).origin!=='https://music.utoronto.ca'||!new URL(url).pathname.startsWith('/event/'))throw new Error('Unexpected Toronto event link');
    if(seen.has(url))continue;seen.add(url);if(seen.size>80)throw new Error('Toronto event limit reached');
    const html=await get(url),date=torontoDate(load(html));
    // The official upcoming calendar is chronological; use the detail's explicit year.
    if(date>cutoff){beyond=true;break;}
    const event=parseToronto(html,url);if(event&&current(event.start,now))events.push(event);
   }
   const href=$('a[rel="next"]').attr('href');next=href&&!beyond?new URL(href,next).href:null;
   if(next&&(new URL(next).origin!=='https://music.utoronto.ca'||new URL(next).pathname!=='/events'))throw new Error('Unexpected Toronto pagination link');
  }return events;
 }
 function stanfordDate($){
  const field=$('.field-hs-event-date').clone();field.find('.field-label').remove();
  const value=clean(field.html()).replace(/(\d)(?:st|nd|rd|th)\b/g,'$1');
  const match=value.match(/([A-Za-z]+ \d{1,2}, \d{4})\s*(\d{1,2}:\d{2})\s*(am|pm)?\s*[-–]\s*(\d{1,2}:\d{2})\s*(am|pm)/i);
  if(!match)throw new Error('Stanford date or time range changed');
  // Only infer a shared meridiem within a single, increasing half-day range.
  if(!match[3]&&!(+match[2].split(':')[0]<12&&+match[4].split(':')[0]<12&&clock24(match[2]+match[5])<clock24(match[4]+match[5])))throw new Error('Ambiguous Stanford time range');
  const date=namedDate(match[1]),start=zonedTime(date+'T'+clock24(match[2]+(match[3]||match[5])),'America/Los_Angeles'),end=zonedTime(date+'T'+clock24(match[4]+match[5]),'America/Los_Angeles');
  if(end<=start)throw new Error('Stanford event end precedes start');return {start,end};
 }
 function parseStanford(html,url){
  const $=load(html),body=$('article.event .body'),title=clean($('article.event h1').text());
  if(!title||!body.length)throw new Error('Stanford event layout changed');
  if(cancelled(title+' '+body.text())||/\bno (?:live)?stream|\b(?:paid|ticketed|private) (?:live)?stream|(?:live)?stream.{0,35}(?:password|subscription|\$)/i.test(body.text()))return null;
  const link=body.find('a[href]').filter((i,a)=>/^livestreamed$/i.test(clean($(a).text()))).first();
  const stream=safeUrl(link.attr('href'));
  if(!stream||!/^https:\/\/music\.stanford\.edu\/[a-z_]+_live$/.test(stream))return null;
  const times=stanfordDate($),description=clean(body.find('p').first().html());
  if(!description)throw new Error('Stanford program description missing');
  return {title,...times,program:clean(body.find('ul').first().text()),event_url:url,stream_url:stream,watch_kind:'venue',watch_note:'Open the livestream link on Stanford’s viewing page.',evidence_url:url,evidence:'Official dated concert explicitly links a public broadcast page with the same program.',description};
 }
 async function stanford(get,now){
  let next='https://music.stanford.edu/events';const pages=new Set(),seen=new Set(),events=[];
  while(next){
   if(pages.has(next)||pages.size>=6)throw new Error('Stanford pagination limit reached');pages.add(next);
   const $=load(await get(next)),links=$('.hb-card__title a[href]');
   if(!links.length&&!/no (?:events|results)/i.test($('main').text()))throw new Error('Stanford calendar layout changed');
   let beyond=false;
   for(const link of links.toArray()){
    const label=clean($(link).text());if(/lecture|collab lab/i.test(label))continue;
    const url=new URL($(link).attr('href'),next).href;
    if(new URL(url).origin!=='https://music.stanford.edu'||!new URL(url).pathname.startsWith('/events/'))throw new Error('Unexpected Stanford event link');
    if(seen.has(url))continue;seen.add(url);if(seen.size>60)throw new Error('Stanford event limit reached');
    const html=await get(url),doc=load(html);
    // In-person events need not supply an end time, so inspect their date separately.
    const value=clean(doc('.field-hs-event-date').text()).replace(/(\d)(?:st|nd|rd|th)\b/g,'$1'),date=value.match(/[A-Za-z]+ \d{1,2}, \d{4}/)?.[0];
    if(!date)throw new Error('Stanford event date missing');
    if(namedDate(date)>dayKey(new Date(+now+45*DAY),'America/Los_Angeles')){beyond=true;break;}
    const event=parseStanford(html,url);if(!event||!current(event.start,now))continue;
    const live=load(await get(event.stream_url)),publicLink=live('main a[href]').toArray().some(a=>/livestream/i.test(live(a).text())&&/^https:\/\/(?:vimeo\.com\/event\/\d+|www\.youtube\.com\/watch\?v=[\w-]+)/.test(live(a).attr('href')||''));
    if(!publicLink||!clean(live('main').html()).includes(event.description)||/\bpassword|pay.to.view|subscription required/i.test(live('main').text()))throw new Error('Stanford broadcast page no longer confirms this public program');
    delete event.description;events.push(event);
   }
   const href=$('a[rel="next"]').attr('href');next=href&&!beyond?new URL(href,next).href:null;
   if(next&&(new URL(next).origin!=='https://music.stanford.edu'||new URL(next).pathname!=='/events'))throw new Error('Unexpected Stanford pagination link');
  }return events;
 }
 return {adapters:{toronto,stanford},parsers:{parseToronto,parseStanford}};
}
