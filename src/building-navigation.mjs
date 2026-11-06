import {apartmentFurnitureBoxes} from './apartment-furniture-scene.js';
import {facadeAccentCollision} from './facade-accents.mjs';
import {laundryScreens} from './laundry-screens.mjs';
import {LOBBY_BENCHES} from './lobby-reference.mjs';
import {COMMON_SPACES,commonSpace,PUMP_OBSTACLES} from './common-spaces.mjs';
import {serviceFloorHeight,isServiceDoor} from './service-access.mjs';
import {RESIDENTS_CLUB,clubWindowProfile,isClubDestination,inResidentsClub} from './residents-club.mjs';
import {connectedWallRuns,exposedBalconySegments,wallFootprint,duplexFlightRails,duplexLandingGuards} from './building-geometry.mjs';
import {BUILDING,BUILDING_FLOORS,BUILDING_SITE} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {duplexForUnit,duplexOnFloor,duplexStair} from './building-duplexes.mjs';
import {HOUSE,HOUSE_OUTLINE,PLOT,ENTRANCE_SERVICES,ROOMS,collisionBoxes,roomAt} from './home-model.mjs';
import {liftIsOpen,carContains} from './elevator-model.mjs';
import {groundFurnitureBoxes} from './ground-apartments.mjs';
import {sitePolygons,siteCollisionBoxes,COMMON_ENTRY_DOORS} from './building-site.mjs';

