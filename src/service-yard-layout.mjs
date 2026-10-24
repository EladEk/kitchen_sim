import {SERVICE_CHAMBER_PHOTO} from './site-photo-layout.mjs';
// Owner request + RG1 plan, page 1. The legend identifies the large rear circle
// as a sewage/drainage inspection chamber. Its symbol centre is traced; the
// real lid diameter and maintenance clearances still need site confirmation.
export function createServiceYard(point){
 const planCentre=point(1212.39,896.59),centre=[...SERVICE_CHAMBER_PHOTO.position],coverDiameter=1,accessSize=1.6;
 // Owner choice: 3.5 m across the yard, 3 m along the neighbour wall, behind the AC units.
 const boundaryX=point(1277.82,938.62)[0],fenceGap=.1,accessGap=.1,w=3.5,d=3,wall=.06,maxX=boundaryX-fenceGap,minX=maxX-w,maxZ=centre[1]-accessSize/2-accessGap,minZ=maxZ-d;
 const polygon=[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]],access=[[centre[0]-.8,centre[1]-.8],[centre[0]+.8,centre[1]-.8],[centre[0]+.8,Math.min(centre[1]+.8,17.383816666666666)],[centre[0]-.8,Math.min(centre[1]+.8,17.383816666666666)]];
 const door={id:'garden-shed:door',he:'דלת המחסן',en:'Shed door',width:.9,height:2,hinge:'end',swing:1,x:(minX+maxX)/2,z:minZ};
 const appliances=[
  {id:'shed-fridge',he:'מקרר במחסן — מקום שמור',en:'Shed refrigerator — placeholder',x:minX+.75,z:maxZ-wall-.1-.35,w:.65,d:.7,h:1.85,doorHe:'דלת המקרר',doorEn:'Refrigerator door'},
  {id:'shed-freezer',he:'מקפיא עומד — מקום שמור',en:'Upright freezer — placeholder',x:minX+1.55,z:maxZ-wall-.1-.35,w:.65,d:.7,h:1.85,doorHe:'דלת המקפיא',doorEn:'Freezer door'}
 ];
 const parts=[door,...appliances.map(a=>({id:`${a.id}:door`,he:a.doorHe,en:a.doorEn}))];
 const coverGap=centre[1]-maxZ-coverDiameter/2,passage=minX-point(1002.84,938.62)[0];
 const safeWindow={id:'safe-window-clearance',minX:point(1007.1,705)[0],maxX:point(1066.62,705)[0],minZ:point(1007.1,705)[1]+.18};
 safeWindow.maxZ=safeWindow.minZ+1.5;
 safeWindow.polygon=[[safeWindow.minX,safeWindow.minZ],[safeWindow.maxX,safeWindow.minZ],[safeWindow.maxX,safeWindow.maxZ],[safeWindow.minX,safeWindow.maxZ]];
 const elements=[
  {id:'service-manhole',he:'שוחת ביוב / ניקוז',en:'Sewage / drainage inspection chamber',dimensions:[coverDiameter,coverDiameter],dimensionLabels:[['קוטר סימון משוער','Assumed symbol diameter'],['קוטר סימון משוער','Assumed symbol diameter']],planned:false,originLabel:['מיקום לפי צילום · מידות משוערות','Photo-positioned · estimated dimensions'],source:'service-yard',page:5,
   metrics:[{he:'ריבוע גישה מסומן',en:'Marked access square',value:accessSize,unit:'m'},{he:'מהדופן הקרובה של המחסן עד שפת הסימון',en:'Shed side to symbol rim',value:coverGap,unit:'m'}],
   noteHe:'מיקום השוחה עודכן לפי תמונות 307548 ו־307549: ליד הגדר הקדמית וקיר השכן. המכסה נראה בתמונה, אך המרכז וקוטר 100 ס״מ בהדמיה אינם מדידה. ריבוע הגישה המוצע נחתך בקו גבול המגרש; אין כאן קביעת מרווח תקני. מיקום המחסן נשמר.',
   noteEn:'Position updated from 307548/307549 beside the front railing and neighbour wall. The lid is visible, but the centre is estimated and the displayed 100 cm diameter is not a measured lid. The 160 cm planning reserve is clipped at the plot boundary; it is not a verified regulatory clearance. The shed stays in its previous position.'},
  {id:'garden-shed',he:'מחסן — רוחב 3.5 × עומק 3 מ׳',en:'Shed — 3.5 m wide × 3 m deep',dimensions:[w,d,2.2],dimensionLabels:[['רוחב לרוחב החצר','Width across yard'],['עומק לאורך קיר השכן','Depth along neighbour wall'],['גובה משוער','Assumed height']],area:w*d,planned:true,source:'service-yard',page:3,parts:[door],roofControl:true,
   metrics:[{he:'פנים משוער מהגדר',en:'Assumed interior across fence',value:w-wall*2,unit:'m'},{he:'פנים משוער לאורך הגדר',en:'Assumed interior along fence',value:d-wall*2,unit:'m'},{he:'פתח דלת פנוי מוצע',en:'Proposed clear door opening',value:door.width,unit:'m'},{he:'פער תכנון מקו הגדר',en:'Planning gap from boundary line',value:fenceGap,unit:'m'},{he:'רוחב לצד קיר הממ״ד באזור המחסן',en:'Width beside safe-room wall at shed',value:passage,unit:'m'}],
   noteHe:'בחירתך: מידות חוץ 350 ס״מ לרוחב החצר ו־300 ס״מ לאורך קיר השכן, בהצבה האחורית לכיוון השוחה. נשמרים כ־125 ס״מ לצד קיר הבית, 10 ס״מ מקיר השכן ו־40 ס״מ משפת המכסה המשוער. המחסן מחוץ לרצועת החלון ולחזית המזגנים. דלת 90 ס״מ פונה ליציאת השירות ונפתחת פנימה. גובה 220 ס״מ וקירות בעובי 6 ס״מ להמחשה. מיקום השוחה והמרווחים דורשים מדידה בשטח.',
   noteEn:'Owner choice: 350 cm across the yard and 300 cm along the neighbour wall, moved rearward toward the chamber. Approximately 125 cm remains beside the house, 10 cm to the neighbour wall and 40 cm to the estimated lid rim. The shed clears the window strip and AC frontage. A 90 cm door faces the service exit and opens inward. Height 220 cm and 6 cm walls are illustrative. Confirm chamber position and clearances on site.'},
  {id:safeWindow.id,he:'מול חלון הממ״ד — להשאיר פנוי',en:'Keep clear in front of the safe-room window',dimensions:[safeWindow.maxX-safeWindow.minX,1.5],planned:true,source:'service-yard',page:1,
   noteHe:'רצועה מוצעת ברוחב פתח חלון הממ״ד לפי התוכנית, המסומנת לאורך 150 ס״מ לכיוון החצר. המחסן ממוקם מחוץ לרוחב הפתח ולרצועה זו. זהו סימון עזר לתכנון, ולא קביעת מרחק תקני או אישור לפתיחת החלון בפועל.',
   noteEn:'A proposed 150 cm strip projected into the yard across the plan-derived safe-room opening width. The shed lies outside both the opening width and this strip. This is a planning aid, not a certified window clearance or verification of its actual operation.'},
  ...appliances.map(a=>({id:a.id,he:a.he,en:a.en,dimensions:[a.w,a.d,a.h],planned:true,source:'service-yard',page:1,parts:[parts.find(p=>p.id===`${a.id}:door`)],
   noteHe:'מידת מקום שמור בלבד: 65×70×185 ס״מ. טרם נמסרו דגם ומידות המכשיר הקיים שלך. בתכנון נשמרו 10 ס״מ מאחור ו־15 ס״מ בין המכשירים; נדרשת התאמה להוראות היצרן של שני הדגמים, לפתיחת הדלתות ולטמפרטורה בפועל במחסן. גופי הקירור הנראים במסך אינם מוצר מזוהה.',
   noteEn:'Reserved space only: 65×70×185 cm. Your existing appliance models and dimensions are unknown. The layout reserves 10 cm behind and 15 cm between units; adapt this to both manufacturers’ instructions, door swings and the shed’s actual ambient temperature. Displayed bodies are not identified products.'}))
 ].map(e=>({...e,roomId:'garden',dimensionsInferred:true}));
 return {manhole:{id:'service-manhole',position:centre,diameter:coverDiameter,accessSize,access,planPosition:planCentre,photoVerified:true,positionInferred:true},safeWindow,shed:{id:'garden-shed',polygon,minX,maxX,minZ,maxZ,w,d,h:2.2,wall,fenceGap,accessGap,passage,door,appliances,shelves:{minX:minX+wall,maxX:minX+wall+.4,minZ:minZ+.25,maxZ:minZ+1.4}},parts,elements};
}

