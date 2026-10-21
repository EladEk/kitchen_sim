// Common entrance alcove outside apartment 4. The plan fixes the entry side;
// photos/video fix the cabinet order and visible equipment, not dimensions.
export function createEntranceServices(point){
 const [wallX,startZ]=point(1141.74,42.28),rearZ=point(1141.74,159.1)[1]-.18,frontZ=rearZ-.56;
 const cabinet=(id,offset,w,he,en,page,contents)=>{
  const x=wallX+offset+w/2,h=2.3,bottom=.09;
  return {id,he,en,x,z:frontZ,w,d:.56,h,bottom,dimensions:[w,.56,h],roomId:'living',source:'entry-services',page,entryService:true,exteriorView:true,dimensionsInferred:true,positionInferred:true,contents,
   parts:['left','right'].map((key,i)=>({id:`${id}:${key}`,key,he:`דלת ${i?'ימין':'שמאל'}`,en:`${i?'Right':'Left'} door`})),
   noteHe:'ארון שירות ברכוש המשותף, מחוץ לדירה ומשמאל לדלת 4 כשפונים אליה. התכולה הנראית מבוססת על צילום המקור; רוחב, עומק, גובה ומיקום הציוד המדויק משוערים. פריטים שלא נראו אינם מוצגים כציוד מאומת.',
   noteEn:'Common-property service cabinet outside the apartment, left of door 4 when facing it. Visible contents follow the source photo; width, depth, height and exact equipment coordinates are estimates. Unseen equipment is not claimed as verified.'};
 };
 const cabinets=[
  cabinet('entry-pipes',.28,.84,'ארון צנרת — ליד דלת 4','Pipe shaft — beside door 4',1,[
   {id:'blue-riser',he:'צינור כחול אנכי עם פתח ביקורת סגור',en:'Vertical blue pipe with capped inspection fitting',kind:'blue-riser',observed:true},
   {id:'grey-riser',he:'צינור אפור אנכי עם פתח ביקורת סגור',en:'Vertical grey pipe with capped inspection fitting',kind:'grey-riser',observed:true},
   {id:'pipe-clamps',he:'חבקי מתכת לקיבוע הצינורות',en:'Metal pipe support clamps',kind:'clamps',observed:true}
  ]),
  cabinet('entry-hot-water',1.18,1.05,'ארון מיכל מים חמים — סימון 4','Hot-water tank cabinet — marked 4',2,[
   {id:'hot-water-tank',he:'מיכל לבן אנכי עם סימון 4; הדגם והנפח לא קריאים',en:'White vertical tank marked 4; model and capacity unreadable',kind:'tank',observed:true},
   {id:'insulated-pipe',he:'צנרת שחורה מבודדת לצד המיכל',en:'Black insulated pipe beside tank',kind:'insulated-pipe',observed:true},
   {id:'tank-connections',he:'חיבורי צנרת בתחתית; סוגי האביזרים לא אומתו',en:'Lower pipe connections; fitting types unverified',kind:'connections',observed:true}
  ]),
  // Keep the saved cabinet/leaf IDs from R40; the newly supplied photo now
  // identifies the contents of the previously unseen last bay.
  cabinet('entry-unseen',2.29,1.05,'ארון מים אחרון — מונים 4 ו־3','Last water cabinet — meters 4 and 3',4,[
   {id:'water-meter-4',he:'מונה עליון מסומן 4 — מכסה כחול סגור',en:'Upper meter marked 4 — blue cover closed',kind:'water-meter',apartment:4,observed:true},
   {id:'water-meter-3',he:'מונה תחתון מסומן 3 — מכסה כחול פתוח',en:'Lower meter marked 3 — blue cover open',kind:'water-meter',apartment:3,observed:true},
   {id:'meter-valves',he:'ידיות ברז משני צדי כל מונה',en:'Valve handles on both sides of each meter',kind:'valves',observed:true},
   {id:'meter-pipework',he:'צנרת אנכית משמאל וחיבורי צנרת אופקיים ויורדים',en:'Left vertical pipes with horizontal and downward connections',kind:'pipework',observed:true},
   {id:'cabinet-drain',he:'פתח ניקוז עגול ברצפת הארון',en:'Round drain in the cabinet floor',kind:'drain',observed:true}
  ])
 ];
 // Relative order and cover states are photographed; metric positions are
 // illustrative within the unchanged estimated cabinet envelope.
 cabinets[2].meters=[{apartment:4,x:.02,y:.83,z:.32,capOpen:false},{apartment:3,x:.02,y:.53,z:.32,capOpen:true}];
 cabinets[2].drain={x:.12,z:.16,radius:.055};
 // A context strip, not an extension of the apartment/private garden outline.
 const context={minX:wallX+.15,maxX:wallX+3.48,minZ:startZ-.02,maxZ:rearZ+.09};
 context.polygon=[[context.minX,context.minZ],[context.maxX,context.minZ],[context.maxX,context.maxZ],[context.minX,context.maxZ]];
 return {cabinets,parts:cabinets.flatMap(c=>c.parts),context,ceiling:2.55,frontZ,rearZ};
}
export const entryCabinetForPart=(layout,id)=>layout.cabinets.find(c=>c.parts.some(p=>p.id===id));
export function entryDoorBlocked(layout,id,position,radius=.17){
 const c=entryCabinetForPart(layout,id);if(!c||!position)return false;
 const x=Array.isArray(position)?position[0]:position.x,z=Array.isArray(position)?position[1]:position.z;
 // Reserve the complete leaf sweep when closing near a person.
 return x>c.x-c.w/2-radius&&x<c.x+c.w/2+radius&&z>c.z-c.w/2-radius&&z<c.z+radius;
}
export function entranceCollisionBoxes(layout,openParts=[]){
 const boxes=[],opened=new Set(openParts);
 for(const c of layout.cabinets){
  boxes.push({minX:c.x-c.w/2,maxX:c.x+c.w/2,minZ:c.z,maxZ:c.z+c.d,entryCabinetId:c.id});
  for(const [i,p] of c.parts.entries())if(opened.has(p.id)){
   // Doors are hinged out toward the common corridor, perpendicular at 90°.
   const x=c.x+(i?1:-1)*c.w/2;boxes.push({minX:x-.022,maxX:x+.022,minZ:c.z-c.w/2,maxZ:c.z,entryPartId:p.id});
  }
 }
 return boxes;
}
export const ENTRY_SOURCE={id:'entry-services',kind:'gallery',he:'כניסה — ארונות השירות',en:'Entrance — service cabinets',pages:[1,2,3,4,10],video:'/house/entry-services/298240.mp4',videoPage:10,videoLabelHe:'סרטון הכניסה · 5.6 שנ׳',videoLabelEn:'Entrance video · 5.6s',videoNoteHe:'הסרטון המקורי מציג את רצף הארונות הסגורים ביחס לדלת דירה 4. תוכן התאים הפתוחים מתועד בצילומים הנפרדים.',videoNoteEn:'The original video shows the closed cabinet sequence relative to apartment door 4. Open-bay contents are documented in the separate photos.',references:[
 {page:1,file:'298243.jpg',image:'/house/entry-services/298243.jpg',he:'תא הצנרת ליד דלת 4 — פתוח',en:'Open pipe shaft beside door 4',noteHe:'שני צינורות אנכיים, כחול ואפור, פתחי ביקורת סגורים וחבקי מתכת. אין אימות לסוג המערכת, קוטר או חיבור נסתר.',noteEn:'Blue and grey vertical pipes, capped inspection fittings and metal clamps. System function, diameter and concealed routing are not verified.'},
 {page:2,file:'298242.jpg',image:'/house/entry-services/298242.jpg',he:'מיכל מים חמים וצנרת — פתוח',en:'Open hot-water tank and pipework',noteHe:'מיכל לבן עם סימון 4, צינור שחור מבודד וחיבורים בתחתית. ראש המיכל וחלק מהחיבורים מחוץ לפריים; הדגם והנפח אינם קריאים. לא הומצאו מונה, מסנן, אל־חזור או ברזים מוסתרים.',noteEn:'White tank marked 4, black insulated pipe and lower connections. Tank top and some connections are outside the frame; model/capacity unreadable. No hidden meter, filter, non-return valve or valves are invented.'},
 {page:3,file:'298241.jpg',image:'/house/entry-services/298241.jpg',he:'רצף הדלתות ליד כניסת הדירה',en:'Cabinet door sequence beside apartment entrance',noteHe:'זוג דלתות סמוך לכניסה ובנק רחב יותר של ארבע כנפיים. כל המידות במודל משוערות. תכולת הארון האחרון מוצגת בצילום הנפרד של המונים.',noteEn:'A pair nearest the entrance and a wider bank of four leaves. All model dimensions are estimates. The last cabinet interior is shown in the separate meter photo.'},
 {page:4,file:'298252.jpg',image:'/house/entry-services/298252.jpg',he:'ארון המים האחרון — מונים מסומנים 4 ו־3',en:'Last water cabinet — meters marked 4 and 3',noteHe:'לפי הצילום והשיוך שלך לארון האחרון: מונה עליון עם תג 4 ומכסה כחול סגור, מונה תחתון עם תג 3 ומכסה פתוח, ידיות ברזים, צנרת ופתח ניקוז ברצפה. הקריאות, הדגמים, הקטרים והמידות אינם קריאים או מדודים; חיבורים מוסתרים אינם מוצגים כמאומתים.',noteEn:'From the photo and your assignment to the last cabinet: upper meter tagged 4 with closed blue cover, lower meter tagged 3 with open cover, valve handles, pipework and a floor drain. Readings, models, diameters and dimensions are unreadable or unmeasured; hidden connections are not asserted as verified.'}
]};
