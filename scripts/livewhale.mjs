import {dayKey} from '../dist/core.js';
const DAY=86400000;

// LiveWhale's default feed hides events once they start. Request recent dates
// explicitly so an evening refresh still includes today's concerts. The shared
// collector and browser apply the exact retention and viewer-local date limits.
// https://support.livewhale.com/live/blurbs/api
export function liveWhaleWindow(feed,now,timeZone){
 const first=dayKey(new Date(+now-2*DAY),timeZone);
 const last=dayKey(new Date(+now+46*DAY),timeZone);
 return `${feed}/start_date/${first}/end_date/${last}`;
}