export const SERVICE_SOURCE={id:'service-yard',kind:'gallery',he:'חצר שירות — בור ומחסן',en:'Service yard — chamber & shed',pages:[1,2,3,4,5,6],imagePrefix:'/house/service-yard/reference-',references:[
 {page:5,image:'/house/service-yard/307548.jpg',he:'מיקום השוחה ליד הגדר',en:'Chamber beside the railing',noteHe:'המכסה נראה סמוך לגדר ולקיר השכן. המיקום בהדמיה משוער לפי התמונה.',noteEn:'Visible lid next to the front railing and neighbour wall. Model coordinates are estimated from the photo.'},
 {page:6,image:'/house/service-yard/307549.jpg',he:'השוחה ביחס ליציאת השירות',en:'Chamber relative to service exit',noteHe:'מבט רחב על מיקום המכסה והחצר.',noteEn:'Wider view locating the lid within the yard.'},
 {page:1,he:'מיקום השוחה בחצר השירות האחורית',en:'Chamber in the rear service yard',noteHe:'העיגול האפור הגדול בחלק האחורי הוא סימון שוחת ביוב/ניקוז לפי המקרא. מיקום המחסן המוצע מופיע בתוכנית האינטראקטיבית; הוא אינו חלק מתוכנית הקבלן.',noteEn:'The large grey rear circle denotes a sewage/drainage inspection chamber according to the legend. The proposed shed is shown in the interactive plan and is not part of the contractor drawing.'},
 {page:2,he:'מקרא התוכנית — שוחת ביוב/ניקוז',en:'Plan legend — sewage/drainage chamber',noteHe:'מקור לזיהוי הסמל. קוטר המכסה בפועל ודרישות הגישה אינם רשומים בתוכנית.',noteEn:'Source for identifying the symbol. Actual lid diameter and access requirements are not dimensioned.'},
 {page:3,file:'01-273512.jpg',he:'הגדר עם השכן וחצר השירות',en:'Neighbour boundary and service yard',noteHe:'הקיר המשותף מופיע מימין והחלון עם התריס משמאל. אין מכסה ביוב מזוהה בוודאות בחול ובאזור המוסתר מאחורי הגדר. התמונות המאוחרות בעמודים 5–6 משמשות למיקום העדכני.',noteEn:'The neighbour wall is on the right, and the shuttered window on the left. No chamber lid is confidently visible in the sand or behind the foreground railing. Later photos on pages 5–6 determine the updated model position.'},
 {page:4,file:'02-273513.jpg',he:'חלון הממ״ד והקרקע בחצר',en:'Safe-room-side window and yard ground',noteHe:'מבט נוסף לצד השירות. לא זוהה מכסה ביוב בוודאות; החול והצללים אינם מאפשרים מדידת מיקום או קוטר. ההצעה שומרת שטח פנוי מול הפתח לפי התוכנית.',noteEn:'Another service-side view. No lid is confidently identifiable; sand and shadows do not establish its position or size. The proposal keeps the plan-derived window frontage clear.'}
]};
