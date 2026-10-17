import {OUTDOOR_KITCHEN} from './home-products.mjs';
import {OPENING_SCHEDULE,DOOR_HANDINGS,SHUTTER_IDS} from './home-building-spec.mjs';
import {createGardenLayout} from './home-garden-layout.mjs';
// Traced from the attached RG1 plan, page 1 (1318 × 1120 PDF points).
// The nominal 1:50 scale is 0.017638889 metres/PDF point. Printed room
// dimensions are retained separately: several finish-size labels are 5–7 cm
// smaller than the vector spans. No architectural boundary is warped to fit them.
export const PLAN_SCALE=50*25.4/72/1000;
export const PLAN_ORIGIN=[606,45.7];
export const point=(x,z)=>[(x-PLAN_ORIGIN[0])*PLAN_SCALE,(z-PLAN_ORIGIN[1])*PLAN_SCALE];
const polygon=a=>a.map(p=>point(...p));
const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
export const HOUSE={height:2.75,eyeHeight:1.62,playerRadius:.17,source:'/house/house-plan.pdf',image:'/house/house-plan.jpg',revision:13,scale:50};
export const GARDEN_LAYOUT=createGardenLayout(point);
export const gardenElement=id=>GARDEN_LAYOUT.elements.find(e=>e.id===id);
export const HOUSE_OUTLINE=polygon([[671.22,37.2],[1141.74,37.2],[1141.74,159.1],[1269.3,159.1],[1269.3,366.04],[1187.1,366.04],[1187.1,451.06],[1087.92,451.06],[1087.92,717.52],[1002.84,717.52],[1002.84,938.62],[589.02,938.62],[589.02,297.98],[671.22,297.98]]);
export const PLOT=polygon(rect(273.84,42.28,1277.82,1032.94));
export const PUBLIC_ENTRY=polygon(rect(1141.74,42.28,1277.82,159.1));
const room=(id,he,en,kind,pdf,walkPdf,size,icon,description)=>({id,he,en,kind,polygon:polygon(pdf),walk:point(...walkPdf),size,icon,description});
export const ROOMS=[
 room('living','סלון','Living room','living',[[679.74,45.7],[1138.92,45.7],[1138.92,108.04],[1133.28,108.04],[1133.28,167.62],[951.8,167.62],[951.8,357.52],[892.32,357.52],[892.32,300.82],[679.74,300.82]],[940,160],'795 × 445 cm','sofa','הספה מוצמדת לקיר שבו הייתה הטלוויזיה. הטלוויזיה על הקיר שממול; פינת האוכל בוטלה.'),
 room('kitchen','מטבח','Kitchen','kitchen',rect(951.8,167.62,1260.78,357.52),[1130,290],'330 cm · קיר עבודה 545 cm','kitchen','מעבר לסימולטור המטבח המפורט עם פתיחת כל דלת ומגירה.'),
 room('bedroom-a','חדר שינה 1','Bedroom 1','bedroom',[[606,306.46],[807.3,306.46],[807.3,408.52],[815.76,408.52],[815.76,465.22],[606,465.22]],[740,405],'350 × 280 cm','bed','הארון ליד הדלת, על המשך קיר הכניסה ופונה לתוך החדר. מיטה 120×190 ס״מ.'),
 room('bedroom-b','חדר שינה 2','Bedroom 2','bedroom',rect(606,470.92,815.76,629.62),[740,558],'365 × 280 cm','bed','הארון ליד הדלת, על המשך קיר הכניסה. שולחן המחשב עבר למיקום הארון הקודם; מיטה 120×190 ס״מ.'),
 room('master','חדר הורים','Main bedroom','bedroom',[[719.4,635.32],[815.76,635.32],[815.76,921.58],[606,921.58],[606,743.02],[719.4,743.02]],[755,790],'365 × 310 cm · אזור שינה','bed','חדר בצורת ר׳ סביב חדר הרחצה הפרטי. נשמר המתאר המקורי.'),
 room('bedroom-c','חדר עבודה','Home office','office',rect(821.46,714.64,985.86,921.58),[902,810],'285 × 360 cm','desk','חדר שינה 3 הוסב לחדר עבודה עם שולחן, כיסא וארון משרד. החלון והקירות נשמרו.'),
 room('safe-room','ממ״ד','Safe room','office',rect(892.32,521.92,1069.74,691.96),[952,590],'308 × 295 cm','shield','מיטה זוגית 140×190 ס״מ במקום הספה, לצד שולחן וארון. הדלת והחלון במיקום התוכנית.'),
 room('bathroom','חדר רחצה','Bathroom','bathroom',[[954.66,368.86],[1011.36,368.86],[1011.36,363.16],[1070.88,363.16],[1070.88,504.88],[954.66,504.88]],[1010,425],'198 × 233 cm','bath','מחובר למסדרון ולאזור השירות, כפי שמופיע בתוכנית.'),
 room('ensuite','רחצת הורים','En suite','bathroom',rect(606,635.32,713.76,737.32),[683,669],'183 × 173 cm','bath','גישה מתוך חדר ההורים. גובה האביזרים והריהוט להמחשה.'),
 room('powder','שירותי אורחים','Guest WC','wc',rect(815.76,312.16,886.62,402.88),[845,372],'118 × 153 cm','bath','שירותים נפרדים בפתח המסדרון.'),
 room('laundry','אזור שירות','Utility','utility',rect(1076.58,363.16,1178.58,442.54),[1112,408],'175 × 135 cm','washer','גישה מחדר הרחצה ויציאה לחצר השירות ומשם לגינה.'),
 room('hall','מסדרון','Hall','hall',[[892.32,357.52],[949.02,357.52],[949.02,507.76],[878.16,507.76],[878.16,709],[821.46,709],[821.46,408.52],[892.32,408.52]],[850,557],'גישה לכל חדרי הבית','door','המעבר המרכזי נשמר פתוח לחלל הציבורי, ללא קיר שחוסם אותו.'),
 room('terrace','מרפסת מרוצפת','Terrace','outdoor',rect(475.62,42.88,662.7,289.48),[590,200],'רחבה מרוצפת לפי התוכנית','sun','גישה מהסלון דרך דלת ההזזה. מחוברת לגינה.'),
 room('garden','גינה פרטית','Private garden','garden',[[273.84,42.28],[475.62,42.28],[475.62,289.48],[589.02,289.48],[589.02,938.62],[1002.84,938.62],[1002.84,717.52],[1087.92,717.52],[1087.92,451.06],[1187.1,451.06],[1187.1,371.8],[1277.82,371.8],[1277.82,1032.94],[273.84,1032.94]],[470,630],'סביב הבית ממערב, מדרום וממזרח','leaf','הקו המקווקו בתוכנית הוא קו הקומה שמעל, ולא גדר חדשה.')
];
export const getRoom=id=>ROOMS.find(r=>r.id===id)||ROOMS[0];
export const TERRACE=polygon(rect(475.62,42.88,662.7,289.48));
export const SERVICE_APRON=polygon(rect(1087.92,448.24,1184.28,561.58));
export const KITCHEN_ANCHOR=point(1260.78,357.52);

