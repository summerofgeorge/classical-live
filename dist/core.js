export const DEFAULT_DURATION = 90 * 60 * 1000;
export const endTime = event => new Date(event.end || new Date(+new Date(event.start) + DEFAULT_DURATION));
export function dayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function matches(event, {period='upcoming',source='',type='',query='',region='',country='',size='',timeZone}, now=new Date()) {
  const start = new Date(event.start);
  if (endTime(event) <= now) return false;
  if (event.valid_until && (!Number.isFinite(Date.parse(event.valid_until)) || new Date(event.valid_until) <= now)) return false;
  if (source && event.source !== source || type && event.type !== type) return false;
  if (region && event.region !== region || country && event.country !== country || size && event.size !== size) return false;
  if (query && !`${event.title} ${event.institution} ${event.program}`.toLowerCase().includes(query.toLowerCase())) return false;
  const today = dayKey(now,timeZone), day = dayKey(start,timeZone);
  if (period === 'tonight') return day === today;
  if (period === 'week') {
    const until = new Date(`${today}T12:00:00Z`); until.setUTCDate(until.getUTCDate()+7);
    return day >= today && day < until.toISOString().slice(0,10);
  }
  if (period === 'weekend') {
    const base = new Date(`${today}T12:00:00Z`), dow = base.getUTCDay();
    const offset = dow === 0 ? -2 : dow === 6 ? -1 : 5-dow;
    base.setUTCDate(base.getUTCDate()+offset);
    const first = base.toISOString().slice(0,10);
    base.setUTCDate(base.getUTCDate()+2);
    return day >= first && day <= base.toISOString().slice(0,10);
  }
  return true;
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
      event.verification_method==='browser' ? `Browser-checked ${event.last_verified_at.slice(0,10)}; not automatically rechecked. Confirm the official event page.` : '',
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
