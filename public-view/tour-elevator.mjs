import {DISTRICT,districtLocation,buildingTransform} from './district.mjs';
import {inside,locationAt} from './navigation.mjs';
import {destinationStandingPose} from './tour-tools.mjs';

export function elevatorAt(position,nav,id){
 const loc=districtLocation(position,nav);if(!loc.building)return null;
 const {floor}=locationAt(loc.position,nav),f=nav.floors[floor],lifts=f?.elevators;if(!lifts?.length)return null;
 const p=loc.position,best=id===undefined?lifts.reduce((a,b)=>Math.hypot(a.position[0]-p.x,a.position[1]-p.z)<Math.hypot(b.position[0]-p.x,b.position[1]-p.z)?a:b):lifts.find(l=>l.id===id);if(!best)return null;const distance=Math.hypot(best.position[0]-p.x,best.position[1]-p.z);
 return {building:loc.building,floor,id:best.id,near:distance<2.4&&inside([p.x,p.z],f.core)};
}
export function elevatorLanding(nav,buildingId,floor,id,world){
 if(!Number.isInteger(floor)||floor<0||floor>8)return null;
 const building=DISTRICT.find(b=>b.id===buildingId),f=nav.floors[floor],lift=f?.elevators?.find(l=>l.id===id);if(!building||!lift)return null;
 for(const offset of [0,.25,-.2,.5]){
  const position=[lift.position[0]+offset,lift.position[1]];if(!inside(position,f.core))continue;
  const destination={id:`elevator:${id}:${floor}`,floor,position,yaw:Math.PI/2},pose=destinationStandingPose(destination,nav,building,world);
  if(pose){const local=pose.position.clone().applyMatrix4(buildingTransform(building).invert());if(inside([local.x,local.z],f.core))return pose;}
 }
 return null;
}