const wall=(id,a,b,thickness=.1,external=false)=>({id,a:point(...a),b:point(...b),thickness,external});
export const WALLS=[
 wall('north',[671.22,37.2],[1141.74,37.2],.3,true),wall('entry-east',[1141.74,37.2],[1141.74,159.1],.3,true),
 wall('kitchen-north',[1141.74,159.1],[1269.3,159.1],.3,true),wall('kitchen-east',[1269.3,159.1],[1269.3,366.04],.3,true),
 wall('kitchen-south',[1184.28,366.04],[1269.3,366.04],.3,true),wall('wet-north',[949.02,360.34],[1184.28,360.34]),
 wall('utility-east',[1184.28,360.34],[1184.28,448.24],.2,true),wall('utility-south',[1076.58,445.39],[1184.28,445.39]),
 wall('wet-east',[1078.83,448.24],[1078.83,708.98],.32,true),wall('safe-south',[885.24,705],[1078.83,705],.32,true),
 wall('bedroom-c-east',[994.35,714.64],[994.35,930.1],.3,true),wall('south',[597.51,930.1],[994.35,930.1],.3,true),
 wall('west',[597.51,297.98],[597.51,930.1],.3,true),wall('setback',[597.51,297.98],[671.22,297.98],.3,true),
 wall('patio-west',[671.22,37.2],[671.22,297.98],.3,true),
 wall('bed-a-north',[606,303.64],[889.47,303.64]),wall('bed-a-east-upper',[811.53,306.46],[811.53,408.52],.15),
 wall('bed-a-east',[818.61,408.52],[818.61,468.07]),wall('bed-a-south',[606,468.07],[818.61,468.07]),
 wall('bed-b-east',[818.61,470.92],[818.61,632.47]),wall('bed-b-south',[606,632.47],[818.61,632.47]),
 wall('master-east',[818.61,635.32],[818.61,930.1]),wall('ensuite-east',[716.58,635.32],[716.58,740.17]),wall('ensuite-south',[606,740.17],[719.4,740.17]),
 wall('powder-east',[889.47,303.64],[889.47,405.7]),wall('powder-south',[811.53,405.7],[889.47,405.7]),
 wall('bath-west',[951.84,363.16],[951.84,513.4]),wall('bath-utility',[1073.73,363.16],[1073.73,504.88]),
 wall('safe-north',[878.16,513.4],[1078.83,513.4],.3),wall('safe-west',[885.24,513.4],[885.24,705],.25),
 wall('bed-c-north',[818.61,711.82],[994.35,711.82])
];
const opening=(id,wallId,start,end,rooms,he,type='door',sill=0,height=2.12)=>{
 const w=WALLS.find(x=>x.id===wallId),vertical=Math.abs(w.a[0]-w.b[0])<.001;
 const a=vertical?point(606,start)[1]:point(start,45.7)[0],b=vertical?point(606,end)[1]:point(end,45.7)[0];
 const schedule=OPENING_SCHEDULE[id];
 return {id,wallId,start:a,end:b,width:b-a,rooms,he,type,sill,height:schedule?.height??height,vertical,schedule,operation:schedule?.operation,material:schedule?.material,sillInferred:type==='window',...DOOR_HANDINGS[id]};
};
export const DOORS=[
 opening('entry','entry-east',51.4,108.04,['living'],'דלת הכניסה'),
 opening('patio','patio-west',96.7,255.46,['living','terrace'],'יציאה למרפסת','slider',0,2.3),
 opening('bed-a','bed-a-east',414.22,459.58,['hall','bedroom-a'],'דלת חדר שינה 1'),
 opening('bed-b','bed-b-east',476.56,521.92,['hall','bedroom-b'],'דלת חדר שינה 2'),
 opening('master','master-east',640.96,686.32,['hall','master'],'דלת חדר ההורים'),
 opening('bed-c','bed-c-north',829.98,875.28,['hall','bedroom-c'],'דלת חדר העבודה'),
 opening('safe','safe-north',900.84,940.5,['hall','safe-room'],'דלת פלדה חיצונית — ממ״ד'),
 {...opening('safe-inner','safe-north',900.84,940.5,['hall','safe-room'],'דלת עץ פנימית — ממ״ד'),hostDoorId:'safe'},
 opening('powder','powder-south',827.1,866.82,['hall','powder'],'דלת שירותי האורחים'),
 opening('ensuite','ensuite-east',640.96,680.62,['master','ensuite'],'דלת רחצת ההורים'),
 opening('bath','bath-west',405.7,451.06,['hall','bathroom'],'דלת חדר הרחצה'),
 opening('utility','bath-utility',391.54,436.9,['bathroom','laundry'],'דלת אזור השירות'),
 opening('service-exit','utility-south',1093.56,1147.44,['laundry','garden'],'יציאה לחצר השירות')
];
export const WINDOWS=[
 opening('bed-a-window','west',354.7,422.68,['bedroom-a'],'חלון חדר שינה 1','window',1,1.1),
 opening('bed-b-window','west',538.9,606.94,['bedroom-b'],'חלון חדר שינה 2','window',1,1.1),
 opening('master-window','west',774.22,842.2,['master'],'חלון חדר ההורים','window',1,1.1),
 opening('ensuite-window','west',655.12,683.5,['ensuite'],'חלון הרחצה','window',1.3,.7),
 opening('bed-c-window','south',844.14,912.18,['bedroom-c'],'חלון דרומי','window',1,1.1),
 opening('safe-window','safe-south',1007.1,1066.62,['safe-room'],'חלון הממ״ד','window',1,1.1),
 opening('kitchen-window','kitchen-south',1204.14,1255.14,['kitchen'],'חלון המטבח','window',1.1,1),
 opening('utility-window','utility-east',400,431.2,['laundry'],'חלון השירות','window',1.2,.9)
];
export function openingPoint(o){const w=WALLS.find(w=>w.id===o.wallId);return o.vertical?[w.a[0],(o.start+o.end)/2]:[(o.start+o.end)/2,w.a[1]];}
export const SHUTTERS=SHUTTER_IDS.map(id=>({id,opening:[...DOORS,...WINDOWS].find(o=>o.id===id)}));

