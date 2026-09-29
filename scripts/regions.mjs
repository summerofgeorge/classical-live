import {schoolInfo} from '../dist/schools.js';

// Collection regions for GitHub Actions matrix jobs. Site UX stays one calendar;
// shards merge into dist/events.json. Limits are per-job fuses (not a shared pool),
// so North America volume cannot starve Europe / Asia–Pacific expansion.
export const REGIONS = [
 {id:'nam', label:'North America', requestLimit:600},
 {id:'europe', label:'Europe', requestLimit:400},
 {id:'asia-pacific', label:'Asia–Pacific', requestLimit:300}
];

export function regionIdForSource(source){
 const info=schoolInfo(source.id);
 const region=info.region||'';
 const tz=source.timezone||'';
 if(region==='Europe'||tz.startsWith('Europe/'))return 'europe';
 if(region==='Asia'||region==='Oceania'||tz.startsWith('Asia/')||tz.startsWith('Australia/')||tz.startsWith('Pacific/'))return 'asia-pacific';
 return 'nam';
}

export function regionConfig(id){
 const region=REGIONS.find(r=>r.id===id);
 if(!region)throw new Error(`Unknown collection region: ${id}`);
 return region;
}

export function sourcesForRegion(registry,regionId){
 regionConfig(regionId);
 return registry.filter(source=>regionIdForSource(source)===regionId);
}

export function shardFileName(regionId){
 return `${regionConfig(regionId).id}.json`;
}

export function partitionSourceIds(registry){
 const out=Object.fromEntries(REGIONS.map(r=>[r.id,[]]));
 for(const source of registry)out[regionIdForSource(source)].push(source.id);
 return out;
}