export const interiorsForFloor=level=>BUILDING_INTERIORS.floors[Math.max(0,Math.min(8,Math.round(level)))];
export function inPolygon([x,z],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function segmentDistance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0;return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);}
export function onDetailedGround(p){const e=ENTRANCE_SERVICES.context;return inPolygon(p,HOUSE_OUTLINE)||HOUSE_OUTLINE.some((a,i)=>segmentDistance(p,a,HOUSE_OUTLINE[(i+1)%HOUSE_OUTLINE.length])<.23)||p[0]>e.minX-.05&&p[0]<e.maxX+.05&&p[1]>e.minZ-.05&&p[1]<e.maxZ+.05;}
export function segmentBox(a,b,width=.12,extra={}){return {minX:Math.min(a[0],b[0])-width/2,maxX:Math.max(a[0],b[0])+width/2,minZ:Math.min(a[1],b[1])-width/2,maxZ:Math.max(a[1],b[1])+width/2,...extra};}
export const buildingDoor=id=>[...BUILDING_INTERIORS.floors.flatMap(f=>f.doors),...COMMON_ENTRY_DOORS].find(d=>d.id===id);
export function isDoorOpening(a,b,source){const mid=a.map((n,i)=>(n+b[i])/2);return [...source.doors,...(source===interiorsForFloor(0)?COMMON_ENTRY_DOORS:[])].some(d=>segmentDistance(mid,d.hinge,d.closed)<.43);}
export function gardenFenceEdge(a,b,f=BUILDING_FLOORS[0]){const mid=a.map((n,i)=>(n+b[i])/2);return ![...f.units.map(u=>u.polygon),f.core].some(poly=>poly.some((c,j)=>segmentDistance(mid,c,poly[(j+1)%poly.length])<.34));}
export function buildingBoxes(level,settings,cars=[]){
 const f=BUILDING_FLOORS[level],source=interiorsForFloor(level),boxes=[...facadeAccentCollision(level)];
 for(const s of laundryScreens(level))boxes.push(segmentBox(s.a,s.b,.105,{laundryScreen:s.id}));
 if(settings.furniture!==false)boxes.push(...apartmentFurnitureBoxes(level));
 for(const w of connectedWallRuns(source,f,level===0?COMMON_ENTRY_DOORS:[])){const ownership=w.sourceWallIndex==null?w:source.walls[w.sourceWallIndex],mid=ownership.a.map((n,i)=>(n+ownership.b[i])/2);if(level===0&&onDetailedGround(mid))continue;boxes.push({...wallFootprint(w),sourceWall:true});}
 for(const path of f.envelope)for(const o of path.openings){const mid=o.a.map((n,i)=>(n+o.b[i])/2);if(level===0&&onDetailedGround(mid)||isDoorOpening(o.a,o.b,source))continue;const edge=path.polygon[o.edge],next=path.polygon[(o.edge+1)%path.polygon.length],projection=p=>(p[0]-edge[0])*(next[0]-edge[0])+(p[1]-edge[1])*(next[1]-edge[1]),start=projection(o.a)<projection(o.b)?o.a:o.b;boxes.push(segmentBox(!clubWindowProfile(level,o)&&o.kind==='slider'?start:o.a,!clubWindowProfile(level,o)&&o.kind==='slider'?mid:o.b,.09,{window:true}));}
 for(const door of source.doors){if(level===0&&onDetailedGround(door.hinge))continue;const closed=settings.closedBuildingDoors?.includes(door.id);if(closed||isServiceDoor(level,door.id))boxes.push(segmentBox(door.hinge,closed?door.closed:door.opened,.06,{buildingDoorId:door.id}));}
 // Guard every exposed balcony edge; walking must not step off an upper slab.
 for(const {a,b} of exposedBalconySegments(f))boxes.push(segmentBox(a,b,.06,{guardrail:true}));
 for(const lift of source.lifts){if(!liftIsOpen(cars[lift.id],level)){const [x,z]=lift.doorCenter;boxes.push(segmentBox([x+.01,z-.68],[x+.01,z+.68],.08,{liftDoor:true}));}}
 const stair=source.stairs.rect,[a,b]=stair,mx=(a[0]+b[0])/2;
 boxes.push({minX:mx-.12,maxX:mx+.12,minZ:a[1]+1.48,maxZ:b[1]-1.05,stairRail:true});
 const duplex=duplexOnFloor(level),privateStair=duplexStair(duplex);
 if(privateStair)for(const r of duplexFlightRails(privateStair,BUILDING.storey))boxes.push(segmentBox([r.a[0],r.a[2]],[r.b[0],r.b[2]],.04,{duplexGuard:true,minY:duplex.entryFloor*BUILDING.storey+Math.min(r.a[1],r.b[1]),maxY:duplex.entryFloor*BUILDING.storey+Math.max(r.a[1],r.b[1])+1.1}));
 if(level===duplex?.upperFloor)for(const r of duplexLandingGuards(privateStair))boxes.push(segmentBox(r.a,r.b,.04,{duplexGuard:true,duplexLandingGuard:true,minY:level*BUILDING.storey,maxY:level*BUILDING.storey+1.1}));
 if(level===0)for(const garden of f.gardens||[]){if(garden.unit===4)continue;garden.plot.forEach((a,i)=>{const b=garden.plot[(i+1)%garden.plot.length];if(!gardenFenceEdge(a,b,f))return;boxes.push(segmentBox(a,b,.05,{gardenFence:true}));});}
 if(level===0)boxes.push(...collisionBoxes(settings.openDoors,settings.furniture,settings.closedShutters,settings.openParts,settings.furnitureLayout,settings.yardDesign));
 if(level===0&&settings.furniture!==false)for(const unit of [1,2,3])boxes.push(...groundFurnitureBoxes(unit));
 if(level===0)boxes.push({...RESIDENTS_CLUB.cabinet,clubCabinet:true},...siteCollisionBoxes(),...PUMP_OBSTACLES,...LOBBY_BENCHES.map(b=>({...b,lobbyBench:true})));
 if(level===0)for(const d of COMMON_ENTRY_DOORS)if(settings.closedBuildingDoors?.includes(d.id))boxes.push(segmentBox(d.hinge,d.closed,.06,{buildingDoorId:d.id}));
 return boxes;
}
export function buildingCanStand(p,level,boxes,cars=[],radius=HOUSE.playerRadius,feetY=level*BUILDING.storey){
 const f=BUILDING_FLOORS[level];if(!f||!p.every(Number.isFinite))return false;
 const domains=level===0?[BUILDING_SITE,PLOT,...(f.gardens||[]).map(g=>g.plot),...sitePolygons()]:[...f.envelope.map(p=>p.polygon),...f.balconies];
 if(!domains.some(poly=>inPolygon(p,poly)||poly.some((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length])<.18)))return false;
 for(const lift of interiorsForFloor(level).lifts){if(carContains(lift,p,-.02)&&!liftIsOpen(cars[lift.id],level))return false;}
 for(const b of boxes){
  if(b.walkableSurface)continue;
  // A guard at the upper landing must not become an invisible wall across
  // the lower flight. Keep both the sloping rail and landing guards physical.
  if(b.minY!=null&&(feetY+HOUSE.eyeHeight+.12<b.minY||feetY>b.maxY+.02))continue;
  const dx=p[0]-Math.max(b.minX,Math.min(b.maxX,p[0])),dz=p[1]-Math.max(b.minZ,Math.min(b.maxZ,p[1]));if(dx*dx+dz*dz<radius*radius)return false;
 }
 return true;
}
export function moveBuildingPlayer(position,delta,level,boxes,cars,feetY=level*BUILDING.storey){
 let p=[...position];const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/.055));
 const height=p=>typeof feetY==='function'?feetY(p):feetY;
 for(let i=0;i<steps;i++){const x=[p[0]+delta[0]/steps,p[1]];if(buildingCanStand(x,level,boxes,cars,HOUSE.playerRadius,height(x)))p=x;const z=[p[0],p[1]+delta[1]/steps];if(buildingCanStand(z,level,boxes,cars,HOUSE.playerRadius,height(z)))p=z;}
 return p;
}
function privateStairPose(previous,next,floor,journey){
 const duplex=duplexOnFloor(floor),stair=duplexStair(duplex),pose=duplexPose(next,floor);if(!stair||!pose)return null;
 const active=journey?.kind==='duplex'&&journey.unit===duplex.unit,[a,b]=stair.longFlightRect,[c,e]=stair.shortFlightRect;
 const lowerEntry=floor===duplex.entryFloor&&previous[1]>=b[1]-.08&&previous[0]>=a[0]&&previous[0]<=b[0];
 const upperEntry=floor===duplex.upperFloor&&previous[0]<=c[0]+.08&&previous[1]>=c[1]&&previous[1]<=e[1];
 return active||lowerEntry||upperEntry?pose:null;
}
// Update storey and height at each small movement step, including at ×3 speed.
// The private-stair journey starts only at its two ends, never over a guard.
export function moveBuildingWalker(position,delta,state,getBoxes,cars=[]){
 let p=[...position],floor=state.floor,baseY=state.baseY??floor*BUILDING.storey,journey=state.stair??null;
 const steps=Math.max(1,Math.ceil(Math.hypot(...delta)/.04)),part=delta.map(n=>n/steps);
 for(let i=0;i<steps;i++){
  const height=next=>privateStairPose(p,next,floor,journey)?.y??baseY;
  const next=moveBuildingPlayer(p,part,floor,getBoxes(floor),cars,height),duplex=privateStairPose(p,next,floor,journey),common=duplex?null:stairPose(next,floor,journey?.kind==='duplex'?null:journey);
  if(common?.blocked)break;
  if(duplex){baseY=duplex.y;floor=duplex.floor;journey={kind:'duplex',unit:duplex.unit};}
  else if(common){baseY=common.y;floor=common.floor;journey=common.base===null?null:common;}
  else{journey=null;baseY=serviceFloorHeight(next,floor)??floor*BUILDING.storey;}
  p=next;
 }
 return {position:p,floor,baseY,stair:journey};
}
export function clearBuildingPosition(at,level,boxes,cars,feetY=level*BUILDING.storey){
 if(buildingCanStand(at,level,boxes,cars,HOUSE.playerRadius,feetY))return [...at];
 for(let r=.08;r<4;r+=.08)for(let i=0;i<32;i++){const p=[at[0]+Math.cos(i*Math.PI/16)*r,at[1]+Math.sin(i*Math.PI/16)*r];if(buildingCanStand(p,level,boxes,cars,HOUSE.playerRadius,feetY))return p;}
 return null;
}
export function parseDestination(value='unit:4:0'){
 if(commonSpace(value))return {floor:0,unit:null,common:commonSpace(value).id};
 const parts=String(value).split(':'),floor=Number(parts[parts[0]==='floor'?1:2]);
 if(Number.isInteger(floor)&&floor>=0&&floor<=8){if(parts[0]==='floor')return {floor,unit:null};const unit=Number(parts[1]);if(BUILDING_FLOORS[floor].units.some(u=>u.number===unit))return {floor,unit};}
 return {floor:0,unit:4};
}
export function destinationStart(destination,settings,cars){
 const target=parseDestination(destination),unit=target.unit,duplex=duplexForUnit(unit,target.floor),floor=duplex?.entryFloor??target.floor,source=interiorsForFloor(floor),boxes=buildingBoxes(floor,settings,cars);
 if(commonSpace(destination)){const c=commonSpace(destination);return {position:clearBuildingPosition(c.walk,0,boxes,cars)||c.walk,floor:0,yaw:c.yaw};}
 if(unit===4&&floor===0){const p=clearBuildingPosition(ROOMS[0].walk,floor,boxes,cars);return {position:p||ROOMS[0].walk,floor,yaw:Math.PI};}
 const entry=source.entries.find(e=>e.unit===unit),door=source.doors.find(d=>d.id===entry?.doorId);
 let at,yaw;
 if(door){const midpoint=door.hinge.map((n,i)=>(n+door.closed[i])/2),normal=door.opened.map((n,i)=>(n-door.hinge[i])/(Math.hypot(...door.opened.map((x,k)=>x-door.hinge[k]))||1));at=midpoint.map((n,i)=>n+normal[i]*.85);yaw=Math.atan2(-normal[0],-normal[1]);}
 else{const lift=source.lifts[0];at=[lift.doorCenter[0]+1.1,lift.doorCenter[1]];yaw=Math.PI/2;}
 return {position:clearBuildingPosition(at,floor,boxes,cars)||at,floor,yaw};
}
export function buildingLocation(p,floor){
 const f=BUILDING_FLOORS[floor],unit=f.units.find(u=>inPolygon(p,u.polygon))?.number||(floor===0?(f.gardens||[]).find(g=>inPolygon(p,g.plot))?.unit:null)||null;
 return {floor,unit,common:floor===0?(inResidentsClub(p)?'club':COMMON_SPACES.find(c=>c.id!=='club'&&inPolygon(p,c.polygon))?.id||null):null,roomId:floor===0&&(unit===4||inPolygon(p,PLOT))?roomAt(p):null};
}
export function nearbyLift(p,floor,cars){
 const source=interiorsForFloor(floor);
 const inside=source.lifts.find(l=>carContains(l,p));
 if(inside)return {id:inside.id,inside:true,floor,car:cars[inside.id]};
 const closest=source.lifts.map(l=>({id:l.id,distance:Math.hypot(p[0]-l.doorCenter[0],p[1]-l.doorCenter[1])})).sort((a,b)=>a.distance-b.distance)[0];
 return closest?.distance<2.05?{id:closest.id,inside:false,floor,car:cars[closest.id]}:null;
}
// The PDF determines the two flight directions and enclosure. Storey rise is
// the same explicit height estimate as the rest of the building model.
export function stairPose(p,floor,journey=null){
 const [a,b]=interiorsForFloor(floor).stairs.rect;
 if(p[0]<a[0]||p[0]>b[0]||p[1]<a[1]||p[1]>b[1])return null;
 const mid=(a[0]+b[0])/2,n=a[1]+1.55,s=b[1]-1.14,west=p[0]<mid;
 if(p[1]<n-.01){const reached=journey&&journey.base!==null?(west?journey.base:journey.base+1):floor;return {base:null,y:reached*BUILDING.storey,floor:reached};}
 const base=journey?.base??(west?floor:floor-1);
 if(base<0||base>=8)return {base:null,y:floor*BUILDING.storey,floor,blocked:true};
 const t=Math.max(0,Math.min(1,(p[1]-n)/(s-n))),rise=west?t/2:1-t/2;
 return {base,y:(base+rise)*BUILDING.storey,floor:p[1]<n+.03?(west?base:base+1):floor};
}
export function duplexPose(p,floor){
 const duplex=duplexOnFloor(floor),d=duplexStair(duplex);if(!d)return null;
 const lower=duplex.entryFloor,upper=duplex.upperFloor;
 const contains=([a,b],pad=0)=>p[0]>=a[0]-pad&&p[0]<=b[0]+pad&&p[1]>=a[1]-pad&&p[1]<=b[1]+pad;
 const [a,b]=d.longFlightRect,[c,e]=d.shortFlightRect;
 if(contains(d.longFlightRect,.035)){const t=Math.max(0,Math.min(1,(b[1]-p[1])/(b[1]-a[1])));return {y:(lower+t*.75)*BUILDING.storey,floor:p[1]>b[1]-.08?lower:floor,unit:duplex.unit};}
 if(contains(d.cornerLandingRect,.035))return {y:(lower+.75)*BUILDING.storey,floor,unit:duplex.unit};
 if(contains(d.shortFlightRect,.10)){const t=Math.max(0,Math.min(1,(e[0]-p[0])/(e[0]-c[0])));return {y:(lower+.75+t*.25)*BUILDING.storey,floor:p[0]<c[0]+.08?upper:floor,unit:duplex.unit};}
 return null;
}
