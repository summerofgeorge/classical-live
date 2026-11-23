import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectMapLabels} from '../dist/map-labels.js';

test('political map retains all five Great Lakes and their labels',async()=>{
  const map=JSON.parse(await readFile(new URL('../dist/political-geography.json',import.meta.url)));
  assert.deepEqual(Object.keys(map.objects).sort(),['countries','lakes','states']);
  for(const name of ['Superior','Michigan','Huron','Erie','Ontario']){
    const lake=map.objects.lakes.geometries.find(f=>f.properties.name===name);
    assert.ok(lake?.arcs?.length,`${name} needs lake geometry`);
    assert.ok(map.labels.some(l=>l.kind==='water'&&l.name===`Lake ${name}`&&l.minZoom<=4));
  }
  for(const label of map.labels){
    assert.ok(label.coordinates.every(Number.isFinite));
    assert.ok(Math.abs(label.coordinates[0])<=180 && Math.abs(label.coordinates[1])<=90);
  }
});
test('labels prioritize lakes over nearby places and avoid school markers',()=>{
  const labels=[
    {kind:'city',name:'City',rank:0,x:180,y:100},
    {kind:'water',name:'Lake Erie',rank:0,x:180,y:100},
    {kind:'state',name:'Ohio',rank:0,x:100,y:200},
    {kind:'country',name:'Canada',rank:0,x:200,y:280}
  ];
  assert.deepEqual(selectMapLabels(labels,{width:400,height:320},[{left:80,right:120,top:180,bottom:220}]).map(l=>l.name),['Canada','Lake Erie']);
});
test('labels stay within narrow viewports and cap density',()=>{
  const labels=Array.from({length:100},(_,i)=>({kind:'city',name:`City ${i}`,rank:i,x:60+(i%10)*110,y:30+Math.floor(i/10)*40}));
  assert.equal(selectMapLabels(labels,{width:1200,height:500}).length,40);
  const mobile=selectMapLabels(labels,{width:300,height:360});
  assert.ok(mobile.length>0);
  for(const l of mobile)assert.ok(l.x-l.width/2>=6&&l.x+l.width/2<=294);
});
