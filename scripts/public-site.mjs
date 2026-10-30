// Build-time allowlist: standard gardens and development-plan geometry only.
// No owner layout, custom fence, shed, car assignment or source documents.
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {SITE_TRACE} from '../src/building-site-trace.mjs';
import {createSiteLayout} from '../public-view/site-layout.mjs';
import {publicGroundCover} from './public-ground-cover.mjs';

const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);};
const boundaryDistance=(p,poly)=>Math.min(...poly.map((a,i)=>distance(p,a,poly[(i+1)%poly.length])));
export function publicSiteData(){
 const floor=BUILDING_FLOORS[0],fences=new Map();
 // Split plot edges at lawn/facade vertices: a shared plot boundary must stop
 // at the facade, rather than extending through the apartment's party wall.
 for(const garden of floor.gardens)for(let i=0;i<garden.plot.length;i++){
  const a=garden.plot[i],b=garden.plot[(i+1)%garden.plot.length],v=[b[0]-a[0],b[1]-a[1]],l2=v[0]**2+v[1]**2;
  if(l2<.0025)continue;
  const at=t=>[a[0]+v[0]*t,a[1]+v[1]*t],cuts=[0,1];
  for(const p of garden.polygon)if(distance(p,a,b)<.04){const t=((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/l2;if(t>0&&t<1)cuts.push(t);}
  cuts.sort((x,y)=>x-y);
  for(let j=1;j<cuts.length;j++){
   const start=at(cuts[j-1]),end=at(cuts[j]),mid=at((cuts[j-1]+cuts[j])/2);
   if(Math.hypot(end[0]-start[0],end[1]-start[1])<.055||boundaryDistance(mid,garden.polygon)>.045)continue;
   if([...floor.units.map(u=>u.polygon),floor.core].some(poly=>boundaryDistance(mid,poly)<.34))continue;
   const key=[start,end].map(p=>p.map(v=>v.toFixed(2)).join(',')).sort().join('|');
   if(fences.has(key)){fences.get(key).units.push(garden.unit);continue;}
   fences.set(key,{a:start,b:end,units:[garden.unit]});
  }
 }
 const data={revision:98,gardens:floor.gardens.map(g=>({unit:g.unit,polygon:g.polygon,plot:g.plot})),fences:[...fences.values()],parking:SITE_TRACE.parking.map(b=>({id:b.id,label:b.label,accessible:b.accessible,polygon:b.polygon})),roads:SITE_TRACE.roads.map(r=>({id:r.id,polygon:r.polygon})),walkable:SITE_TRACE.walkable.map(w=>({id:w.id,polygon:w.polygon})),curbs:SITE_TRACE.curbs.map(c=>({id:c.id,points:c.points})),accuracy:{building4102:'Gardens and adjacent numbered bays retain the source trace. Public district geometry adds the entire plot1410 parking plan (204 numbered bays and N1–N5), registered to the same control.',otherBuildings:'Standard garden template rotated/reflected with each building. Plot1409 parking uses the plot1410 module checked against both official aerials; 1346/1347 courts and external street connections remain aerial reconstructions, not surveyed counts or parking allocations.',heights:'Fence, kerb and landscape heights are illustrative.'}};
 data.groundCover=publicGroundCover(createSiteLayout(data));
 return data;
}
