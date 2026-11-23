// Keep the atlas legible: a label must fit the viewport and avoid other labels.
export function selectMapLabels(candidates,{width,height},obstacles=[]){
  const occupied=[...obstacles],selected=[];
  const priority={country:0,water:1,state:2,city:3};
  const sorted=[...candidates].sort((a,b)=>priority[a.kind]-priority[b.kind]||a.rank-b.rank||a.name.localeCompare(b.name));
  for(const label of sorted){
    const w=Math.min(220,label.name.length*(label.kind==='country'?7:6)+12),h=22;
    const box={left:label.x-w/2,right:label.x+w/2,top:label.y-h/2,bottom:label.y+h/2};
    if(box.left<6||box.top<6||box.right>width-6||box.bottom>height-6)continue;
    if(occupied.some(b=>box.left<b.right+8&&box.right>b.left-8&&box.top<b.bottom+8&&box.bottom>b.top-8))continue;
    selected.push({...label,width:w});occupied.push(box);
    if(selected.length>=40)break;
  }
  return selected;
}
