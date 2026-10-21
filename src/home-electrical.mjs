// Visual inventory, not an electrical drawing or a measured installation survey.
// One ID denotes a visible box/cluster, never an inferred circuit or purchase quantity.
import {applyKitchenElectricalRelocation} from './kitchen-electrical-relocation.mjs';
import {SERVICE_COLORS} from './service-colors.mjs';
import {WATER_STYLE} from './home-water.mjs';
export const ELECTRICAL_KINDS={
 outlet:{he:'שקע חשמל',en:'Power socket',color:SERVICE_COLORS.outlet,symbol:'P'},
 control:{he:'מפסק / בקרה — זיהוי משוער',en:'Possible switch / control',color:SERVICE_COLORS.control,symbol:'S'},
 preparation:{he:'קופסה / הכנה לא מזוהה',en:'Unidentified box / preparation',color:SERVICE_COLORS.preparation,symbol:'?'},
 water:WATER_STYLE
};
const photo=(page,file,he,en,image=`/house/photos/photo-${page}.jpg`)=>({page,id:`p${page}`,file,he,en,image});
const frame=(page,second,he,en)=>({page,id:`v${second}`,file:'277904.mp4',second,he,en,image:`/house/electrical/frame-${second}.jpg`});
export const ELECTRICAL_REFERENCES=[
 photo(1,'01-277867.jpg','מטבח — שני קירות','Kitchen — both walls'),
 photo(2,'02-277869.jpg','מטבח — קיר קצר','Kitchen — short wall'),
 photo(3,'03-277875.jpg','חדר מצולם מהדלת','Bedroom from doorway'),
 photo(4,'04-277878.jpg','חדר מצולם — קיר חלון א׳','Bedroom — window wall A'),
 photo(5,'05-277877.jpg','חדר מצולם — שני קירות','Bedroom — two walls'),
 photo(6,'06-277882.jpg','חדר הורים — מחיצה','Main bedroom — partition'),
 photo(7,'07-277886.jpg','חדר מצולם — קיר חלון ב׳','Bedroom — window wall B'),
 photo(8,'08-277887.jpg','תקריב קיר חלון ב׳','Window wall B close-up'),
 photo(9,'09-277893.jpg','ממ״ד — חלון ומערכת סינון','Safe room — window and air filter'),
 frame(10,4.5,'סלון — קופסאות בקיר','Living room — wall boxes'),
 frame(11,3,'סלון — ליד הוויטרינה','Living room — beside slider'),
 frame(12,9.5,'שירות — שתי נקודות ליד החלון','Utility — two points by window'),
 frame(13,19.5,'ממ״ד — הקיר הצדדי','Safe room — side wall'),
 frame(14,17.5,'מסדרון — נקודה נמוכה','Hall — low point'),
 frame(15,2.5,'פתח המסדרון — שקע גבוה','Hall entrance — high socket'),
 frame(16,22.5,'ליד דלת חדר ההורים','Beside the main-bedroom door'),
 frame(17,7.5,'ליד דלת הרחצה','Beside bathroom doorway'),
 photo(18,'01-277901.jpg','שקע במבואת השירות','Service porch socket','/house/exterior/reference-1.jpg'),
 photo(19,'01-IMG_20261017_143057.jpg','מרפסת — לצד הוויטרינה','Terrace — beside slider','/house/electrical/terrace.jpg'),
 photo(20,'02-273513.jpg','קופסה ליד יחידות המזגן','Box beside outdoor AC units','/house/exterior/reference-4.jpg'),
 {...photo(21,'277903.jpg','המטבח ופתח המסדרון — מבט נוסף','Kitchen and hall entrance — additional view','/house/electrical/kitchen-hall-277903.jpg'),width:1536,height:1152,sha256:'0bd685a44f701cd686e02f07694f72cc4fc00657d588d1ccbc85a0ca5dfb9fe1',noteHe:'K06, K08, K09 ו־K10 נראים על קיר העבודה. H02 הוא השקע הגבוה על הקיר בצד הסלון, מימין לפתח המסדרון. K07 מוסתר בתמונה הזאת. הגבהים והמיקומים במודל משוערים.',noteEn:'K06, K08, K09 and K10 are visible on the work wall. H02 is the high socket on the living-side wall to the right of the hall entrance. K07 is obscured in this view. Model positions and heights remain estimates.'},
 frame(22,15,'חדר ראשון בסיור — ליד החלון','First room on route — window fitting'),
 frame(23,16.5,'חדר שני בסיור — ליד החלון','Second room on route — window fitting'),
 frame(24,24,'חדר הורים — שקע סמוך לפינת החלון','Main bedroom — socket near window corner'),
 frame(25,28,'חדר עבודה — נקודה משמאל לחלון','Office — fitting to left of window'),
 {...photo(26,'01-302046.jpg','סלון — הצילום הנוסף שלך','Living — your additional screenshot','/house/electrical/living-302046.jpg'),noteHe:'שתי הקופסאות העליונות ויציאת הכבלים הן L01–L03. מיקומן תוקן לקיר שבין הוויטרינה לפתח המסדרון; אין ספירה כפולה.',noteEn:'The two upper boxes and low cable opening are L01–L03. Their host wall is corrected to the wall between the slider and hall entrance; they are not counted twice.'},
 {...frame(27,5.25,'מסדרון — קופסה ליד הפתח','Hall — box near entrance'),file:'walkthrough.mp4'},
 {...frame(28,30,'חדר עבודה — זוג נקודות נמוכות בקיר הנגדי','Office — low pair on opposite side wall'),file:'walkthrough.mp4'}
].map(s=>({...s,noteHe:s.noteHe??(s.second!=null?`פריים מהסרטון בשנייה ${s.second}. הסימונים מתייחסים למה שנראה בלבד; מיקום במודל וגובה משוערים.`:'סימון על הצילום המקורי. אביזר שאינו מזוהה נשאר הכנה לא מזוהה; מיקום במודל וגובה משוערים.'),noteEn:s.noteEn??(s.second!=null?`Video frame at ${s.second} seconds. Marks describe visible evidence only; model placement and height are estimated.`:'Marks on the original photo. Unidentified fittings remain unidentified preparations; model placement and height are estimated.')}));
// Rectangles are fractions of the displayed source image: x, y, width, height.
const ev=(page,rect)=>({page,rect});
const p=(label,roomId,kind,wallId,along,side,height,he,en,evidence,extra={})=>({id:`electrical-${label}`,label,roomId,kind,wallId,along,side,height,he,en,evidence,...extra});
const inferred={roomInferred:true};
const ownerSocket={identificationSource:'owner-clarification'};
export const ELECTRICAL_EXCLUSIONS=[{id:'electrical-K05',label:'K05',page:1,reasonHe:'לפי הבהרת בעל הדירה, אינה נקודת חשמל',reasonEn:'Owner clarified that this is not an electrical point'}];
export const ELECTRICAL_OBSERVATIONS=[
 p('K01','kitchen','outlet','kitchen-east',199,-1,1.45,'שקע גבוה בקיר הקצר','High socket on short wall',[ev(2,[.117,.411,.033,.04]),ev(1,[.35,.394,.016,.025])]),
 p('K02','kitchen','outlet','kitchen-east',229,-1,1.12,'שקע אמצעי ראשון בקיר הקצר','First middle short-wall socket',[ev(2,[.319,.487,.039,.045]),ev(1,[.407,.416,.017,.025])]),
 p('K03','kitchen','outlet','kitchen-east',244,-1,1.12,'שקע אמצעי שני בקיר הקצר','Second middle short-wall socket',[ev(2,[.385,.487,.039,.045]),ev(1,[.427,.416,.017,.025])]),
 p('K04','kitchen','outlet','kitchen-east',327,-1,1.05,'מקבץ שקע כפול ליד הפינה','Double socket cluster near corner',[ev(2,[.78,.59,.049,.043]),ev(1,[.532,.444,.019,.023])],{width:.14}),
 p('K06','kitchen','outlet','wet-north',1148,-1,.82,'שקע ליד הכנת הכיור','Socket beside sink preparations',[ev(21,[.142,.744,.023,.023]),ev(1,[.647,.519,.018,.027])],ownerSocket),
 p('K07','kitchen','outlet','wet-north',1088,-1,.62,'שקע מעל הכנת הצנרת','Socket above pipe preparations',[ev(1,[.718,.563,.017,.027])],ownerSocket),
 p('K08','kitchen','outlet','wet-north',1035,-1,1.15,'שקע בקיר העבודה (קופסה אדומה)','Work-wall socket (red back box)',[ev(21,[.375,.682,.028,.023]),ev(1,[.773,.494,.023,.028])],ownerSocket),
 p('K09','kitchen','preparation','wet-north',968,-1,1.15,'קופסה גבוהה בקצה קיר העבודה','High box at end of work wall',[ev(21,[.502,.685,.021,.023]),ev(1,[.87,.522,.024,.027])]),
 p('K10','kitchen','outlet','wet-north',968,-1,.4,'שקע נמוך בקצה קיר העבודה','Low socket at end of work wall',[ev(21,[.501,.798,.022,.022]),ev(1,[.861,.645,.025,.027])]),
 p('L01','living','preparation','bed-a-north',777,-1,1.35,'קופסה עליונה ראשונה בקיר הסלון','First high living-wall box',[ev(26,[.464,.359,.05,.024]),ev(10,[.895,.312,.049,.031])]),
 p('L02','living','outlet','bed-a-north',761,-1,1.35,'שקע עליון בקיר הסלון','High living-wall socket',[ev(26,[.523,.359,.046,.024]),ev(10,[.952,.313,.045,.031])]),
 p('L03','living','preparation','bed-a-north',767,-1,.55,'יציאת כבלים נמוכה בקיר הסלון','Low cable opening on living wall',[ev(26,[.479,.559,.068,.043]),ev(10,[.896,.575,.073,.05])]),
 p('L04','living','control','patio-west',287,1,1.1,'אביזר בקרה לצד הוויטרינה','Possible control beside slider',[ev(11,[.362,.493,.038,.02])]),
 p('L05','living','preparation','patio-west',275,1,1.1,'קופסה פתוחה לצד אביזר הבקרה','Open box beside slider control',[ev(11,[.415,.494,.04,.023])]),
 p('A01','bedroom-b','preparation','west',524,1,1.1,'הכנה ליד החלון — סוג האביזר לא מאומת','Preparation beside window — fitting unconfirmed',[ev(23,[.711,.451,.047,.023]),ev(4,[.587,.532,.025,.026])],inferred),
 p('A02','bedroom-b','outlet','west',502,1,.38,'שקע נמוך ליד החלון','Low socket beside window',[ev(4,[.661,.646,.025,.025])],inferred),
 p('A03','bedroom-b','preparation','west',491,1,.38,'קופסה נמוכה נוספת ליד החלון','Second low box beside window',[ev(4,[.691,.647,.025,.027])],inferred),
 p('B01','bedroom-a','preparation','bed-a-south',771,-1,1.35,'קופסה גבוהה פתוחה בקיר הצדדי','Open high side-wall box',[ev(5,[.072,.283,.095,.076])],inferred),
 p('B02','bedroom-a','outlet','bed-a-south',751,-1,1.35,'שקע לצד הקופסה הגבוהה','Socket beside high box',[ev(5,[.191,.285,.071,.078])],inferred),
 p('B03','bedroom-a','preparation','west',443,1,1.1,'הכנה לא מזוהה ליד החלון','Unidentified preparation beside window',[ev(22,[.255,.397,.058,.026]),ev(5,[.841,.531,.05,.05])],inferred),
 p('B04','bedroom-a','preparation','bed-a-south',646,-1,.38,'קופסה נמוכה בקצה הקיר','Low box at wall end',[ev(5,[.604,.755,.03,.047])],inferred),
 p('B05','bedroom-a','outlet','bed-a-south',631,-1,.38,'שקע נמוך לצד הקופסה','Low socket beside box',[ev(5,[.639,.737,.028,.043])],inferred),
 p('O01','bedroom-c','preparation','south',927,-1,1.1,'אביזר לצד החלון — משמאל','Fitting to left of window',[ev(25,[.485,.44,.042,.02]),ev(8,[.304,.447,.035,.039]),ev(7,[.397,.447,.032,.028])],inferred),
 p('O02','bedroom-c','outlet','south',855,-1,.38,'שקע נמוך מימין לחלון','Low socket to right of window',[ev(8,[.686,.636,.033,.034]),ev(7,[.692,.55,.031,.04])],inferred),
 p('O03','bedroom-c','preparation','south',841,-1,.38,'קופסה לצד השקע הנמוך','Box beside low socket',[ev(8,[.735,.637,.033,.035]),ev(7,[.733,.551,.03,.04])],inferred),
 p('O04','bedroom-c','preparation','master-east',795,1,1.35,'קופסה גבוהה ראשונה בקיר הצדדי','First high side-wall box',[ev(7,[.892,.385,.025,.037])],inferred),
 p('O05','bedroom-c','preparation','master-east',782,1,1.35,'קופסה גבוהה שנייה בקיר הצדדי','Second high side-wall box',[ev(7,[.919,.382,.024,.037])],inferred),
 p('O06','bedroom-c','outlet','bedroom-c-east',820,-1,.38,'שקע נמוך בקיר הנגדי לצד החלון','Low socket on the opposite side wall',[ev(28,[.583,.643,.071,.034])],inferred),
 p('O07','bedroom-c','preparation','bedroom-c-east',834,-1,.38,'קופסה נמוכה לצד השקע בקיר הנגדי','Low box beside socket on opposite side wall',[ev(28,[.671,.633,.065,.034])],inferred),
 p('M01','master','preparation','south',800,-1,.5,'פתח עגול בקיר חדר ההורים','Round opening on main-bedroom wall',[ev(6,[0,.576,.012,.026])]),
 p('M02','master','preparation','south',787,-1,.5,'קופסה ראשונה בקיר חדר ההורים','First main-bedroom wall box',[ev(6,[.028,.574,.024,.022])]),
 p('M03','master','preparation','south',773,-1,.5,'קופסה שנייה בקיר חדר ההורים','Second main-bedroom wall box',[ev(6,[.061,.57,.023,.022])]),
 p('M04','master','outlet','south',622,-1,.45,'שקע נמוך בקיר האחורי, סמוך לפינת החלון','Low rear-wall socket near the window corner',[ev(24,[.241,.497,.036,.022]),ev(6,[.344,.53,.018,.025])]),
 p('M05','master','preparation','ensuite-east',708,1,1.35,'קופסה גבוהה במחיצה ליד הרחצה','High partition box beside en suite',[ev(6,[.744,.451,.046,.043])],{width:.14}),
 p('M06','master','preparation','ensuite-east',708,1,.45,'קופסה נמוכה באותה מחיצה','Low box on same partition',[ev(6,[.723,.707,.045,.053])],{width:.14}),
 p('S01','safe-room','outlet','wet-east',566,-1,1.35,'שקע גבוה בקיר הצדדי של הממ״ד','High safe-room side-wall socket',[ev(13,[.128,.318,.055,.03])]),
 p('S02','safe-room','preparation','wet-east',552,-1,1.35,'קופסה גבוהה ליד השקע בממ״ד','High box beside safe-room socket',[ev(13,[.046,.318,.06,.03])]),
 p('S03','safe-room','outlet','wet-east',661,-1,.42,'שקע נמוך בקיר הצדדי של הממ״ד','Low safe-room side-wall socket',[ev(9,[.161,.525,.025,.025]),ev(13,[.503,.545,.04,.025])]),
 p('S04','safe-room','preparation','wet-east',674,-1,.42,'קופסה עם כבל לצד השקע בממ״ד','Box with cable beside safe-room socket',[ev(9,[.188,.519,.025,.03]),ev(13,[.55,.539,.042,.028])]),
 p('S05','safe-room','outlet','safe-south',1019,-1,.42,'שקע מתחת לחלון הממ״ד','Socket below safe-room window',[ev(9,[.393,.517,.024,.026]),ev(13,[.908,.547,.045,.024])]),
 p('S06','safe-room','outlet','wet-east',687,-1,1.95,'שקע גבוה ליד מערכת הסינון','High socket beside air filter',[ev(9,[.217,.26,.026,.032]),ev(13,[.632,.198,.03,.025])]),
 p('U01','laundry','outlet','utility-east',374,-1,1.3,'שקע ראשון לצד חלון השירות','First utility-window socket',[ev(12,[.435,.286,.049,.03])]),
 p('U02','laundry','outlet','utility-east',387,-1,1.3,'שקע שני לצד חלון השירות','Second utility-window socket',[ev(12,[.506,.285,.05,.031])]),
 p('H01','hall','preparation','bed-b-east',621,1,.38,'קופסה נמוכה במסדרון','Low hall box',[ev(14,[.789,.822,.065,.066])]),
 p('H02','living','outlet','bed-a-north',876,-1,2.2,'שקע גבוה מימין לפתח המסדרון','High socket to right of hall entrance',[ev(21,[.782,.398,.029,.029]),ev(15,[.449,.11,.079,.036])],{positionNoteHe:'על חזית הקיר בצד הסלון, מימין לפתח המסדרון. שיוך הקיר תוקן לפי המבט הנוסף והסרטון; הגובה והמיקום המדויק משוערים.',positionNoteEn:'On the living-facing wall to the right of the hall entrance. Wall assignment corrected from the additional view and video; height and exact offset remain estimated.'}),
 p('H03','hall','control','master-east',699,1,1.1,'הכנת מפסק ליד דלת חדר ההורים','Possible switch beside main-bedroom door',[ev(16,[.319,.477,.036,.04])]),
 p('H04','hall','preparation','bath-west',385,-1,1.1,'מקבץ הכנות ליד דלת הרחצה','Preparation cluster beside bathroom doorway',[ev(17,[.58,.194,.061,.09])]),
 p('H05','hall','preparation','powder-east',382,1,1.1,'קופסה בקיר המסדרון מול אזור הרחצה','Hall-wall box opposite bathroom area',[ev(27,[.874,.532,.061,.04])]),
 p('T01','terrace','outlet','patio-west',275,-1,.5,'שקע חוץ ליד הוויטרינה','Exterior socket beside slider',[ev(19,[.612,.426,.022,.02])]),
 p('Y01','garden','outlet','utility-south',1174,1,.85,'שקע במבואת היציאה האחורית','Socket in rear exit porch',[ev(18,[.708,.58,.053,.031])]),
 p('Y02','garden','preparation','wet-east',640,1,.8,'קופסת חיבור ליד יחידות המזגן','Connection box beside AC units',[ev(20,[.771,.523,.018,.031])])
];

