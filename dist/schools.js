// Institution-published collegiate music enrollment, checked September 25, 2026.
// Approximate figures are for discovery, not rankings or total university size.
const enrollment=(students,label,url,year=null)=>({students,label,url,year,checked_at:'2026-09-25'});
const us=(region,city,count=null)=>({region:`US ${region}`,country:'United States',city,enrollment:count});
export const schools={
 curtis:us('Northeast','Philadelphia, Pennsylvania',enrollment(160,'about 160','https://www.curtis.edu/apply/why-curtis/')),
 cim:us('Midwest','Cleveland, Ohio',enrollment(350,'up to 350','https://www.cim.edu/aboutcim')),
 eastman:us('Northeast','Rochester, New York',enrollment(900,'about 900','https://www.esm.rochester.edu/about/history/')),
 colburn:us('West','Los Angeles, California'),
 msm:us('Northeast','New York, New York',enrollment(1000,'more than 1,000','https://www.msmnyc.edu/about/leadership/presidents-letter/')),
 northwestern:us('Midwest','Evanston, Illinois',enrollment(600,'more than 600','https://www.music.northwestern.edu/about/history')),
 rice:us('South','Houston, Texas',enrollment(285,'about 285','https://music.rice.edu/admissions/undergraduate/undergraduate-frequently-asked-questions')),
 sfcm:us('West','San Francisco, California',enrollment(450,'about 450','https://www.sfcm.edu/study/apply/international-students')),
 lawrence:us('Midwest','Appleton, Wisconsin'),
 boston:us('Northeast','Boston, Massachusetts'),
 oberlin:us('Midwest','Oberlin, Ohio'),
 juilliard:us('Northeast','New York, New York'),
 peabody:us('South','Baltimore, Maryland'),
 indiana:us('Midwest','Bloomington, Indiana',enrollment(1600,'more than 1,600','https://music.indiana.edu/about/index.html')),
 michigan:us('Midwest','Ann Arbor, Michigan'),
 'ohio-state':us('Midwest','Columbus, Ohio'),
 ohio:us('Midwest','Athens, Ohio'),
 unt:us('South','Denton, Texas',enrollment(1500,'more than 1,500','https://music.unt.edu/community/index.html')),
 weimar:{region:'Europe',country:'Germany',city:'Weimar'},
 rcm:{region:'Europe',country:'United Kingdom',city:'London',enrollment:enrollment(900,'about 900','https://www.rcm.ac.uk/media/ImpactReport2025.pdf',2025)},
 western:{region:'Canada',country:'Canada',city:'London, Ontario'}
};
export function schoolSize(school){
 const n=school?.enrollment?.students;
 return !Number.isFinite(n)?'unknown':n<500?'small':n<1000?'medium':'large';
}
export function schoolInfo(id){const school=schools[id]||{};return {...school,size:schoolSize(school)};}
