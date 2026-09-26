import {load} from 'cheerio';
import {safeUrl} from '../dist/core.js';

const udkHost='https://www.udk-berlin.de';
const sofiaHost='https://www.escuelasuperiordemusicareinasofia.es';
const brucknerHost='https://www.bruckneruni.ac.at';
export const brucknerIndex=brucknerHost+'/de/besuchen/events?tx_gtncachedevents_pilistfilteredlist%5Bfilter%5D%5Barea%5D%5B%5D=112';
export const europeanSources=[
 {id:'udk',name:'Universität der Künste Berlin — Faculty of Music',url:udkHost+'/kalender/',timezone:'Europe/Berlin'},
 {id:'reina-sofia',name:'Escuela Superior de Música Reina Sofía',url:sofiaHost+'/agenda/',timezone:'Europe/Madrid'},
 {id:'bruckner',name:'Anton Bruckner Privatuniversität',url:brucknerIndex,timezone:'Europe/Vienna'}
];
export const europeanHosts=[new URL(udkHost).hostname,new URL(sofiaHost).hostname,new URL(brucknerHost).hostname];
const esMonths=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const cancelled=text=>/cancel(?:led|ed|ado|ada)|aplazad[oa]|abgesagt|entfällt|entfaellt|verschoben|(?:kein|nicht).{0,25}(?:livestream|übertrag)|no se (?:re)?transmit/i.test(text);
const excluded=text=>/\b(?:jazz|pop|rock|konferenz|conference|lecture|vortrag|schauspiel|gottesdienst)\b|Dance Arts|Denkwerkstatt|conferencia/i.test(text);
const restricted=text=>/password|passwort|contraseña|login required|Anmeldung erforderlich|nur für (?:Studierende|Mitglieder)|members.only|pay.per.view|stream.{0,25}(?:kostenpflichtig|ticket required)|retransmisi[oó]n.{0,25}de pago/i.test(text);
function localLink(href,base,path){
 const url=href&&safeUrl(new URL(href,base).href);
 if(!url||new URL(url).origin!==base||!new URL(url).pathname.startsWith(path))throw new Error('European source link changed');
 return url;
}
const unique=events=>[...new Map(events.map(e=>[e.event_url+'|'+e.start,e])).values()];