const furniture=(id,roomId,kind,pdf,w,d,h=1,rotation=0)=>({id,roomId,kind,position:point(...pdf),w,d,h,rotation,illustrative:true});
export const FURNITURE=[
 furniture('living-sofa','living','sofa',[798,74.05],2.8,1,.82),furniture('living-table','living','coffee',[798,170],1.1,.6,.38),furniture('living-console','living','console',[798,289.48],2.2,.4,.5,Math.PI),
 // Both wardrobes back onto the east entrance wall and face west into the room.
 // Bedroom 1 follows the existing wall jog; its desk shifts along the south wall
 // to leave a walkable entrance. Room 2's desk also clears the door swing.
 // Simulator bedrooms 1 and 2 (specification rooms 2 and 3) tuck into the
 // north-west corners. Frame/headboard clearance includes the wall skirting.
 furniture('bed-a','bedroom-a','bed',[643.42,363.44],1.2,1.9,.48),furniture('wardrobe-a','bedroom-a','wardrobe',[791.12,358.77],1.8,.55,2.3,-Math.PI/2),furniture('desk-a','bedroom-a','desk',[730,447],1.1,.5,.76),
 furniture('bed-b','bedroom-b','bed',[643.42,527.9],1.2,1.9,.48),furniture('wardrobe-b','bedroom-b','wardrobe',[799.6,578],1.7,.55,2.3,-Math.PI/2),furniture('desk-b','bedroom-b','desk',[742,489],.95,.48,.76),
 furniture('master-bed','master','bed',[680,862.88],1.8,2,.5,Math.PI),furniture('master-wardrobe','master','wardrobe',[797,835],2.1,.55,2.3,-Math.PI/2),furniture('master-tv','master','tv',[680,744.4],1.2,.045,.68),
 furniture('wardrobe-c','bedroom-c','office-cabinet',[955,736],1.1,.55,2.3),furniture('desk-c','bedroom-c','desk',[960,850],1.4,.65,.76,-Math.PI/2),furniture('office-chair','bedroom-c','office-chair',[924,850],.58,.58,1.1,Math.PI/2),
 {...furniture('safe-bed','safe-room','bed',[1020,636.11],1.4,1.9,.48,Math.PI),nightstands:false,headboardHeight:.7},furniture('safe-desk','safe-room','desk',[1013,544],1.2,.55,.76),furniture('safe-storage','safe-room','wardrobe',[911,594],1.3,.5,2.2,Math.PI/2),
 {...furniture('bath-tub','bathroom','tub',[1010,485],1.6,.7,.58,Math.PI),products:['tub','bath-mixer','hand-shower']},
 {...furniture('bath-vanity','bathroom','vanity',[979,376],.82,.45,.85),products:['bath-vanity','mirror','basin-tap'],ordered:true},
 {...furniture('bath-toilet','bathroom','wall-toilet',[1032,378.5],.37,.54,.45),products:['toilet']},
 {...furniture('ensuite-toilet','ensuite','wall-toilet',[630,650.6],.37,.54,.45),products:['toilet']},
 {...furniture('ensuite-vanity','ensuite','vanity',[688,724.5],.82,.45,.85,Math.PI),products:['ensuite-vanity','mirror','basin-tap'],ordered:true},
 {...furniture('ensuite-shower','ensuite','shower',[628.7,714.64],.8,.8,2,Math.PI/2),products:['shower-floor','bath-mixer','hand-shower','shower-head']},
 {...furniture('guest-toilet','powder','wall-toilet',[840,328],.37,.54,.45),products:['toilet']},
 {...furniture('guest-basin','powder','wall-basin',[876.6,382],.4,.35,.85,-Math.PI/2),products:['guest-basin','basin-tap'],ordered:true},
 furniture('washing-machine','laundry','washer',[1160,386],.6,.6,.85,-Math.PI/2),furniture('dryer','laundry','washer',[1160,422],.6,.6,.85,-Math.PI/2),
 furniture('terrace-table','terrace','dining',[535,143],1.8,.9,.75),
 {...furniture('outdoor-kitchen','garden','outdoor-kitchen',[297.65,176.08],OUTDOOR_KITCHEN.width,OUTDOOR_KITCHEN.depth,OUTDOOR_KITCHEN.height,Math.PI/2),products:['hercules'],ordered:true}
];
// The plant at the northern/right end of the outdoor kitchen was removed in R08.
export const GARDEN_PLANTS=[
 {id:'west-middle',position:[PLOT[0][0]+.7,6.4],size:1.3},
 {id:'west-south',position:[PLOT[0][0]+.7,14.7],size:1.3},
 {id:'east-south',position:[PLOT[2][0]-.65,PLOT[2][1]-.65],size:1.3},
 {id:'south',position:[8.4,PLOT[2][1]-.65],size:1.3}
];
export const getFurniture=id=>FURNITURE.find(f=>f.id===id);
export function furnitureParts(f){
 if(!f)return [];
 const item=(key,he,en)=>({id:`${f.id}:${key}`,key,he,en});
 if(['wardrobe','office-cabinet'].includes(f.kind))return [item('left','דלת שמאל','Left door'),item('right','דלת ימין','Right door'),item('drawer-0','מגירה עליונה','Upper drawer'),item('drawer-1','מגירה תחתונה','Lower drawer')];
 if(f.kind==='vanity')return [item('left','דלת שמאל','Left door'),item('right','דלת ימין','Right door')];
 if(f.kind==='outdoor-kitchen')return [['sink-left','דלת כיור שמאל','Sink left door'],['sink-right','דלת כיור ימין','Sink right door'],['grill-left','דלת גריל שמאל','Grill left door'],['grill-right','דלת גריל ימין','Grill right door'],['grill-drawer-0','מגירת גריל עליונה','Grill upper drawer'],['grill-drawer-1','מגירת גריל תחתונה','Grill lower drawer'],['storage','דלת אחסון ליד המקרר','Storage beside fridge'],['fridge','דלת המקרר','Fridge door'],['grill-lid','מכסה הגריל','Grill lid']].map(([key,he,en])=>item(key,he,en));
 if(f.kind==='console')return [0,1,2].map(i=>item(`drawer-${i}`,`מגירה ${i+1}`,`Drawer ${i+1}`));
 return [];
}
export const ALL_HOME_PARTS=FURNITURE.flatMap(furnitureParts);
export const HOME_FINISHES=[{id:'ordered-mona',he:'מונה 25×75','en':'Mona 25×75',color:'#c1c4c0',tile:[.75,.25],productId:'wet-wall'},{id:'ivory',he:'שנהב',en:'Ivory',color:'#e9e5db'},{id:'sand',he:'חול',en:'Sand',color:'#ccbfa8'},{id:'sage',he:'מרווה',en:'Sage',color:'#a4b09a'},{id:'clay',he:'חרס',en:'Clay',color:'#c3a28e'},{id:'slate',he:'אפור',en:'Slate',color:'#99a5a7'}];
export const FLOOR_FINISHES=[{id:'ordered-white',he:'שיק לבן מט 100×100',en:'Chic white 100×100',color:'#e8e7e0',tile:[1,1],productId:'dry-floor'},{id:'ordered-wet',he:'קלסיקו אפור 30×30',en:'Classico grey 30×30',color:'#a4a6a3',tile:[.3,.3],productId:'wet-floor'},{id:'ordered-terrace',he:'הביטאט דאון 15×60',en:'Habitat Dawn 15×60',color:'#b2a58e',tile:[.15,.6],productId:'terrace-floor'},{id:'stone',he:'אבן בהירה',en:'Light stone',color:'#d9d3c5'},{id:'oak',he:'אלון',en:'Oak',color:'#b89a73'},{id:'warm',he:'אבן חמה',en:'Warm stone',color:'#c5b39a'}];
export const HOME_DEFAULTS={schema:2,lang:'he',light:'day',cutaway:true,labels:true,furniture:true,pergolaRoof:true,openDoors:['patio'],openParts:[],closedShutters:[],rooms:{},showGarden:true};
export function normalizeHomeSettings(value={}){
 if(!value||typeof value!=='object')value={};
 const validDoors=new Set(DOORS.map(d=>d.id)),validParts=new Set(ALL_HOME_PARTS.map(p=>p.id)),rooms={};
 const current=value.schema===2;
 for(const r of ROOMS){const v=value.rooms?.[r.id]||{},wet=['bathroom','ensuite','powder'].includes(r.id),floorDefault=r.id==='terrace'?'ordered-terrace':wet||r.id==='laundry'?'ordered-wet':'ordered-white';rooms[r.id]={wall:current&&HOME_FINISHES.some(f=>f.id===v.wall)?v.wall:wet?'ordered-mona':HOME_FINISHES.some(f=>f.id===v.wall)?v.wall:'ivory',floor:current&&FLOOR_FINISHES.some(f=>f.id===v.floor)?v.floor:floorDefault,wood:['oak','white','dark'].includes(v.wood)?v.wood:'oak'};}

 return {...HOME_DEFAULTS,lang:value.lang==='en'?'en':'he',light:value.light==='evening'?'evening':'day',cutaway:typeof value.cutaway==='boolean'?value.cutaway:true,labels:value.labels!==false,furniture:value.furniture!==false,pergolaRoof:value.pergolaRoof!==false,openDoors:[...new Set((Array.isArray(value.openDoors)?value.openDoors:HOME_DEFAULTS.openDoors).filter(x=>validDoors.has(x)))],openParts:[...new Set((Array.isArray(value.openParts)?value.openParts:[]).filter(x=>validParts.has(x)))],closedShutters:[...new Set((Array.isArray(value.closedShutters)?value.closedShutters:[]).filter(id=>SHUTTER_IDS.includes(id)))],rooms};
}
export function insidePolygon(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if(((zi>p[1])!==(zj>p[1]))&&p[0]<(xj-xi)*(p[1]-zi)/(zj-zi)+xi)inside=!inside;}return inside;}
export function polygonBounds(poly){return {minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))};}
export function roomAt(p){return ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind)).find(r=>insidePolygon(p,r.polygon))?.id||(insidePolygon(p,GARDEN_LAYOUT.finished)?'terrace':insidePolygon(p,PLOT)&&!insidePolygon(p,HOUSE_OUTLINE)?'garden':'hall');}
const boxForWall=(wall,a,b)=>{const v=Math.abs(wall.a[0]-wall.b[0])<.001;return v?{minX:wall.a[0]-wall.thickness/2,maxX:wall.a[0]+wall.thickness/2,minZ:a,maxZ:b}:{minX:a,maxX:b,minZ:wall.a[1]-wall.thickness/2,maxZ:wall.a[1]+wall.thickness/2};};
export function collisionBoxes(openDoors=[],withFurniture=true,closedShutters=[]){
 const opened=new Set(openDoors),result=[];
 for(const p of GARDEN_LAYOUT.posts)result.push({minX:p.x-p.size/2,maxX:p.x+p.size/2,minZ:p.z-p.size/2,maxZ:p.z+p.size/2,pergolaPostId:p.id});
 for(const w of WALLS){const vertical=Math.abs(w.a[0]-w.b[0])<.001,low=vertical?w.a[1]:w.a[0],high=vertical?w.b[1]:w.b[0];let start=low;
  for(const d of DOORS.filter(d=>d.wallId===w.id&&!d.hostDoorId).sort((a,b)=>a.start-b.start)){
   if(d.start>start)result.push(boxForWall(w,start,d.start));
   const blocked=DOORS.filter(leaf=>leaf.id===d.id||leaf.hostDoorId===d.id).filter(leaf=>!opened.has(leaf.id));
   if(blocked.length)for(const leaf of blocked)result.push({...boxForWall(w,d.start,d.end),doorId:leaf.id});
   else if(d.type==='slider')result.push({...boxForWall(w,(d.start+d.end)/2,d.end),doorId:d.id});
   start=d.end;
  }if(start<high)result.push(boxForWall(w,start,high));
 }
 for(const shutter of SHUTTERS){const o=shutter.opening;if(o.type==='slider'&&closedShutters.includes(shutter.id)){const w=WALLS.find(w=>w.id===o.wallId);result.push({...boxForWall(w,o.start,o.end),shutterId:shutter.id});}}
 const [kx,kz]=KITCHEN_ANCHOR;
 result.push({minX:kx-5.45,maxX:kx,minZ:kz-.62,maxZ:kz,kitchen:true},{minX:kx-.66,maxX:kx,minZ:kz-3.3,maxZ:kz,kitchen:true},{minX:kx-4.62,maxX:kx-2.18,minZ:kz-2.5,maxZ:kz-1.6,kitchen:true});
 if(withFurniture)for(const f of FURNITURE){if(['shower','tv'].includes(f.kind))continue;const rotated=Math.abs(Math.sin(f.rotation))>.5,ww=rotated?f.d:f.w,dd=rotated?f.w:f.d;result.push({minX:f.position[0]-ww/2,maxX:f.position[0]+ww/2,minZ:f.position[1]-dd/2,maxZ:f.position[1]+dd/2,furnitureId:f.id});}
 return result;
}
export function canStand(p,boxes,radius=HOUSE.playerRadius){
 const bounds=polygonBounds(PLOT);if(p[0]<bounds.minX+radius||p[0]>bounds.maxX-radius||p[1]<bounds.minZ+radius||p[1]>bounds.maxZ-radius||insidePolygon(p,PUBLIC_ENTRY))return false;
 for(const b of boxes){const dx=p[0]-Math.max(b.minX,Math.min(b.maxX,p[0])),dz=p[1]-Math.max(b.minZ,Math.min(b.maxZ,p[1]));if(dx*dx+dz*dz<radius*radius)return false;}return true;
}
// When all doors close from a doorway, step to the nearest clear spot rather
// than leave the walking camera trapped inside the newly closed leaf.
export function clearStandingPosition(position,boxes){
 if(canStand(position,boxes))return [...position];
 const step=.05;
 for(let ring=1;ring<=30;ring++){
  const candidates=[];
  for(let dz=-ring;dz<=ring;dz++)for(let dx=-ring;dx<=ring;dx++)if(Math.max(Math.abs(dx),Math.abs(dz))===ring){const p=[position[0]+dx*step,position[1]+dz*step];if(canStand(p,boxes))candidates.push(p);}
  if(candidates.length)return candidates.sort((a,b)=>Math.hypot(a[0]-position[0],a[1]-position[1])-Math.hypot(b[0]-position[0],b[1]-position[1]))[0];
 }
 return null;
}
export function movePlayer(position,delta,boxes){let p=[...position];const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/.06));for(let i=0;i<steps;i++){const x=[p[0]+delta[0]/steps,p[1]];if(canStand(x,boxes))p=x;const z=[p[0],p[1]+delta[1]/steps];if(canStand(z,boxes))p=z;}return p;}

