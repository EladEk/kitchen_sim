import {BUILDING_SITE,BUILDING_FLOORS} from './building-layout.mjs';
import {SITE_TRACE} from './building-site-trace.mjs';
import {polygonContains} from './building-geometry.mjs';
// Generic parked cars and planting are visual illustrations. Bay boundaries,
// counts, numbering, routes and building entrances remain source-defined.
export function parkingCarPlacements(){return ['1','7','14','23','34','43'].flatMap(label=>{const bay=SITE_TRACE.parking.find(b=>b.label===label);if(!bay||bay.accessible)return [];const edges=bay.polygon.map((a,i)=>{const b=bay.polygon[(i+1)%bay.polygon.length];return {a,b,length:Math.hypot(b[0]-a[0],b[1]-a[1])};}).sort((a,b)=>b.length-a.length),long=edges[0],xs=bay.polygon.map(p=>p[0]),zs=bay.polygon.map(p=>p[1]);return [{bayId:bay.id,label,position:[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2],angle:Math.atan2(long.b[0]-long.a[0],long.b[1]-long.a[1]),width:1.72,length:Math.min(4.05,bay.depth-.16),height:1.42,illustrative:true}];});}
export function sitePlantingPositions(){
 const excluded=[...SITE_TRACE.parking,...SITE_TRACE.roads,...SITE_TRACE.walkable,...SITE_TRACE.features.filter(f=>f.polygon),...SITE_TRACE.obstacles].map(f=>f.polygon),floor=BUILDING_FLOORS[0];excluded.push(...floor.envelope.map(e=>e.polygon),...floor.gardens.map(g=>g.plot));
 const result=[];for(const curb of SITE_TRACE.curbs||[])for(let i=1;i<curb.points.length;i++){const a=curb.points[i-1],b=curb.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);for(let distance=1.5;distance<length;distance+=3){const middle=[a[0]+dx/length*distance,a[1]+dz/length*distance];for(const sign of [-1,1]){const p=[middle[0]-dz/length*.7*sign,middle[1]+dx/length*.7*sign];if(!polygonContains(p,BUILDING_SITE)||excluded.some(poly=>polygonContains(p,poly)||[-.4,.4].some(x=>[-.4,.4].some(z=>polygonContains([p[0]+x,p[1]+z],poly)))))continue;if(result.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1.8))continue;result.push(p);}}}return result;
}
