import {DISTRICT,DISTRICT_GROUND,districtPoint,districtFootprint} from './district-layout.mjs';

export const rectangle=(x,z,w,d)=>({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
export const rectanglePolygon=r=>[[r.minX,r.minZ],[r.maxX,r.minZ],[r.maxX,r.maxZ],[r.minX,r.maxZ]];
export const bounds=poly=>({minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1]))});
export const intersects=(a,b,padding=0)=>a.maxX>b.minX-padding+.01&&a.minX<b.maxX+padding-.01&&a.maxZ>b.minZ-padding+.01&&a.minZ<b.maxZ+padding-.01;
export const contains=(r,[x,z])=>x>=r.minX-.001&&x<=r.maxX+.001&&z>=r.minZ-.001&&z<=r.maxZ+.001;
export function inside([x,z],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function subtractRectangles(rect,blockers){
 let result=[rect];for(const b of blockers){const next=[];for(const a of result){if(!intersects(a,b)){next.push(a);continue;}const x0=Math.max(a.minX,b.minX),x1=Math.min(a.maxX,b.maxX),z0=Math.max(a.minZ,b.minZ),z1=Math.min(a.maxZ,b.maxZ);if(a.minX<x0)next.push({...a,maxX:x0});if(x1<a.maxX)next.push({...a,minX:x1});if(a.minZ<z0)next.push({minX:x0,maxX:x1,minZ:a.minZ,maxZ:z0});if(z1<a.maxZ)next.push({minX:x0,maxX:x1,minZ:z1,maxZ:a.maxZ});}result=next;}return result.filter(r=>r.maxX-r.minX>.01&&r.maxZ-r.minZ>.01);
}
export function unionRectangles(rectangles){const result=[];for(const r of rectangles)result.push(...subtractRectangles(r,result));return result;}

export function createSiteLayout(source){
 const gardens=[],fences=[],parking=[],roads=[],sidewalks=[],crossings=[],islands=[];
 for(const b of DISTRICT){
  const transform=p=>districtPoint(p,b);
  for(const g of source.gardens)gardens.push({building:b.id,unit:g.unit,polygon:g.polygon.map(transform),plot:g.plot.map(transform)});
  for(const f of source.fences)fences.push({building:b.id,units:f.units,a:transform(f.a),b:transform(f.b),divider:f.units.length>1});
 }
 const body=DISTRICT.map(b=>districtFootprint(b)),gardenBounds=gardens.map(g=>bounds(g.plot));
 const blocked=r=>body.some(b=>intersects(r,b,.25))||gardenBounds.some(b=>intersects(r,b,.25));
 const road=(id,x,z,w,d,kind='drive')=>{const r={id,...rectangle(x,z,w,d),kind};if(kind==='drive'&&blocked(r))throw Error('Drive lane intersects a garden: '+id);roads.push(r);return r;};
 const first=DISTRICT[0],transform=p=>districtPoint(p,first);
 // The entire numbered 4102 parking arrangement, including 13 touching
 // tandem pairs 20–45 and N1, retains its documented position and dimensions.
 for(const b of source.parking)parking.push({...b,building:'4102',polygon:b.polygon.map(transform),traced:true});
 for(const r of source.roads)roads.push({id:r.id,...bounds(r.polygon.map(transform)),kind:'drive',traced:true});
 for(const w of source.walkable)sidewalks.push({id:w.id,polygon:w.polygon.map(transform),traced:true});
 const {west,east,north,south,promenadeX,parkingAisleX}=DISTRICT_GROUND,midX=(west+east)/2,midZ=(north+south)/2;
 for(const x of [west,east])road('street-'+x,x,midZ,12,south-north+12,'street');
 for(const z of [north,south])road('street-'+z,midX,z,east-west+12,12,'street');
 road('west-parking-spine',parkingAisleX,80,6.2,208);
 road('source-lane-spine-join',46.5,23.1,6.2,36);
 road('west-entrance',(-34-16.7)/2,23.48,17.3,6.2);
 // Separate drives connect the parking courts to a continuous spine. They
 // finish before the pedestrian promenade and never run through the gardens.
 for(const z of [35,76,116])road('west-court-'+z,(46.5+102)/2,z,102-46.5,6.2);
 road('central-court-loop',103,(35+116)/2,6.2,116-35);
 road('east-court-access',(112+186)/2,60,74,6.2);
 for(const x of [130,160])road('east-front-spine-'+x,x,(127+184)/2,6.2,184-127);
 road('east-front-loop',145,127,36.2,6.2);
 road('east-front-entrance',(112+186)/2,165,74,6.2);

 const addBay=(id,polygon,extra={})=>{const r=bounds(polygon);if(blocked(r)||roads.some(road=>intersects(r,road))||parking.some(b=>intersects(r,bounds(b.polygon))))return false;parking.push({id,polygon,accessible:false,derived:true,...extra});return true;};
 // Repeated west-side tandem modules use the base template, but labels are
 // only retained for the actual source-plan locations beside 4102.
 for(const b of DISTRICT.filter(b=>['4101','4093','4092'].includes(b.id))){
  for(const bay of source.parking.filter(v=>Number(v.label)>=20))addBay(b.id+'-'+bay.id,bay.polygon.map(p=>districtPoint(p,b)),{building:b.id,tandem:true});
  const end=43.40178+b.x;
  if(end<43.39)road('tandem-apron-'+b.id,(end+43.4)/2,(-5.325+ b.z),43.4-end,33.6);
 }
 // A bay mouth is always on an aisle; no second row is inserted between the
 // documented tandem pairs. Generic courts have 2.5m x 5m standard bays.
 for(let z=-21;z<175;z+=2.6)addBay('spine-'+z.toFixed(1),rectanglePolygon(rectangle(52.1,z,5,2.5)));
 for(const [z,direction] of [[35,1],[76,-1],[76,1],[116,-1]])for(let x=60.5;x<101;x+=2.6)addBay('west-'+z+'-'+direction+'-'+x.toFixed(1),rectanglePolygon(rectangle(x,z+direction*5.6,2.5,5)));
 for(const direction of [-1,1])for(let x=124;x<172;x+=2.6)addBay('east-rear-'+direction+'-'+x.toFixed(1),rectanglePolygon(rectangle(x,60+direction*5.6,2.5,5)));
 for(const x of [130,160])for(const direction of [-1,1])for(let z=133;z<175;z+=2.6)addBay('east-front-'+x+'-'+direction+'-'+z.toFixed(1),rectanglePolygon(rectangle(x+direction*5.6,z,5,2.5)));

 const addWalk=(id,x,z,w,d)=>{for(const [i,r] of subtractRectangles(rectangle(x,z,w,d),roads).entries())sidewalks.push({id:id+'-'+i,polygon:rectanglePolygon(r)});};
 for(const x of [west+9,east-9])addWalk('perimeter-walk-'+x,x,midZ,4,south-north-12);
 for(const z of [north+9,south-9])addWalk('perimeter-walk-'+z,midX,z,east-west-12,4);
 addWalk('green-promenade',promenadeX,midZ,4,south-north-12);
 for(const z of [29,69.5,122])addWalk('court-footway-'+z,(56+112)/2,z,56,1.8);
 for(const z of [43,77,124])addWalk('east-footway-'+z,(112+176)/2,z,64,1.8);
 // Sidewalks are cut at every driveway; zebra paint lies on the continuous
 // asphalt so raised kerbs do not seal a car-park entrance.
 for(const [x,z,axis] of [[west+9,23.48,'x'],[promenadeX,60,'x'],[promenadeX,165,'x'],[parkingAisleX,south-9,'z'],[130,south-9,'z'],[160,south-9,'z']])crossings.push({x,z,axis});
 for(const [x,z,w,d] of [[79,53,41,3],[79,94,41,3],[143,46,44,2.2],[157,144,2,26]]){const r=rectangle(x,z,w,d);if(!blocked(r)&&!roads.some(a=>intersects(r,a))&&!parking.some(b=>intersects(r,bounds(b.polygon))))islands.push(r);}
 const union=unionRectangles(roads),curbs=[];
 // Split edges at exact road/bay boundaries, so no short kerb fragments
 // intrude into an open bay mouth or across a driveway.
 const paved=p=>roads.some(r=>contains(r,p))||parking.some(b=>inside(p,b.polygon));
 const edges=[...roads,...parking.map(b=>bounds(b.polygon))];
 for(const r of union)for(const [a,b] of [[[r.minX,r.minZ],[r.maxX,r.minZ]],[[r.maxX,r.minZ],[r.maxX,r.maxZ]],[[r.maxX,r.maxZ],[r.minX,r.maxZ]],[[r.minX,r.maxZ],[r.minX,r.minZ]]]){
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*.11,nz=dx/len*.11,cuts=[0,1],horizontal=Math.abs(dx)>.01;
  for(const q of edges){if(horizontal&&a[1]>=q.minZ-.12&&a[1]<=q.maxZ+.12)for(const x of [q.minX,q.maxX]){const t=(x-a[0])/dx;if(t>0&&t<1)cuts.push(t);}else if(!horizontal&&a[0]>=q.minX-.12&&a[0]<=q.maxX+.12)for(const z of [q.minZ,q.maxZ]){const t=(z-a[1])/dz;if(t>0&&t<1)cuts.push(t);}}
  cuts.sort((x,y)=>x-y);let start=null;
  for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i];if((hi-lo)*len<.005)continue;const mid=[a[0]+dx*(lo+hi)/2,a[1]+dz*(lo+hi)/2],edge=paved([mid[0]+nx,mid[1]+nz])!==paved([mid[0]-nx,mid[1]-nz]);if(edge&&start===null)start=lo;if(start!==null&&(!edge||i===cuts.length-1)){const end=edge?hi:lo;if((end-start)*len>.02)curbs.push({a:[a[0]+dx*start,a[1]+dz*start],b:[a[0]+dx*end,a[1]+dz*end]});start=null;}}
 }
 return {revision:90,gardens,fences,parking,roads,roadSurfaces:union,sidewalks,crossings,islands,curbs,bounds:{west:west-8,east:east+8,north:north-55,south:south+8}};
}
