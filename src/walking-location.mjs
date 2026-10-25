import {BUILDING_FLOORS} from './building-layout.mjs';
import {parseDestination} from './building-navigation.mjs';
import {polygonContains} from './building-geometry.mjs';

// The live pose wins over the selected destination, including a null unit
// when the walker leaves an apartment for a landing or other common space.
export function walkingLocation(position,context,destination){
 const live=position??context,target=parseDestination(destination),floor=Number.isInteger(live?.floor)&&BUILDING_FLOORS[live.floor]?live.floor:target.floor;
 const unit=live?live.unit:target.unit;
 return {floor,unit:BUILDING_FLOORS[floor].units.some(u=>u.number===unit)?unit:null,common:live?.common??null,lift:context?.lift?.inside?context.lift:null,ready:!!live};
}
export function floorLabelPoint(polygon){
 const centre=polygon.reduce((s,p)=>s.map((v,i)=>v+p[i]/polygon.length),[0,0]);if(polygonContains(centre,polygon))return centre;
 const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);let best=null,distance=Infinity;
 for(let x=Math.min(...xs)+.3;x<Math.max(...xs);x+=.5)for(let z=Math.min(...zs)+.3;z<Math.max(...zs);z+=.5)if(polygonContains([x,z],polygon)){const d=Math.hypot(x-centre[0],z-centre[1]);if(d<distance){best=[x,z];distance=d;}}
 return best||polygon[0];
}
