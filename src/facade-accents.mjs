import {BUILDING,BUILDING_FLOORS} from './building-layout.mjs';
import {polygonContains,wallFootprint} from './building-geometry.mjs';
import {unionFacadePanels} from './facade-veneers.mjs';

// Real photos 331893/331894/331895 and earlier garden photos show broad matte
// grey balcony surrounds. Profile sizes and colour are visual estimates; no
// elevation, named product or exact RAL was supplied. Other building copies
// retain the existing 4102-based reconstruction and its rotations/reflections.
export const GREY_FACADE_COLOR='#888b87';
export const GREY_FACADE_ROUGHNESS=.94;
export const FACADE_FRAME={returnWidth:.26,beamHeight:.42,beamDepth:.32,frontOverhang:.16};
const cache=new Map();
const bounds=poly=>({minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))});
export function facadeAccentBays(level){
 if(cache.has(level))return cache.get(level);
 const f=BUILDING_FLOORS[level],bays=[];
 // First six polygons: main sun balconies of the repeating sheets. Extra
 // bedroom and penthouse terraces keep open guards rather than invented walls.
 if(f&&level>=1&&level<=6)for(const [index,poly]of f.balconies.slice(0,6).entries()){
  const b=bounds(poly),north=index<2,west=index===2||index===4;
  const a=north?[b.minX,b.minZ]:[west?b.minX:b.maxX,b.minZ],end=north?[b.maxX,b.minZ]:[west?b.minX:b.maxX,b.maxZ],normal=north?[0,-1]:[west?-1:1,0],length=Math.hypot(end[0]-a[0],end[1]-a[1]),tangent=end.map((v,i)=>(v-a[i])/length);
  bays.push({index,a,b:end,normal,tangent,length,depth:north?b.maxZ-b.minZ:b.maxX-b.minX,sourcePage:f.page});
 }
 cache.set(level,bays);return bays;
}
export function isFacadeAccentFront(level,a,b){return facadeAccentBays(level).some(q=>[a,b].every(p=>{const dx=p[0]-q.a[0],dz=p[1]-q.a[1],along=dx*q.tangent[0]+dz*q.tangent[1];return Math.abs(dx*q.normal[0]+dz*q.normal[1])<.012&&along>=-.012&&along<=q.length+.012;})&&Math.hypot(b[0]-a[0],b[1]-a[1])>.1);}
function returnDepth(f,bay,p){
 const {normal:n,tangent:t,depth}=bay,inside=q=>f.envelope.some(e=>polygonContains(q,e.polygon));
 for(let d=.02;d<=depth+.02;d+=.02)if([-1,1].some(sign=>inside(p.map((v,i)=>v-n[i]*d+t[i]*sign*.14))))return Math.max(0,d-.10);
 return Math.max(0,depth-.10);
}
export function facadeAccentRows(level,{height=BUILDING.storey}={}){
 const f=BUILDING_FLOORS[level],bays=facadeAccentBays(level),returns=[],beams=[],seen=[];
 if(!bays.length)return {returns,beams,bays};
 const base=f.elevation,{returnWidth,beamHeight,beamDepth,frontOverhang}=FACADE_FRAME;
 const row=(a,b,lo,h,thickness)=>[(a[0]+b[0])/2,lo+h/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),h,thickness,-Math.atan2(b[1]-a[1],b[0]-a[0])];
 for(const bay of bays){
  const {a,b,normal:n,tangent:t}=bay;
  const beam=y=>beams.push(row(a.map((v,i)=>v-t[i]*returnWidth/2),b.map((v,i)=>v+t[i]*returnWidth/2),y-beamHeight,beamHeight+.015,beamDepth));
  beam(base);
  const above=facadeAccentBays(level+1).find(q=>q.index===bay.index&&Math.abs(q.normal[0]-n[0])+Math.abs(q.normal[1]-n[1])<.01&&Math.abs((q.a[0]-a[0])*n[0]+(q.a[1]-a[1])*n[1])<.12&&Math.min(q.length,bay.length)/Math.max(q.length,bay.length)>.8);
  if(!above&&height>=BUILDING.storey-.01)beam(base+BUILDING.storey);
  for(const p of [a,b]){
   if(seen.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.012))continue;seen.push(p);
   const depth=returnDepth(f,bay,p);if(depth<.20)continue;
   const start=p.map((v,i)=>v+n[i]*frontOverhang),end=p.map((v,i)=>v-n[i]*depth),h=Math.min(height,BUILDING.storey-beamHeight)-.015;
   if(h>.01)returns.push(row(start,end,base+.015,h,returnWidth));
  }
 }
 return {returns:unionFacadePanels(returns),beams:unionFacadePanels(beams),bays};
}
export function facadeAccentCollision(level){return facadeAccentRows(level).returns.map(([x,y,z,w,h,d,angle])=>{
 const along=[Math.cos(angle),-Math.sin(angle)],a=[x-along[0]*w/2,z-along[1]*w/2],b=[x+along[0]*w/2,z+along[1]*w/2];
 return {...wallFootprint({a,b,width:d}),greyFacade:true,minY:y-h/2,maxY:y+h/2};
});}
