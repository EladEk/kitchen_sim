// RG1 plan coordinates establish horizontal geometry. Photos establish the
// covered service porch, open kitchen court and two condensers, not their size.
export function createExteriorLayout(point){
 const rect=(minX,minZ,maxX,maxZ)=>({minX,minZ,maxX,maxZ,polygon:[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]]});
 const returnX=point(1184.28,448.24)[0],mouthZ=point(1184.28,561.58)[1],wallFace=point(1078.83,448.24)[0]+.16;
 const porch={id:'service-porch',...rect(wallFace,point(1076.58,445.39)[1]+.05,returnX-.1,mouthZ),ceiling:2.5,slab:.15,doorId:'service-exit',roomId:'laundry'};
 const court={id:'kitchen-window-court',...rect(returnX+.1,point(1184.28,366.04)[1]+.15,point(1277.82,366.04)[0]-.06,mouthZ),roomId:'kitchen',shutterId:'kitchen-window'};
 for(const r of [porch,court]){r.width=r.maxX-r.minX;r.depth=r.maxZ-r.minZ;}
 const units=[
  {id:'ac-large',he:'יחידת מזגן חיצונית גדולה',en:'Large outdoor AC unit',z:point(1104.48,660.94)[1],w:.94,d:.4,h:1.15,bottom:.3,planSymbol:true},
  {id:'ac-small',he:'יחידת מזגן חיצונית קטנה',en:'Small outdoor AC unit',z:point(1104.48,600)[1],w:.8,d:.35,h:.6,bottom:.3,planSymbol:false}
 ].map(a=>{const x=wallFace+.08+a.d/2,body=rect(x-a.d/2,a.z-a.w/2,x+a.d/2+.035,a.z+a.w/2);
  return {...a,x,wallGap:.08,body,front:rect(body.maxX,body.minZ-.2,body.maxX+1.2,body.maxZ+.2)};
 });
 const originLabel=['אופקי לפי התוכנית · גבהים משוערים','Horizontal geometry from plan · heights estimated'];
 const elements=[
  {id:porch.id,he:'מבואת היציאה האחורית — מקורה',en:'Covered rear service porch',roomId:'laundry',dimensions:[porch.width,porch.depth,porch.ceiling],dimensionLabels:[['רוחב פנוי','Clear width'],['עומק המבואה','Porch depth'],['גובה תחתית תקרה משוער','Assumed ceiling underside']],originLabel,doorId:porch.doorId,page:1,
   noteHe:'המבואה שקועה ומקורה, עם קירות חוזרים בחיפוי אבן, ריצוף כהה דמוי עץ ודלת פלדה הנפתחת החוצה, כפי שנראה בצילום. הושלם הקיר הימני עד קו החזית לפי התוכנית. רוחב ועומק מחושבים בקנה מידה נומינלי 1:50; תחתית התקרה 250 ס״מ, עובי התקרה והגמרים להמחשה. צינור הניקוז משמאל מוצג במיקום משוער. זו אינה דלת חוץ נוספת.',
   noteEn:'The photographed recess is covered, with stone-clad return walls, dark wood-look paving and the existing outward-opening steel door. The right return now reaches the plan-derived mouth. Width and depth use nominal 1:50 scale; the 250 cm ceiling underside, slab thickness and finishes are illustrative. The left downpipe position is estimated. No second exterior door is introduced.'},
  {id:court.id,he:'המעבר השקוע אל חלון המטבח',en:'Recessed passage to the kitchen window',roomId:'kitchen',dimensions:[court.width,court.depth],dimensionLabels:[['רוחב בין הקיר לגבול השכן','Width between return and neighbour wall'],['מהפתח החיצוני עד קיר החלון','Mouth to window wall']],originLabel,shutterId:court.shutterId,page:2,
   noteHe:'חלון המטבח נמצא בקצה מעבר חיצוני צר ועמוק: קיר אבן גבוה משמאל וקיר השכן הנמוך מימין. עומק המעבר כ־330 ס״מ; זהו עומק החצר השקועה ולא עומק פרופיל החלון. האזור נשאר פתוח לשמים. מיקום החלון וחלון השירות הצדדי נשמרים; נוסף גמר אבן סביב הפתחים. עומק המסגרת בתוך קיר 30 ס״מ עדיין להמחשה.',
   noteEn:'The kitchen window terminates a deep, narrow outdoor passage, with a tall stone return on the left and the lower neighbour wall on the right. Its approximately 330 cm court depth is distinct from the window-frame reveal. The court remains open to the sky. Existing kitchen and utility window positions are retained, with stone reveals added. Frame placement inside the 30 cm wall remains illustrative.'},
  ...units.map(a=>({id:a.id,he:a.he,en:a.en,roomId:'garden',dimensions:[a.w,a.d,a.h],dimensionLabels:[['רוחב לאורך הקיר','Width along wall'],['בליטה מהקיר — גוף','Body depth away from wall'],['גובה גוף','Body height']],bottom:a.bottom,page:4,
   metrics:[{he:'פער גוף משוער מהקיר',en:'Assumed body-to-wall gap',value:a.wallGap,unit:'m'},{he:'שטח פנוי מוצע מלפנים',en:'Proposed clear area in front',value:1.2,unit:'m'}],
   noteHe:`שתי יחידות נפרדות נראות בצילום, עם המאווררים לכיוון החצר והקיר עם השכן. ${a.planSymbol?'מיקום היחידה הגדולה נסמך על סמל מ.א. בתוכנית ועל הצילום.':'היחידה הקטנה מוצבת קרוב יותר ליציאה, לפי הסדר בצילום; מיקומה המדויק משוער.'} דגם ומידות לא נמסרו. הגוף, גובה ההתקנה, התושבות והצנרת להמחשה. הסימון מלפנים הוא מרווח תכנון מוצע של 120 ס״מ עם 20 ס״מ לצדדים, ולא דרישת יצרן מאומתת. המחסן ברוחב 350 ובעומק 300 ס״מ הוזז אחורה ונמצא מחוץ לסימון; יש לאמת בשטח מול שני הדגמים.`,
   noteEn:`The photo shows two separate units with fans facing the yard and neighbour wall. ${a.planSymbol?'The large unit location follows the plan AC symbol and the photo.':'The smaller unit is closer to the exit, following the photographed order; its exact position is estimated.'} Models and dimensions are unknown. Body, mounting height, brackets and piping are illustrative. The front marking proposes 120 cm with 20 cm at either side for planning, not a verified manufacturer requirement. The 350 cm wide, 300 cm deep shed is moved rearward and lies outside this marking; verify against both actual models on site.`}))
 ].map(e=>({...e,source:'exterior-details',planned:false,dimensionsInferred:true,exteriorView:true}));
 return {porch,court,returnWall:{id:'service-porch-return',worldX:returnX,a:[1184.28,448.24],b:[1184.28,561.58],thickness:.2},units,elements};
}