// Grid search uses actual wall and furniture obstacles. Closed doors on a found
// route can then be opened individually; the fixed half of the patio stays solid.
export function findWalkPath(from,to,withFurniture=true){
 const boxes=collisionBoxes(DOORS.map(d=>d.id),withFurniture),bounds=polygonBounds(PLOT),step=.16;
 const cols=Math.ceil((bounds.maxX-bounds.minX)/step),rows=Math.ceil((bounds.maxZ-bounds.minZ)/step);
 const grid=p=>[Math.round((p[0]-bounds.minX)/step),Math.round((p[1]-bounds.minZ)/step)];
 const world=(x,z)=>[bounds.minX+x*step,bounds.minZ+z*step],key=(x,z)=>z*cols+x;
 function nearest(p){const [x,z]=grid(p);for(let r=0;r<10;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const xx=x+dx,zz=z+dz;if(xx>0&&xx<cols-1&&zz>0&&zz<rows-1&&canStand(world(xx,zz),boxes))return [xx,zz];}return null;}
 const a=nearest(from),b=nearest(to);if(!a||!b)return null;
 const parent=new Map(),queue=[a],seen=new Set([key(...a)]);let found=false;
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(x===b[0]&&z===b[1]){found=true;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,k=key(xx,zz);if(xx<=0||zz<=0||xx>=cols-1||zz>=rows-1||seen.has(k)||!canStand(world(xx,zz),boxes))continue;seen.add(k);parent.set(k,[x,z]);queue.push([xx,zz]);}
 }if(!found)return null;
 const cells=[b];let c=b;while(c[0]!==a[0]||c[1]!==a[1]){c=parent.get(key(...c));if(!c)return null;cells.push(c);}cells.reverse();
 const path=cells.map(c=>world(...c));if(canStand(to,boxes))path.push(to);
 return path;
}
export function doorsOnPath(path){return DOORS.filter(d=>{const p=openingPoint(d),w=WALLS.find(w=>w.id===d.wallId);return path.some(q=>Math.abs(q[d.vertical?0:1]-w.a[d.vertical?0:1])<.28&&q[d.vertical?1:0]>d.start-.2&&q[d.vertical?1:0]<d.end+.2);}).map(d=>d.id);}
