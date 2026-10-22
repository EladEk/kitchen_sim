import {BUILDING_TRACE as T} from './building-trace.mjs';

// Horizontal traces follow the original floor sheets. No elevation/section is
// present: 3.10m storeys, slab thicknesses, sills and roof heads are estimates.
export const BUILDING={number:4102,plot:1410,apartment:4,source:'/house/building-plan.pdf',storey:3.10,clearHeight:2.75,slab:.25,roofHead:2.5,levels:9,heightInferred:true,registration:T.registration};
export const BUILDING_FLOORS=T.floors.map(f=>({...f,elevation:f.level*BUILDING.storey,id:`building-floor-${f.level}`,he:f.level?`קומה ${f.level}`:'קומת קרקע',en:f.level?`Floor ${f.level}`:'Ground floor',image:`/house/building-plan-${f.page}.jpg`,uniqueUnitCount:f.units.filter(u=>f.level!==6||u.number!==32).length}));
export const BUILDING_ROOF={...T.roof,elevation:BUILDING.levels*BUILDING.storey,id:'building-roof',image:'/house/building-plan-11.jpg'};
export const BUILDING_SITE=T.site[0];
export const BUILDING_PHOTOS=[
 {image:'/house/exterior/reference-3.jpg',he:'מסתורי השירות והנסיגות בחזית',en:'Service screens and facade setbacks',source:'exterior-details',page:3},
 {image:'/house/garden/reference-2.jpg',he:'מרפסת קומה ראשונה וחיפוי האבן',en:'First-floor balcony and limestone',source:'garden-design',page:2},
 {image:'/house/garden/reference-3.jpg',he:'מעקות זכוכית, מסגרות ופינות הבניין',en:'Glass rails, frames and building corners',source:'garden-design',page:3}
];
const points=BUILDING_FLOORS.flatMap(f=>f.envelope.flatMap(p=>p.polygon));
export const BUILDING_BOUNDS={minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1])),maxY:BUILDING_ROOF.elevation+BUILDING.roofHead};
export const BUILDING_CENTER=[(BUILDING_BOUNDS.minX+BUILDING_BOUNDS.maxX)/2,BUILDING_BOUNDS.maxY/2,(BUILDING_BOUNDS.minZ+BUILDING_BOUNDS.maxZ)/2];
export function normalizeBuildingLevel(value){return Number.isInteger(value)&&value>=0&&value<=9?value:9;}
export function normalizeTourDestination(value){
 const p=String(value||'').split(':'),floor=Number(p[p[0]==='floor'?1:2]);
 if(Number.isInteger(floor)&&floor>=0&&floor<9){if(p[0]==='floor')return `floor:${floor}`;const unit=Number(p[1]);if(p[0]==='unit'&&BUILDING_FLOORS[floor].units.some(u=>u.number===unit))return `unit:${unit}:${floor}`;}
 return 'unit:4:0';
}
export function buildingLevel(value){const level=normalizeBuildingLevel(value);return level===9?BUILDING_ROOF:BUILDING_FLOORS[level];}
export function buildingCamera(aspect=1,level=9){
 const b=BUILDING_BOUNDS,top=level===9?b.maxY:(level+1)*BUILDING.storey,height=top+.2,c=[BUILDING_CENTER[0],height*.42,BUILDING_CENTER[2]],width=b.maxX-b.minX,depth=b.maxZ-b.minZ;
 const radius=Math.hypot(width,depth,height)/2,fov=(aspect<1?52:44)*Math.PI/180,half=Math.atan(Math.tan(fov/2)*Math.min(1,Math.max(.3,aspect))),distance=radius/Math.sin(half)*1.1;
 const direction=[-.62,.46,.64],n=Math.hypot(...direction);
 return {target:c,position:c.map((x,i)=>x+direction[i]/n*distance),distance};
}
export const BUILDING_ACCURACY={
 planHe:'מתארי הקומות, הנסיגות ותחומי המרפסות נעקבו מתוכניות קומת הקרקע, 1, 2, 3–4, 5, 6, 7, 8 והגג. פתחי החזית זוהו מהפסקות בקווי הקיר ב־PDF. המודל הוא שחזור להמחשה ולא מדידת ביצוע.',
 planEn:'Storey outlines, setbacks and balcony extents are traced from ground, 1, 2, 3–4, 5, 6, 7, 8 and roof plans. Facade opening spans come from wall-line gaps in the PDF. This is an illustrative reconstruction, not an as-built survey.',
 estimateHe:'קירות הפנים ופתחי הדלתות בדירות האחרות נלקחו מקווי ה־PDF. הגימורים בהן ניטרליים להמחשה, ללא שיוך המוצרים של דירה 4. אין חתך גבהים בקובץ: מרווח הקומות 3.10 מ׳, גובהי פתחים ואדנים, פרטי חיפוי ומעקות, פנים תאי המעליות וגובה מבני הגג משוערים. הצילומים מתעדים חלק מהחזיתות בלבד.',
 estimateEn:'Neighbouring interior walls and door openings follow PDF vectors. Their neutral finishes are illustrative, without apartment 4’s product assignments. No height section is supplied: 3.10 m storey rise, opening/sill heights, facade/rail details, elevator cabin finishes and roof-head heights are estimates. Photos cover part of the facades.'
};
