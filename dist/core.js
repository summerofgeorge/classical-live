export const DEFAULT_DURATION = 90 * 60 * 1000;
export const endTime = event => new Date(event.end || new Date(+new Date(event.start) + DEFAULT_DURATION));
export function dayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function periodRange(period,timeZone,now=new Date()) {
  const today=dayKey(now,timeZone),base=new Date(`${today}T12:00:00Z`);
  const shift=days=>{const date=new Date(base);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
  if(period==='today'||period==='tonight')return {first:today,last:today};
  if(period==='tomorrow')return {first:shift(1),last:shift(1)};
  if(period==='week')return {first:today,last:shift(6)};
  if(period==='weekend'){
    const dow=base.getUTCDay(),offset=dow===0?-2:dow===6?-1:5-dow;
    return {first:shift(Math.max(0,offset)),last:shift(offset+2)};
  }
  return {first:today,last:null};
}
export function matches(event, {period='all',source='',type='',query='',region='',country='',size='',timeZone}, now=new Date()) {
  const start = new Date(event.start);
  const today = dayKey(now,timeZone), day = dayKey(start,timeZone);
  // A scheduled end is not a reliable signal that the stream has finished.
  if (day < today && endTime(event) <= now) return false;
  if (event.valid_until && (!Number.isFinite(Date.parse(event.valid_until)) || new Date(event.valid_until) <= now)) return false;
  if (source && event.source !== source || type && event.type !== type) return false;
  if (region && event.region !== region || country && event.country !== country || size && event.size !== size) return false;
  if (query && !`${event.title} ${event.institution} ${event.program}`.toLowerCase().includes(query.toLowerCase())) return false;
  const range=periodRange(period,timeZone,now);
  return !range.last||day>=range.first&&day<=range.last;
}
export function safeUrl(value) {
  try {const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password ? url.href : null;} catch {return null;}
}
const escapeIcs = text => String(text).replace(/\\/g,'\\\\').replace(/\r?\n|\r/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function foldLine(line) {
  let result='', current='', size=0;
  for (const char of line) {
    const bytes=new TextEncoder().encode(char).length;
    if(size+bytes>75) {result+=current+'\r\n'; current=' '; size=1;}
    current+=char;size+=bytes;
  }
  return result+current;
}
export function calendar(events, now=new Date()) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Classical Live//Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for (const event of events) {
    const notes=[event.program,`Watch: ${event.stream_url}`,`Event details: ${event.event_url}`,
      `Times originate in ${event.timezone}.`, event.watch_note,
      !event.end ? 'End time is an estimate (90 minutes); check the source for updates.' : '',
      'This is a saved calendar copy, not a subscription. Check the source for changes.'].filter(Boolean).join('\n\n');
    lines.push('BEGIN:VEVENT',`UID:${escapeIcs(event.id)}@classical-live`,
      `DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(event.start)}`,`DTEND:${stamp(endTime(event))}`,
      `SUMMARY:${escapeIcs(event.title+' — '+event.institution)}`,
      `DESCRIPTION:${escapeIcs(notes)}`,`LOCATION:${escapeIcs(event.stream_url)}`,
      `URL:${event.event_url}`,'STATUS:CONFIRMED','TRANSP:TRANSPARENT','END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n')+'\r\n';
}
