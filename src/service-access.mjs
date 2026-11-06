// Page 3, paths 38022-38026: five consecutive nosings at z=-6.12…-7.20,
// spaced 27cm. The upper floor edge is one pitch before the first traced line.
// Six rises end BEFORE either doorway. The 1.05m drop remains an estimate:
// neither the plan nor the lobby video supplies a surveyed elevation.
import clipping from 'polygon-clipping';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {BUILDING_TRACE} from './building-trace.mjs';
import {connectedWallRuns,wallFootprint} from './building-geometry.mjs';
export const SERVICE_DOOR_IDS=['bd-0-4','bd-0-5'];
export const isServiceDoor=(level,id)=>level===0&&SERVICE_DOOR_IDS.includes(id);
export const SERVICE_ACCESS={minX:18.449,maxX:19.749,topZ:-5.85,bottomZ:-7.20,landingZ:-9,depth:1.05,steps:6};
export const SERVICE_ROOM_POLYGONS={pump:[[13.95,-8.05],[17.199,-8.05],[17.199,-9],[18.249,-9],[18.249,-5.35],[13.95,-5.35]],meters:[[19.949,-9],[23.499,-9],[23.499,-5.85],[19.949,-5.85]]};
export const SERVICE_CONNECTOR=[[18.249,-9],[19.949,-9],[19.949,-7.2],[18.249,-7.2]];
export function serviceTreads(){
 const a=SERVICE_ACCESS,pitch=(a.topZ-a.bottomZ)/(a.steps-1);
 return Array.from({length:a.steps-1},(_,i)=>({topZ:a.topZ-i*pitch,bottomZ:a.topZ-(i+1)*pitch,y:-(i+1)*a.depth/a.steps}));
}
// Extend the SAME paired wall runs below lobby level; a second thin polygon
// shell left mismatched ledges and omitted entire door-bearing lower walls.
const lowerRuns=connectedWallRuns(BUILDING_INTERIORS.floors[0],BUILDING_TRACE.floors[0]).filter(w=>{
 const b=wallFootprint(w);
 return b.minX>=13.70&&b.maxX<=23.71&&b.minZ>=-9.31&&b.maxZ<=-5.05;
});
export const serviceLowerWallRuns=()=>lowerRuns;
const inside=([x,z],poly)=>{let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;};
export function serviceFloorHeight(p,level=0){if(level!==0)return null;const a=SERVICE_ACCESS,[x,z]=p;
 if(x>=a.minX&&x<=a.maxX&&z<=a.topZ&&z>=a.landingZ){const pitch=(a.topZ-a.bottomZ)/(a.steps-1);return -a.depth*Math.min(a.steps,Math.floor((a.topZ-z+1e-8)/pitch)+1)/a.steps;}
 if(Object.values(SERVICE_ROOM_POLYGONS).some(poly=>inside(p,poly))||inside(p,SERVICE_CONNECTOR))return -a.depth;
 return null;
}
// Union first: touching/overlapping Shape holes can triangulate over a doorway.
const holes=clipping.union(...[...Object.values(SERVICE_ROOM_POLYGONS),SERVICE_CONNECTOR,[[SERVICE_ACCESS.minX,-9],[SERVICE_ACCESS.maxX+.002,-9],[SERVICE_ACCESS.maxX+.002,SERVICE_ACCESS.topZ],[SERVICE_ACCESS.minX,SERVICE_ACCESS.topZ]]].map(poly=>[poly])).map(rings=>rings[0]);
export const serviceSlabHoles=()=>holes;
export const serviceApproach={minX:18.45,maxX:19.75,minZ:-5.70,maxZ:-4.85};