export function createEuropean({clean,zonedTime,DAY}){
 const inWindow=(start,now)=>Date.parse(start)>=+now-2*DAY&&Date.parse(start)<+now+45*DAY;
 function parseUdk(html,url){
  const $=load(html),area=$('.h-event'),title=clean(area.find('.p-name').text());
  if(!area.length||!title||!area.find('#c-when').length)throw new Error('UdK event layout changed');
  const description=clean(area.find('#c-text').text());
  if(cancelled(title+' '+description)||excluded(title)||restricted(description))return [];
  if(!/Konzert|Konzertexamen|Matinee|Meisterkurs|Wettbewerb|Musiktheater|Vortragsabend/i.test(area.find('h1').first().text()))return [];
  const a=area.find('a[href]').filter((i,a)=>/^(?:zum |watch )?livestream$/i.test(clean($(a).text()))).first();
  const stream=safeUrl(a.attr('href'));if(!stream)return [];
  const host=new URL(stream).hostname;
  if(!(host==='www.udk-berlin.de'&&new URL(stream).pathname.includes('/live-uebertragung-konzerte-und-veranstaltungen/'))&&!['youtube.com','www.youtube.com','youtu.be'].includes(host))return [];
  const dates=area.find('#c-when .date');if(!dates.length)throw new Error('UdK occurrence dates missing');
  return unique(dates.toArray().flatMap(d=>{
   const date=$(d);if(cancelled(date.text()))return [];
   const ymd=date.find('time[datetime]').attr('datetime')?.match(/^(\d{4}-\d{2}-\d{2}) 00:00$/)?.[1];
   const time=clean(date.find('p').first().text()).match(/^(\d{1,2}):(\d{2})\s*Uhr$/);
   if(!ymd||!time)throw new Error('UdK date or clock format changed');
   return [{title,start:zonedTime(`${ymd}T${time[1].padStart(2,'0')}:${time[2]}:00`,'Europe/Berlin'),end:null,program:description,type:/Kammermusik|Trio|Oktett/i.test(description)?'Chamber':'Concert',event_url:url,stream_url:stream,watch_kind:host==='www.udk-berlin.de'?'venue':'channel',watch_note:'Open the school’s concert-room page and follow its YouTube link.',evidence_url:url,evidence:'Official dated musical event explicitly links Zum Livestream; only its published occurrences are included.'}];
  }));
 }
 function udkResults(payload,page){
  const documents=payload?.content?.colPos0?.find(c=>c.type==='solr_pi_results')?.content?.data?.documents;
  if(!documents||!Array.isArray(documents.list?.results)||!Number.isInteger(documents.pagination?.numberOfPages)||documents.pagination.current!==page||documents.list.count!==documents.list.results.length)throw new Error('UdK calendar API changed or pagination is incomplete');
  if(documents.pagination.numberOfPages>6)throw new Error('UdK pagination budget exceeded');
  return documents;
 }
 async function udk(get,now){
  const seen=new Set(),events=[];
  for(const term of ['Livestream','Live-Übertragung']){
   let pages=1;
   for(let page=1;page<=pages;page++){
    const url=new URL(udkHost+'/api/v1/kalender');url.searchParams.set('search[q]',term);if(page>1)url.searchParams.set('search[page]',String(page));
    const d=udkResults(await get(url.href,true),page);pages=d.pagination.numberOfPages;
    for(const item of d.list.results){
     if(!/Konzert|Konzertexamen|Matinee|Meisterkurs|Wettbewerb|Musiktheater|Vortragsabend/i.test(item.subtitle||'')||cancelled(item.title))continue;
     const eventUrl=localLink(item.url,udkHost,'/veranstaltung/');if(seen.has(eventUrl))continue;seen.add(eventUrl);
     if(seen.size>40)throw new Error('UdK event budget exceeded');
     events.push(...parseUdk(await get(eventUrl),eventUrl).filter(e=>inWindow(e.start,now)));
    }
   }
  }
  return unique(events);
 }
 function parseSofia(html,url){
  const $=load(html),title=clean($('h1').first().text()),body=$('.elementor-widget-theme-post-content').first(),schedule=$('.event-schedule-icon-bx');
  if(!title||!body.length||!schedule.length)throw new Error('Reina Sofía event layout changed');
  const text=clean(body.text());if(cancelled(title+' '+text)||excluded(title)||restricted(text))return null;
  // Require the broadcast announcement AND its public YouTube link in the same paragraph.
  // Generic social links, radio broadcasts and ticket buttons do not qualify.
  const announcement=body.find('p').filter((i,p)=>/\b(?:se )?retransmitir[aá] en directo\b/i.test(clean($(p).text()))).first();
  if(!announcement.length)return null;
  const stream=safeUrl(announcement.find('a[href]').filter((i,a)=>/youtube/i.test($(a).text())).first().attr('href'));
  if(!stream||!['www.youtube.com','youtube.com','youtu.be'].includes(new URL(stream).hostname))return null;
  const fields=schedule.find('.elementor-icon-box-title').toArray().map(e=>clean($(e).text()));
  const date=fields.map(s=>s.match(/\b(\d{1,2}) de ([a-z]+) del? (\d{4})\b/i)).find(Boolean),clock=fields.map(s=>s.match(/^(\d{1,2}):(\d{2})$/)).find(Boolean);
  const month=date?esMonths.indexOf(date[2].toLowerCase())+1:0;
  if(!date||!clock||!month)throw new Error('Reina Sofía Spanish date or clock changed');
  const start=zonedTime(`${date[3]}-${String(month).padStart(2,'0')}-${date[1].padStart(2,'0')}T${clock[1].padStart(2,'0')}:${clock[2]}:00`,'Europe/Madrid');
  const direct=/\/watch\?|youtu\.be\/|\/live\//.test(stream);
  return {title,start,end:null,program:clean(($('.sv-programa-evento').html()||'').replace(/<[^>]*>/g,' ')),type:/camera|cámara|cuarteto|trío/i.test(title)?'Chamber':/recital/i.test(title)?'Recital':'Concert',event_url:url,stream_url:stream,watch_kind:direct?'direct':'channel',watch_note:direct?'':'Choose the announced concert on the school’s public YouTube channel.',evidence_url:url,evidence:'Official concert page explicitly announces a live broadcast and links public YouTube viewing; hall tickets are separate.'};
 }
 async function sofia(get,now){
  let next=sofiaHost+'/agenda/';const pages=new Set(),seen=new Set(),events=[];
  while(next){
   if(pages.has(next)||pages.size>=6)throw new Error('Reina Sofía pagination budget exceeded');pages.add(next);
   const $=load(await get(next)),area=$('.evnt-encuentro-filter-items');
   if(!area.length)throw new Error('Reina Sofía agenda layout changed');
   const cards=area.find('.e-loop-item');
   if(!cards.length&&!/no (?:hay|se encontraron)|sin eventos/i.test(area.text()))throw new Error('Reina Sofía agenda is unexpectedly empty');
   for(const card of cards.toArray()){
    const href=$(card).find('.elementor-widget-theme-post-title a').first().attr('href');
    const url=localLink(href,sofiaHost,'/evento/');if(seen.has(url))continue;seen.add(url);if(seen.size>60)throw new Error('Reina Sofía event budget exceeded');
    const event=parseSofia(await get(url),url);if(event&&inWindow(event.start,now))events.push(event);
   }
   const href=$('.evnt-encuentro-paginaiton-block a.next').attr('href');next=href?localLink(href,sofiaHost,'/agenda/'):null;
  }
  return unique(events);
 }
 function parseBruckner(html,url){
  const $=load(html),title=clean($('h1.event-title').text()),body=$('.event-details'),header=$('.event-item-info');
  if(!title||!body.length||!header.length)throw new Error('Bruckner event layout changed');
  const text=clean(body.text());if(cancelled(title+' '+text)||excluded(title)||restricted(text))return null;
  const href=header.find('a.livestream-link').attr('href');if(!href)return null;
  const stream=localLink(href,brucknerHost,'/de/livestream');
  const tags=$('p').filter((i,p)=>/^Themen:/.test(clean($(p).text()))).text();
  if(!/Konzert|Prüfungskonzert|Kammermusik|Orchester|Alte Musik|Vortragsabend/i.test(tags))return null;
  if(/Tanz|Schauspiel|Jazz|Vortrag,|Workshop/i.test(tags))return null;
  const when=clean(body.find('p').filter((i,p)=>/^Wann und Wo:/.test(clean($(p).text()))).text());
  const m=when.match(/^Wann und Wo:\s*(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*-/);
  if(!m)throw new Error('Bruckner DD.MM.YYYY date missing');
  const start=zonedTime(`${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2,'0')}:${m[5]}:00`,'Europe/Vienna');
  const printed=clean(header.find('.event-date-time').text());if(!printed.endsWith(`${m[4]}:${m[5]}`))throw new Error('Bruckner clock disagrees with detail');
  return {title,start,end:null,program:clean(body.find('p').not('.small').first().text()),type:/Prüfungskonzert|Schlussperformance/i.test(title+' '+tags)?'Recital':'Concert',event_url:url,stream_url:stream,watch_kind:'venue',watch_note:'Choose the active player on the school’s free public livestream page.',evidence_url:url,evidence:'Official musical event explicitly provides + Livestream and a link to the public university player.'};
 }
 async function bruckner(get,now){
  const $=load(await get(brucknerIndex)),area=$('.events-full-list');
  if(!area.length)throw new Error('Bruckner livestream calendar changed');
  const cards=area.find('a.event-item');
  if(!cards.length&&!/keine (?:veranstaltungen|events)/i.test($('main').text()))throw new Error('Bruckner calendar is unexpectedly empty');
  // The filtered calendar is currently one complete list. Fail visibly if pagination appears.
  if($('main .pagination a:not(.disabled),main a[rel="next"]').length)throw new Error('Bruckner calendar now requires pagination');
  if(cards.length>40)throw new Error('Bruckner event budget exceeded');
  const seen=new Set(),events=[];
  for(const card of cards.toArray()){
   const item=$(card);if(!/\+\s*Livestream/i.test(item.text())||cancelled(item.text()))continue;
   const url=localLink(item.attr('href'),brucknerHost,'/de/besuchen/events/detail/');if(seen.has(url))continue;seen.add(url);
   const event=parseBruckner(await get(url),url);if(event&&inWindow(event.start,now))events.push(event);
  }
  return unique(events);
 }
 return {adapters:{udk,'reina-sofia':sofia,bruckner},parsers:{parseUdk,udkResults,parseSofia,parseBruckner}};
}
