import {endTime, matches, safeUrl} from './core.js';
import {schoolInfo} from './schools.js';
import {locations} from './school-locations.js';

export function mapRegion(school) {
  if (school.country === 'United States' || school.country === 'Canada') return 'North America';
  if (school.region === 'Europe') return 'Europe';
  if (school.region === 'Asia' || school.region === 'Oceania') return 'Asia-Pacific';
  return school.region || 'Other';
}

// Use the calendar's verification/expiry rules, but never call an ended concert "next".
export function schoolSummaries(data, now = new Date()) {
  const upcoming = new Map();
  for (const event of data.events) {
    if (!event.id || !event.title || !Number.isFinite(Date.parse(event.start)) ||
        !safeUrl(event.stream_url) || !safeUrl(event.event_url) ||
        !(endTime(event) > now) || !matches(event, {timeZone:'UTC'}, now)) continue;
    if (!upcoming.has(event.source)) upcoming.set(event.source, []);
    upcoming.get(event.source).push(event);
  }
  return data.sources.map(source => {
    const school = schoolInfo(source.id);
    const events = (upcoming.get(source.id) || []).sort((a,b) => Date.parse(a.start)-Date.parse(b.start) || a.id.localeCompare(b.id));
    return {...school, ...source, location:locations[source.id], mapRegion:mapRegion(school), events, next:events[0] || null};
  }).sort((a,b) => a.name.localeCompare(b.name));
}

const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterSchools(schools, {query='', region='', scheduled=false} = {}) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return schools.filter(school => (!region || school.mapRegion === region) && (!scheduled || school.next) &&
    words.every(word => normalize(`${school.name} ${school.city} ${school.country}`).includes(word)));
}