export function createElectricalLayout(point,walls,{kitchenAnchor=point(1260.78,357.52)}={}){
 const points=ELECTRICAL_OBSERVATIONS.map(o=>{
  const w=walls.find(w=>w.id===o.wallId);if(!w)throw Error(`Missing electrical wall ${o.wallId}`);
  const vertical=Math.abs(w.a[0]-w.b[0])<.001,along=vertical?point(606,o.along)[1]:point(o.along,45.7)[0],offset=o.side*(w.thickness/2+.033);
  const position=vertical?[w.a[0]+offset,o.height,along]:[along,o.height,w.a[1]+offset],normal=vertical?[o.side,0]:[0,o.side];
  return applyKitchenElectricalRelocation({...o,position,normal,vertical,width:o.width||.09,depth:.018,boxHeight:.085,electrical:true,source:'electrical-survey',page:o.evidence[0].page,dimensionsInferred:true,positionInferred:true},kitchenAnchor);
 });
 return {points,reviewedVideo:{file:'277904.mp4',duration:32.332896,samplingSeconds:.5,targetedSamplingSeconds:.25,reviewRevision:39,sha256:'f29792fe1aa136a45b9902e9328698468627c4c8209e6a805a462de800108d45'},excluded:['ceiling lights','water and gas outlets','drains','ventilation covers','cistern flush plates']};
}
export const electricalVisible=(p,settings)=>settings.showElectrical!==false&&(!p.roomInferred||settings.electricalInferred!==false);
// Separate stacked-height or adjacent boxes in the SVG, with leaders to the
// unchanged wall anchor. No 3D position or observed source rectangle is moved.
export function electricalPlanMarkers(points){
 const placed=[];
 for(const p of points){
  let marker;
  for(let lane=0;lane<20;lane++){
   const offset=.22+lane*.38,x=p.position[0]+p.normal[0]*offset,z=p.position[2]+p.normal[1]*offset;
   if(!placed.some(q=>Math.hypot(q.x-x,q.z-z)<.37)){marker={point:p,x,z};break;}
  }
  if(!marker)throw Error(`No clear marker position for ${p.id}`);
  placed.push(marker);
 }
 return placed;
}
export const ELECTRICAL_SOURCE={id:'electrical-survey',kind:'gallery',he:'סימון שקעים ומפסקים',en:'Outlets & switches survey',pages:ELECTRICAL_REFERENCES.map(r=>r.page),references:ELECTRICAL_REFERENCES};
