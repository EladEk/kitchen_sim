// Plan coordinates are PDF points on the owner's original 1:50 RG1 plan.
// New work follows the owner's terrace-width-only instruction. Vertical sizes,
// supports and finish colors are visualization assumptions, not shop drawings.
export function createGardenLayout(point){
 const rectangle=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(p=>point(...p));
 const extent=poly=>({minX:poly[0][0],maxX:poly[1][0],minZ:poly[0][1],maxZ:poly[2][1]});
 const paving=rectangle(273.84,42.88,475.62,289.48),finished=rectangle(273.84,42.88,662.7,289.48),pergola=rectangle(273.84,42.88,498.3,289.48),balcony=rectangle(498.3,37.2,671.22,456.7);
 const b=extent(pergola),p=extent(paving),f=extent(finished),upper=extent(balcony),width=b.maxZ-b.minZ,depth=b.maxX-b.minX;
 const posts=[b.minX+.12,b.maxX-.12].flatMap((x,row)=>[b.minZ+.12,b.maxZ-.12].map((z,i)=>({id:`pergola-post-${row}-${i}`,x,z,size:.08,height:2.85})));
 const plot=extent(rectangle(273.84,42.28,1277.82,1032.94)),northEnd=point(662.7,42.28)[0];
 // The rectangular plot bounds include the public entrance notch. The neighbour
 // wall stops at its south edge (the kitchen return), not the plot's north edge.
 const entryReturn=point(1277.82,159.1);
 const fenceRuns=[
  {id:'fence-west',he:'גדר מערבית',en:'West fence',a:[plot.minX,plot.minZ],b:[plot.minX,plot.maxZ]},
  {id:'fence-south',he:'גדר דרומית',en:'South fence',a:[plot.minX,plot.maxZ],b:[plot.maxX,plot.maxZ]},
  {id:'fence-east',he:'הקיר עם השכן',en:'Neighbour boundary wall',style:'shared-wall',a:[plot.maxX,plot.maxZ],b:entryReturn},
  {id:'fence-north',he:'גדר לצד היציאה',en:'Fence beside the terrace',a:[plot.minX,plot.minZ],b:[northEnd,plot.minZ]}
 ].map(run=>({...run,length:Math.hypot(run.b[0]-run.a[0],run.b[1]-run.a[1])}));
 const fence={height:1.5,curb:.3,panel:1.2,slat:.11,gap:.01,post:.06,maxSpacing:.8,color:'#696d6d',runs:fenceRuns};
 const elements=[
  {id:'garden-pergola',he:'פרגולה — בהמשך הריצוף בלבד',en:'Pergola — terrace width only',dimensions:[width,depth,3],bottom:2.85,area:width*depth,source:'garden-design',page:7,
   noteHe:'כ־4.35×3.96 מ׳, מקצה המרפסת שמעל עד לגדר. שלבי הצללה 11 ס״מ בגוון קרם לפי הדוגמה. הגובה, ארבעת העמודים וחלוקת הקורות להמחשה; נדרש תכנון התקנה לפי מדידה בשטח. זו התאמת רוחב להצעת 5×4 מ׳, ולא העתקת כמויותיה.',
   noteEn:'About 4.35×3.96 m, from the upstairs balcony edge to the fence. Cream 11 cm shade profiles follow your example. Height, four posts and beam layout are illustrative; installation needs a measured design. This adapts the 5×4 m example rather than copying its quantities.'},
  {id:'garden-paving',he:'המשך הריצוף עד הגדר',en:'Paving extension to the fence',dimensions:[width,p.maxX-p.minX],area:width*(p.maxX-p.minX),
   metrics:[{he:'עומק הריצוף הכולל',en:'Total paved depth',value:f.maxX-f.minX,unit:'m'},{he:'שטח מרוצף כולל',en:'Total paved area',value:width*(f.maxX-f.minX),unit:'m²'}],source:'plan',page:1,
   noteHe:'תוספת של כ־15.5 מ״ר באותו רוחב ובאותו מפלס של המרפסת הקיימת. אריחי 15×60 ס״מ מההזמנה ממשיכים באותה רשת. השטח הכולל לאחר ההרחבה כ־29.8 מ״ר. המידות נגזרו מהתוכנית; מפלסים, תשתית ושיפועים אינם מדודים.',
   noteEn:'About 15.5 m² added at the existing terrace width and level. Ordered 15×60 cm tiles continue on the same grid. Total finished area is about 29.8 m². Plan-derived dimensions are approximate; levels, substrate and slopes are unmeasured.'},
  {id:'upper-balcony',he:'המרפסת הקיימת שמעל',en:'Existing upstairs balcony',dimensions:[upper.maxZ-upper.minZ,upper.maxX-upper.minX,.2],bottom:2.75,source:'garden-design',page:4,
   noteHe:'קו השפה לפי קו הקומה שמעל בתוכנית; צורת המעקה והחזית לפי תמונות החוץ. גובה התחתית, עובי התקרה ופרטי המעקה משוערים. הפרגולה החדשה מכסה רק את רוחב הריצוף הקיים.',
   noteEn:'The front edge follows the plan’s upper-floor line; fascia and railing follow exterior photos. Soffit height, slab thickness and railing details are assumed. The new pergola covers only the existing terrace width.'},
  ...fenceRuns.map(run=>run.style==='shared-wall'?{id:run.id,he:run.he,en:run.en,dimensions:[run.length,.12,fence.height],dimensionLabels:[['אורך המקטע','Run length'],['עובי משוער','Assumed thickness'],['גובה משוער','Assumed height']],planned:false,source:'service-yard',page:3,originLabel:['קיר קיים לפי הצילום · מידות משוערות','Photo-observed wall · assumed dimensions'],
   noteHe:'קיר ההפרדה עם השכן מופיע בתמונת חצר השירות: טיח בהיר וקופינג אבן. הוא מסתיים בקו החזרת קיר המטבח, מחוץ למבואת הכניסה המשותפת, והמחסן המוצע עומד לאורכו. הגובה המוצג 150 ס״מ ועובי 12 ס״מ הם הנחות תצוגה; התמונות אינן מדידה של הקיר.',
   noteEn:'The service-yard photo shows a pale rendered neighbour boundary with stone coping. It stops at the kitchen wall return, outside the common entrance alcove, and the proposed shed runs alongside it. Displayed 150 cm height and 12 cm thickness are assumptions; the photographs do not measure the wall.'}:({id:run.id,he:run.he,en:run.en,dimensions:[run.length,.06,fence.height],dimensionLabels:[['אורך המקטע','Run length'],['עובי משוער','Assumed thickness'],['גובה כולל','Overall height']],
   metrics:[{he:'שלבי הגדר מעל הבסיס',en:'Panel above base',value:fence.panel,unit:'m'},{he:'בסיס אבן משוער',en:'Assumed stone base',value:fence.curb,unit:'m'}],source:'garden-design',page:5,
   noteHe:'גובה כולל 150 ס״מ מהריצוף: פנל 120 ס״מ מעל בסיס אבן משוער של 30 ס״מ. שלבי מודולינה אופקיים ברוחב 11 ס״מ, אפור 1200 מגורען לפי הדוגמה. תוואי הגדר הקיים נשמר; אורך 37 מ׳ בהצעה אינו מדידה מאומתת של כל ההיקף.',
   noteEn:'Overall 150 cm above paving: a 120 cm panel on an assumed 30 cm stone base. Horizontal 11 cm Modolina profiles, textured grey 1200 per your example. Existing boundary runs are retained; the quote’s 37 m is not a verified full-perimeter measurement.'}))
 ].map(e=>({...e,roomId:'terrace',planned:e.planned??(e.id!=='upper-balcony'),dimensionsInferred:true}));
 return {paving,finished,pergola,balcony,bounds:b,upper,posts,fence,width,depth,pavingArea:width*(p.maxX-p.minX),pergolaArea:width*depth,elements};
}
