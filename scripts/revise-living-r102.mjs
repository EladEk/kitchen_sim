import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {BUILDING,BUILDING_FLOORS} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {connectedWallRuns,wallFootprint} from '../src/building-geometry.mjs';
import {HOUSE_OUTLINE,CONSTRUCTION_WALLS,DOORS,WALLS} from '../src/home-model.mjs';
import {groundPoint,groundAngle,groundFurnitureBoxes} from '../src/ground-apartments.mjs';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from '../src/apartment-furniture-layout.mjs';
import {furnitureContext,placeLiving,footprint} from './neighbour-furniture-tools.mjs';

const config=JSON.parse(readFileSync(new URL('./living-room-zones-r102.json',import.meta.url))),r=BUILDING.registration;
export function registeredLivingGuides(){return BUILDING_FLOORS.flatMap(f=>(config.pages[f.page]||[]).map(g=>{const world=p=>p.map((v,i)=>r.liftWorld[i]+(v*1332/config.referenceWidth-r.sheetLiftPixels[f.page][i]*1332/1250)*r.pdfMetresPerPoint),[x,z,X,Z]=g.rect,polygon=[[x,z],[X,z],[X,Z],[x,Z]].map(world);return {floor:f.level,unit:f.units[g.unitIndex].number,sourcePage:f.page,polygon,anchor:world([(x+X)/2,(z+Z)/2]),allowFloating:!!g.allowFloating};}));}
export function upperLivingContext(guide){const f=BUILDING_FLOORS[guide.floor],source=BUILDING_INTERIORS.floors[f.level],unit=f.units.find(u=>u.number===guide.unit),walls=connectedWallRuns(source,f).map(wallFootprint),sliders=f.envelope.flatMap(e=>e.openings.filter(o=>o.kind==='slider'));return furnitureContext({polygon:unit.polygon,walls,doors:source.doors,sliders}).room(guide.anchor);}
export function groundLivingContext(){const doors=DOORS.filter(d=>!d.hostDoorId).map(d=>{const wall=WALLS.find(w=>w.id===d.wallId),end=d.hinge==='end',at=v=>d.vertical?[wall.a[0],v]:[v,wall.a[1]],hinge=at(end?d.end:d.start),closed=at(end?d.start:d.end),dx=closed[0]-hinge[0],dz=closed[1]-hinge[1],a=(d.swing||-1)*Math.PI*.48;return {hinge,closed,opened:[hinge[0]+dx*Math.cos(a)+dz*Math.sin(a),hinge[1]-dx*Math.sin(a)+dz*Math.cos(a)]};});return furnitureContext({polygon:HOUSE_OUTLINE,walls:CONSTRUCTION_WALLS.map(w=>wallFootprint({...w,width:w.thickness})),doors}).room(config.ground.anchor);}
const rounded=value=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v));
export function reviseLiving(){
 const replacements=new Map(),report=[];
 for(const guide of registeredLivingGuides()){
  const room=upperLivingContext(guide),built=APARTMENT_FURNITURE.filter(a=>a.floor===guide.floor&&a.unit===guide.unit&&!['sofa','coffee','media'].includes(a.kind)).map(a=>a.box),set=placeLiving(room,built,guide);
  if(!set)throw Error('No source-zone living arrangement fits floor '+guide.floor+' unit '+guide.unit);
  const values=set.map(a=>rounded({...a,id:`f${guide.floor}-unit-${guide.unit}-${a.kind}`,floor:guide.floor,unit:guide.unit,sourcePage:guide.sourcePage,seed:guide.anchor,livingZone:guide.polygon,layoutRevision:102}));replacements.set(guide.floor+'|'+guide.unit,values);report.push({floor:guide.floor,unit:guide.unit,sourcePage:guide.sourcePage,zone:guide.polygon,sofa:values[0],floatingMedia:!values[2].wallBacked});
 }
 const baseGuide=config.ground,room=groundLivingContext(),base=placeLiving(room,groundFurnitureBoxes(4),baseGuide);if(!base)throw Error('No source-zone living arrangement fits the standard ground apartment');
 const groundSets=new Map();for(const unit of [1,2,3]){const values=base.map(a=>{const [x,z]=groundPoint(unit,[a.x,a.z]),angle=groundAngle(unit,a.angle),zone=baseGuide.polygon.map(p=>groundPoint(unit,p));return rounded({...a,x,z,angle,box:footprint(x,z,a.w,a.d,angle),id:`ground-${unit}-${a.kind}`,floor:0,unit,sourcePage:3,livingZone:zone,layoutRevision:102});});groundSets.set(unit,values);report.push({floor:0,unit,sofa:values[0],zone:values[0].livingZone});}
 const upper=APARTMENT_FURNITURE.filter(a=>!replacements.has(a.floor+'|'+a.unit)||!['sofa','coffee','media'].includes(a.kind));for(const values of replacements.values())upper.push(...values);
 const ground=GROUND_APARTMENT_FURNITURE.filter(a=>!['sofa','coffee','media'].includes(a.kind));for(const values of groundSets.values())ground.push(...values);
 writeFileSync('src/apartment-furniture-layout.mjs','// Source-registered proposed furniture; R102 living zones reviewed on the original floor plans.\nexport const APARTMENT_FURNITURE='+JSON.stringify(upper)+';\nexport const GROUND_APARTMENT_FURNITURE='+JSON.stringify(ground)+';\n');
 writeFileSync('qa/living-room-review-r102.json',JSON.stringify({revision:102,changed:report.length,unchangedBedroomsAndKitchens:true,report},null,2));console.log(JSON.stringify({updated:report.length,upper:replacements.size,ground:groundSets.size}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)reviseLiving();
