export function scheduleHealth(data,now=new Date()){
 const old=+now-Date.parse(data.generated_at)>2*86400000;
 const issues=data.sources.flatMap(source=>{
  const reviewDue=source.status==='review_due'||(source.collection==='browser'&&Date.parse(source.valid_until)<=+now);
  if(source.status!=='error'&&!reviewDue)return [];
  return [{...source,reviewDue,hasOlderListings:!reviewDue&&source.count>0}];
 });
 return {old,issues};
}