export const EXTERIOR_SOURCE={id:'exterior-details',kind:'gallery',he:'שקעי החוץ והמזגנים',en:'Exterior recesses & AC units',pages:[1,2,3,4,5],imagePrefix:'/house/exterior/reference-',references:[
 {page:1,file:'01-277901.jpg',he:'מבואת יציאת השירות המקורה',en:'Covered service exit porch',noteHe:'תקרת המבואה, קירות חוזרים, דלת הפלדה, הריצוף וצינור הניקוז נראים בצילום. אין בצילום קנה מידה.',noteEn:'The ceiling, return walls, steel door, paving and downpipe are visible. The photo contains no scale.'},
 {page:2,file:'02-277902.jpg',he:'המעבר העמוק אל חלון המטבח',en:'Deep passage to the kitchen window',noteHe:'הקיר הגבוה משמאל וקיר השכן הנמוך מימין מבהירים את עומק החצר השקועה. אין להסיק ממנו מרחק מדוד.',noteEn:'The high left return and lower neighbour wall establish the recessed court. The photo does not establish a measured distance.'},
 {page:3,file:'03-290216.jpg',he:'הקשר הנסיגות בחזית הבניין',en:'Recesses in the building facade',noteHe:'מבט כללי על נפחי הבניין ונסיגת אגף השירות.',noteEn:'Overall view of building volumes and service-wing setback.'},
 {page:4,file:'02-273513.jpg',he:'שני מנועי המזגן — גדול וקטן',en:'Both outdoor AC units — large and small',noteHe:'שתי יחידות על תושבות מחוץ לקיר, הגדולה קרובה לפינת הממ״ד והקטנה קרובה ליציאה. דגם ומידות אינם מזוהים.',noteEn:'Two bracket-mounted outdoor units: larger near the safe-room corner, smaller nearer the exit. Models and dimensions are unidentified.'},
 {page:5,he:'פרט התוכנית — שקע ויציאת שירות',en:'Plan detail — recess & service exit',noteHe:'חיתוך מתוכנית RG1 המקורית. מידות המודל חושבו בקנה מידה נומינלי; גבהים ופרטי התקנה אינם נמדדים כאן.',noteEn:'Crop of the original RG1 plan. Model spans use nominal scale; heights and installation details are not established here.'}
]};
