import {ELECTRICAL_LAYOUT,WATER_LAYOUT,KITCHEN_ANCHOR} from './home-model.mjs';
import {localKitchenWater} from './home-water.mjs';
import {electricalPlanMarkers,ELECTRICAL_REFERENCES} from './home-electrical.mjs';

// In the whole-house scene the detailed kitchen is placed at KITCHEN_ANCHOR
// and rotated pi. Apply exactly its inverse, in metres, to the same observations.
// Source IDs, source rectangles and estimated elevations remain unchanged.
export const KITCHEN_ELECTRICAL_POINTS=ELECTRICAL_LAYOUT.points.filter(p=>p.roomId==='kitchen').map(p=>({
 ...p,homePosition:[...p.position],position:[KITCHEN_ANCHOR[0]-p.position[0],p.position[1],KITCHEN_ANCHOR[1]-p.position[2]],normal:[-p.normal[0],-p.normal[1]],wall:p.displayWall||(p.vertical?'short':'long'),
 ...(p.observedPosition?{observedHomePosition:[...p.observedPosition],observedPosition:[KITCHEN_ANCHOR[0]-p.observedPosition[0],p.observedPosition[1],KITCHEN_ANCHOR[1]-p.observedPosition[2]]}:{}),
 ...(p.inspectionOffset?{inspectionOffset:[-p.inspectionOffset[0],p.inspectionOffset[1],-p.inspectionOffset[2]]}:{})
}));
export const KITCHEN_WATER_POINTS=localKitchenWater(WATER_LAYOUT.points,KITCHEN_ANCHOR);
export const KITCHEN_SERVICE_POINTS=[...KITCHEN_ELECTRICAL_POINTS,...KITCHEN_WATER_POINTS];
export const KITCHEN_ELECTRICAL_PHOTOS=ELECTRICAL_REFERENCES.filter(r=>KITCHEN_SERVICE_POINTS.some(p=>p.evidence.some(e=>e.page===r.page)));
export const kitchenElectricalPoint=id=>KITCHEN_SERVICE_POINTS.find(p=>p.id===id);
export const kitchenElectricalMarkers=()=>electricalPlanMarkers(KITCHEN_ELECTRICAL_POINTS);
export const kitchenElectricalElevation=wall=>KITCHEN_ELECTRICAL_POINTS.filter(p=>p.wall===wall).map(p=>({point:p,x:wall==='long'?p.position[0]*1000:3300-p.position[2]*1000,y:2600-p.height*1000}));

// Keep the selected ID, wall and real-photo evidence together. A photo cannot
// claim to show a point for which it has no source rectangle.
export function kitchenElectricalSelection(id,page){
 const point=kitchenElectricalPoint(id)||KITCHEN_ELECTRICAL_POINTS[0];
 const sourcePage=point.evidence.some(e=>e.page===page)?page:point.page;
 return {point,page:sourcePage,wall:point.wall,source:ELECTRICAL_REFERENCES.find(r=>r.page===sourcePage)};
}
export function kitchenElectricalPageSelection(id,page){
 const point=kitchenElectricalPoint(id),onPage=KITCHEN_SERVICE_POINTS.filter(p=>p.evidence.some(e=>e.page===page));
 return kitchenElectricalSelection(onPage.some(p=>p.id===point?.id)?point.id:onPage[0]?.id,page);
}

export function kitchenElectricalFocusSettings(settings,id){
 const point=kitchenElectricalPoint(id);if(!point)return settings;
 return {...settings,selected:null,showElectrical:true,view:'perspective',...(point.water?{showWater:true}:{}),...(point.relocation?{openParts:[...new Set([...settings.openParts,point.relocation.accessPart])]}:{})};
}
