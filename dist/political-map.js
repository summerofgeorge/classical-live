import {selectMapLabels} from './map-labels.js';

export async function addPoliticalBasemap(map){
  const response=await fetch('./political-geography.json');
  if(!response.ok)throw Error('Political map unavailable');
  const geography=await response.json();
  if(geography.type!=='Topology'||!window.topojson?.feature||!Array.isArray(geography.labels))throw Error('Invalid political map');
  const shapes=map.createPane('political-shapes');shapes.style.zIndex=200;
  shapes.style.pointerEvents='none';shapes.setAttribute('aria-hidden','true');
  const labelsPane=map.createPane('political-labels');labelsPane.style.zIndex=450;
  labelsPane.style.pointerEvents='none';labelsPane.setAttribute('aria-hidden','true');
  const layer=(name,style)=>L.geoJSON(topojson.feature(geography,geography.objects[name]),{pane:'political-shapes',interactive:false,smoothFactor:.5,style});
  layer('countries',{fillColor:'#ffffff',fillOpacity:1,color:'#aeb7b2',weight:1}).addTo(map);
  const states=layer('states',{color:'#c5cdc8',weight:.8,fill:false});
  const lakes=layer('lakes',{fillColor:'#e7eae9',fillOpacity:1,color:'#bdc6c1',weight:.65}).addTo(map);
  const labelLayer=L.layerGroup().addTo(map);
  function renderLabels(){
    const zoom=map.getZoom();
    if(zoom>=3.5 && !map.hasLayer(states)){states.addTo(map);lakes.bringToFront();}
    else if(zoom<3.5 && map.hasLayer(states))map.removeLayer(states);
    const bounds=map.getBounds(),size=map.getSize();
    const candidates=geography.labels.filter(label=>zoom>=label.minZoom&&bounds.contains([label.coordinates[1],label.coordinates[0]])).map(label=>{
      const point=map.latLngToContainerPoint([label.coordinates[1],label.coordinates[0]]);
      return {...label,x:point.x,y:point.y};
    });
    // Leave breathing room around school markers and numbered groups.
    const rect=map.getContainer().getBoundingClientRect();
    const obstacles=[...map.getContainer().querySelectorAll('.school-pin,.school-cluster')].map(node=>{
      const r=node.getBoundingClientRect();return {left:r.left-rect.left,right:r.right-rect.left,top:r.top-rect.top,bottom:r.bottom-rect.top};
    });
    labelLayer.clearLayers();
    for(const label of selectMapLabels(candidates,{width:size.x,height:size.y},obstacles)){
      const text=document.createElement('span');text.textContent=label.name;
      const icon=L.divIcon({className:`atlas-label atlas-${label.kind}`,html:text,iconSize:[label.width,22],iconAnchor:[label.width/2,11]});
      L.marker([label.coordinates[1],label.coordinates[0]],{icon,pane:'political-labels',interactive:false,keyboard:false}).addTo(labelLayer);
    }
  }
  // The school layer updates first; label placement then uses its actual positions.
  let frame;
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(renderLabels);};
  map.on('zoomend moveend resize schoolmarkerschange',update);
  map.on('unload',()=>cancelAnimationFrame(frame));update();
  map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a>');
}
