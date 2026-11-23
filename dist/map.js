import {calendar, safeUrl} from './core.js';
import {filterSchools, schoolSummaries} from './map-data.js';
import {addPoliticalBasemap} from './political-map.js';

const $ = id => document.getElementById(id);
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const filters = {query:'', region:'', scheduled:false};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let data, schools=[], visible=[], selectedId=new URLSearchParams(location.search).get('school'), map, clusters;
const markers = new Map();
const format = (value, options={}, zone=timeZone) => {
  try {return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',...options,timeZone:zone}).format(new Date(value));}
  catch {return 'Time unavailable';}
};
const concertTime = (event, zone=timeZone) => format(event.start,{weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'},zone);
function el(tag, text, className) {
  const node=document.createElement(tag);
  if(text!==undefined && text!==null) node.textContent=text;
  if(className) node.className=className;
  return node;
}
function external(text,url,className) {
  const href=safeUrl(url);
  if(!href) return el('span',text,className);
  const a=el('a',text,className);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function localLink(text,url) {const a=el('a',text);a.href=url;return a;}
function download(event) {
  const url=URL.createObjectURL(new Blob([calendar([event])],{type:'text/calendar;charset=utf-8'}));
  const a=el('a');a.href=url;a.download='classical-watch-concert.ics';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function tooltip(school) {
  const content=el('div');
  content.append(el('strong',school.name),el('p',`${school.city}, ${school.country}`,'tooltip-place'));
  if(school.next){
    content.append(el('p',new Date(school.next.start)<=new Date()?'Scheduled now':concertTime(school.next),'tooltip-date'),el('p',school.next.title));
  }else content.append(el('p','No upcoming concert listed.'));
  content.append(el('p','Select for school facts and concert links.','tooltip-hint'));
  return content;
}
function markerIcon(school) {
  return L.divIcon({className:`school-pin${school.next?' has-concert':''}${school.id===selectedId?' is-selected':''}`,html:'<span aria-hidden="true"></span>',iconSize:[32,32],iconAnchor:[16,16],tooltipAnchor:[0,-12]});
}
function fitSchools() {
  if(!map) return;
  const points=visible.filter(s=>s.location).map(s=>[s.location.lat,s.location.lon]);
  if(points.length) map.fitBounds(points,{padding:[45,45],maxZoom:6,animate:false});
}
function selectSchool(id,{locate=false,focus=false,updateUrl=true}={}) {
  const school=visible.find(s=>s.id===id);if(!school) return;
  selectedId=id;$('school-picker').value=id;renderDetail(school);
  for(const item of visible) if(markers.has(item.id)) {
    markers.get(item.id).closeTooltip();markers.get(item.id).setIcon(markerIcon(item));
  }
  for(const button of $('school-directory').querySelectorAll('button')) button.setAttribute('aria-current',String(button.dataset.school===id));
  if(updateUrl){const url=new URL(location.href);url.searchParams.set('school',id);history.replaceState(null,'',url);}
  const marker=markers.get(id);
  if(locate && marker && clusters){
    // Keep regional context around a city marker instead of jumping to street level.
    map.setView(marker.getLatLng(),7,{animate:false});
    const parent=clusters.getVisibleParent(marker);
    if(parent && parent!==marker)parent.spiderfy();
    marker.openTooltip();
  }
  else if(focus && marker)marker.openTooltip();
  if(focus){
    $('selected-school-name').focus({preventScroll:true});
    if(matchMedia('(max-width:760px)').matches) $('school-detail').scrollIntoView({block:'start',behavior:'instant'});
  }
}
function renderDetail(school) {
  const detail=$('school-detail');detail.replaceChildren();
  const heading=el('h2'),schoolLink=external(school.name,school.url,'school-name-link');
  schoolLink.title='Open the official school concert page in a new tab';heading.append(schoolLink);heading.id='selected-school-name';heading.tabIndex=-1;
  detail.append(heading,el('p',`${school.city || 'Location not listed'}, ${school.country || ''}`,'school-place'));
  const next=el('section',null,'next-concert');
  if(school.next){
    const event=school.next, ongoing=new Date(event.start)<=new Date();
    next.append(el('p',ongoing?'Scheduled now':'Next listed concert','eyebrow'));
    const time=el('time',concertTime(event),'next-date');time.dateTime=event.start;next.append(time);
    if(event.timezone && event.timezone!==timeZone)next.append(el('p',`At the school: ${concertTime(event,event.timezone)}`,'school-local-time'));
    const title=el('h3'),titleLink=external(event.title,event.stream_url,'event-title-link');
    titleLink.title='Open livestream page in a new tab';title.append(titleLink);next.append(title);
    if(event.type)next.append(el('span',event.type,'performance-tag'));
    next.append(external(event.watch_kind==='channel'?'Watch channel':event.watch_kind==='registration'?'Register to watch':'Watch stream',event.stream_url,'watch'));
    const links=el('div',null,'map-event-links'), save=el('button','Add to calendar','calendar-button');
    save.type='button';save.onclick=()=>download(event);
    links.append(external('Event details',event.event_url),save);next.append(links);
    if(event.watch_note)next.append(el('p',event.watch_note,'concert-note'));
  }else next.append(el('p','Next listed concert','eyebrow'),el('p','No upcoming concert listed. Check the school’s official page for its latest schedule.','no-concert'));
  detail.append(next);
  const facts=el('dl',null,'school-facts');
  facts.append(el('dt','In the calendar'),el('dd',`${school.events.length} upcoming concert${school.events.length===1?'':'s'}`));
  if(school.timezone)facts.append(el('dt','School time zone'),el('dd',school.timezone.replaceAll('_',' ')));
  facts.append(el('dt','Music enrollment'));
  const enrollment=el('dd');
  if(school.enrollment){
    const e=school.enrollment;
    enrollment.append(external(`${e.label} students${e.year?' ('+e.year+')':''}`,e.url));
    enrollment.append(el('small',`Published music-school figure, not total university size. Source checked ${e.checked_at}.`));
  }else enrollment.append(el('span','Not listed'));
  facts.append(enrollment);detail.append(facts);
  const links=el('div',null,'school-links');
  links.append(external('Official concert page',school.url),localLink('View school’s concert list',`./?school=${encodeURIComponent(school.id)}#events`));
  detail.append(links);
}
function renderMarkers() {
  if(!map || !clusters)return;
  clusters.clearLayers();markers.clear();
  for(const school of visible){
    if(!school.location)continue;
    const marker=L.marker([school.location.lat,school.location.lon],{icon:markerIcon(school),title:school.name,alt:school.name,riseOnHover:true,keyboard:true,hasConcert:!!school.next});
    marker.bindTooltip(tooltip(school),{className:'school-tooltip',direction:'top',opacity:1});
    marker.on('click',()=>selectSchool(school.id,{focus:true}));
    marker.on('add',()=>{
      const element=marker.getElement();
      element.setAttribute('aria-label',`${school.name}, ${school.city}. ${school.next?'Next concert: '+concertTime(school.next):'No upcoming concert listed'}. Select for details.`);
      element.onkeydown=event=>{
        if(event.key==='Enter'||event.key===' '){
          event.preventDefault();event.stopPropagation();selectSchool(school.id,{focus:true});
        }
      };
    });
    markers.set(school.id,marker);clusters.addLayer(marker);
  }
  map.fire('schoolmarkerschange');
}
function render({fit=false}={}) {
  schools=schoolSummaries(data);visible=filterSchools(schools,filters);
  const scheduled=visible.filter(s=>s.next).length;
  $('map-count').textContent=`${visible.length} school${visible.length===1?'':'s'} · ${scheduled} with upcoming concerts`;
  $('directory-summary').textContent=`Browse ${visible.length} school${visible.length===1?'':'s'} as a list`;
  $('clear-map-filters').hidden=!filters.query&&!filters.region&&!filters.scheduled;
  const picker=$('school-picker');picker.replaceChildren();picker.disabled=!visible.length;
  if(!visible.length){
    picker.append(el('option','No matching schools'));
    $('school-detail').replaceChildren(el('h2','No schools match.'),el('p','Try a different place or clear your filters.','school-placeholder'));
    selectedId=null;
    if(fit){const url=new URL(location.href);url.searchParams.delete('school');history.replaceState(null,'',url);}
  }else{
    for(const school of visible){const option=el('option',school.name);option.value=school.id;picker.append(option);}
    if(!visible.some(s=>s.id===selectedId))selectedId=[...visible].sort((a,b)=>(Date.parse(a.next?.start)||Infinity)-(Date.parse(b.next?.start)||Infinity))[0].id;
  }
  const directory=$('school-directory');directory.replaceChildren();
  for(const school of visible){
    const button=el('button',null,'directory-school');button.type='button';button.dataset.school=school.id;
    button.append(el('strong',school.name),el('small',`${school.city}, ${school.country}`),el('span',school.next?`Next: ${concertTime(school.next)}`:'No upcoming concert listed','directory-next'));
    button.onclick=()=>selectSchool(school.id,{locate:true,focus:true});directory.append(button);
  }
  if(!visible.length)directory.append(el('p','No schools match these filters.'));
  renderMarkers();
  if(selectedId)selectSchool(selectedId,{updateUrl:fit});
  if(fit)fitSchools();
}
async function initializeMap() {
  try{
    if(!window.L?.markerClusterGroup)throw new Error('Map library unavailable');
    map=L.map('school-map',{minZoom:.5,maxZoom:8,zoomSnap:.25,scrollWheelZoom:false,zoomAnimation:!reducedMotion,fadeAnimation:!reducedMotion,markerZoomAnimation:!reducedMotion,maxBounds:[[-65,-200],[85,200]],maxBoundsViscosity:.8}).setView([25,5],2);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
    await addPoliticalBasemap(map);
    L.control.scale({imperial:false,maxWidth:100}).addTo(map);
    clusters=L.markerClusterGroup({maxClusterRadius:35,showCoverageOnHover:false,animate:false,spiderfyOnMaxZoom:true,spiderfyDistanceMultiplier:1.6,spiderLegPolylineOptions:{color:'#777b79',weight:1.5,opacity:.7},iconCreateFunction:cluster=>{
      const count=cluster.getChildCount(),hasConcert=cluster.getAllChildMarkers().some(m=>m.options.hasConcert);
      return L.divIcon({className:`school-cluster${hasConcert?' has-concert':''}`,html:`<span aria-label="${count} schools. Select to zoom in or separate markers.">${count}</span>`,iconSize:[38,38]});
    }}).addTo(map);
    clusters.on('clustermouseover',event=>event.layer.bindTooltip(`${event.layer.getChildCount()} schools. Select to explore.`,{direction:'top'}).openTooltip());
    clusters.on('clustermouseout',event=>event.layer.closeTooltip());
    clusters.on('spiderfied unspiderfied',()=>map.fire('schoolmarkerschange'));
    $('map-message').hidden=true;$('reset-map-view').disabled=false;
    renderMarkers();
    if(new URLSearchParams(location.search).get('school')===selectedId)selectSchool(selectedId,{locate:true,updateUrl:false});
    else fitSchools();
  }catch(error){
    if(map){map.remove();map=null;clusters=null;}
    $('map-message').textContent='The map could not load. You can still choose a school or browse the list below.';
  }
}
async function load() {
  $('load-error').hidden=true;$('map-content').setAttribute('aria-busy','true');
  try{
    const response=await fetch('./events.json',{cache:'no-cache'});if(!response.ok)throw new Error('Calendar unavailable');
    const calendar=await response.json();
    if(calendar.schema_version!==1||!Array.isArray(calendar.sources)||!Array.isArray(calendar.events))throw new Error('Invalid calendar');
    data=calendar;
    $('updated').textContent=`Checked ${format(data.generated_at,{hour:'numeric',minute:'2-digit'})}`;
    render();if(!map)await initializeMap();
    if(location.hash==='#school-detail' && selectedId){
      $('selected-school-name').scrollIntoView({block:'start'});$('selected-school-name').focus({preventScroll:true});
    }
  }catch(error){
    $('updated').textContent='Calendar unavailable';$('map-count').textContent='Schools could not be loaded';
    const notice=$('load-error'),retry=el('button','Try again','calendar-button');retry.type='button';retry.onclick=load;
    notice.replaceChildren(el('span','The calendar could not load. Please try again.'),retry);notice.hidden=false;
    $('map-message').textContent='Waiting for the school calendar.';
  }finally{$('map-content').setAttribute('aria-busy','false');}
}
$('timezone').textContent=timeZone.replaceAll('_',' ');
$('map-query').addEventListener('input',()=>{filters.query=$('map-query').value;if(data)render({fit:true});});
$('map-region').addEventListener('change',()=>{filters.region=$('map-region').value;if(data)render({fit:true});});
$('scheduled-only').addEventListener('change',()=>{filters.scheduled=$('scheduled-only').checked;if(data)render({fit:true});});
$('clear-map-filters').onclick=()=>{
  filters.query='';filters.region='';filters.scheduled=false;
  $('map-query').value='';$('map-region').value='';$('scheduled-only').checked=false;
  if(data)render({fit:true});$('map-query').focus();
};
$('reset-map-view').onclick=fitSchools;
$('school-picker').addEventListener('change',()=>selectSchool($('school-picker').value,{locate:true,focus:true}));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')map?.eachLayer(layer=>layer.closeTooltip?.());
});
await load();
setInterval(()=>{
  // Keep active controls stable while someone is reading or using the map.
  if(data && !$('map-content').contains(document.activeElement) && !$('school-directory').contains(document.activeElement))render();
},60000);
