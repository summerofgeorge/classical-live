// Usage: node docs/build-school-geography.mjs DATA_DIRECTORY TOPOJSON_SERVER_JS
// Inputs and versions are documented in docs/school-map.md. No live requests.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
const [directory,serverPath]=process.argv.slice(2);
if(!directory||!serverPath)throw Error('Supply the Natural Earth GeoJSON directory and topojson-server dist JS path.');
const {topology}=await import(pathToFileURL(resolve(serverPath)));
const read=async name=>JSON.parse(await readFile(resolve(directory,`ne_50m_${name}.json`),'utf8'));
const [countries,states,provinces,lakes,places]=await Promise.all(['admin_0_countries','admin_1_states_provinces_lines','admin_1_states_provinces','lakes','populated_places'].map(read));
const feature=(f,name)=>({type:'Feature',properties:{name},geometry:f.geometry});
const collection=features=>({type:'FeatureCollection',features});
const shapes={
  countries:collection(countries.features.filter(f=>f.properties.ADMIN!=='Antarctica').map(f=>feature(f,f.properties.NAME_EN||f.properties.NAME))),
  states:collection(states.features.map(f=>feature(f,f.properties.ADM0_NAME))),
  lakes:collection(lakes.features.map(f=>feature(f,f.properties.name_en||f.properties.name)))
};
const area=ring=>Math.abs(ring.reduce((n,p,i)=>{const q=ring[(i+1)%ring.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2);
const inRing=(point,ring)=>{
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>point[1])!==(b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
};
function lakeLabel(geometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const rings=[...polygons].sort((a,b)=>area(b[0])-area(a[0]))[0],ring=rings[0];
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const center=[(minX+maxX)/2,(minY+maxY)/2];
  const inside=p=>inRing(p,ring)&&!rings.slice(1).some(h=>inRing(p,h));
  if(inside(center))return {coordinates:center,area:area(ring)};
  const candidates=[];
  for(let x=1;x<20;x++)for(let y=1;y<20;y++){
    const p=[minX+(maxX-minX)*x/20,minY+(maxY-minY)*y/20];if(inside(p))candidates.push(p);
  }
  candidates.sort((a,b)=>(a[0]-center[0])**2+(a[1]-center[1])**2-(b[0]-center[0])**2-(b[1]-center[1])**2);
  return {coordinates:candidates[0]||ring[0],area:area(ring)};
}
const labels=[];
const label=(kind,name,coordinates,minZoom,rank)=>{
  if(name && coordinates.every(Number.isFinite))labels.push({kind,name,coordinates:coordinates.map(n=>+n.toFixed(4)),minZoom,rank});
};
for(const f of countries.features){const p=f.properties;if(p.ADMIN!=='Antarctica')label('country',p.NAME_EN||p.NAME,[p.LABEL_X,p.LABEL_Y],Math.max(2,p.MIN_LABEL||2),p.LABELRANK);}
for(const f of provinces.features){const p=f.properties;label('state',p.name_en||p.name,[p.longitude,p.latitude],Math.max(4,p.min_label||4),p.labelrank);}
for(const f of lakes.features){
  const point=lakeLabel(f.geometry),p=f.properties;
  const name=p.name_en||p.name,displayName=['Superior','Michigan','Huron','Erie','Ontario'].includes(name)?`Lake ${name}`:name;
  if(point.area>.25)label('water',displayName,point.coordinates,Math.max(3.5,p.min_label||4),-point.area);
}
for(const f of places.features){const p=f.properties;label('city',p.NAME_EN||p.NAME,f.geometry.coordinates,Math.max(5,p.MIN_ZOOM||5),-p.POP_MAX);}
const output={...topology(shapes,100000),labels};
const json=JSON.stringify(output)+'\n';
await writeFile(new URL('../dist/political-geography.json',import.meta.url),json);
console.log(JSON.stringify({bytes:Buffer.byteLength(json),gzipBytes:gzipSync(json).length,labels:labels.length,objects:Object.fromEntries(Object.entries(shapes).map(([k,v])=>[k,v.features.length]))}));
