import plot1410 from './plot1410-layout.json' with {type:'json'};
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
 const context=source.context||{buildings:[],drives:[],parkingCourts:[],walks:[],crossings:[],trees:[]};
 for(const b of DISTRICT){
  const transform=p=>districtPoint(p,b);
  for(const g of source.gardens)gardens.push({building:b.id,unit:g.unit,polygon:g.polygon.map(transform),plot:g.plot.map(transform)});
  for(const f of source.fences)fences.push({building:b.id,units:f.units,a:transform(f.a),b:transform(f.b),divider:f.units.length>1});
 }
 const body=DISTRICT.map(b=>districtFootprint(b)),gardenBounds=gardens.map(g=>bounds(g.plot));
 const blocked=r=>body.some(b=>intersects(r,b,.25))||gardenBounds.some(b=>intersects(r,b,.25));
 const road=(id,x,z,w,d,kind='drive')=>{const r={id,...rectangle(x,z,w,d),kind};if(kind==='drive'&&blocked(r))throw Error('Drive lane intersects a garden: '+id);roads.push(r);return r;};
 for(const r of context.drives){const [x0,x1,z0,z1]=r.bounds;road(r.id,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0);}
 for(const r of context.walks){const [minX,maxX,minZ,maxZ]=r.bounds;sidewalks.push({id:r.id,polygon:rectanglePolygon({minX,maxX,minZ,maxZ}),context:true,derived:true});}
 if(context.buildings.length){sidewalks.push({id:'education-pedestrian-approach',polygon:rectanglePolygon({minX:110.6,maxX:113.4,minZ:175,maxZ:195.5}),context:true,derived:true});crossings.push(...context.crossings);}
 const first=DISTRICT[0],transform=p=>districtPoint(p,first);
 // The entire numbered 4102 parking arrangement, including 13 touching
 // tandem pairs 20–45 and N1, retains its documented position and dimensions.
 for(const b of source.parking)parking.push({...b,building:'4102',polygon:b.polygon.map(transform),traced:true});
 
 for(const bay of plot1410.parking)parking.push({...bay,building:undefined});
 for(const r of plot1410.roads)for(const [i,piece] of subtractRectangles(bounds(r.polygon),[...gardenBounds,...parking.map(b=>bounds(b.polygon))]).entries())roads.push({...r,...piece,id:r.id+'-'+i});
 for(const w of plot1410.walkable)sidewalks.push(w);
 for(const poly of plot1410.islands)islands.push({...bounds(poly),traced:true});
 for(const b of DISTRICT)for(const w of source.walkable)sidewalks.push({id:b.id+'-'+w.id,building:b.id,polygon:w.polygon.map(p=>districtPoint(p,b)),traced:b.id==='4102',derived:b.id!=='4102'});
 const {west,east,north,south,promenadeX,parkingAisleX}=DISTRICT_GROUND,midX=(west+east)/2,midZ=(north+south)/2;
 for(const x of [west,east])road('street-'+x,x,midZ,12,south-north+12,'street');
 for(const z of [north,south])road('street-'+z,midX,z,east-west+12,12,'street');
 road('west-parking-spine',parkingAisleX,(70.2+184)/2,6.2,184-70.2);
 
 road('west-entrance',(west-18)/2,23.48,-18-west,6.2);
 // The southern court is reconstructed from the measured parking module
 // and both official aerials. It carries no official numbers/allocations.
 const addBay=(id,polygon,extra={})=>{const r=bounds(polygon);if(blocked(r)||roads.some(road=>intersects(r,road))||parking.some(b=>intersects(r,bounds(b.polygon))))return false;parking.push({id,polygon,accessible:false,derived:true,...extra});return true;};
 const northernBays=parking.slice(),reflect=([x,z])=>[x,149.1-z];
 for(const bay of northernBays)addBay('1409-reconstruction-'+bay.id,bay.polygon.map(reflect),{basis:'1410 module and official aerials',tandem:bay.tandem,accessible:false});
 for(const r of plot1410.roads)for(const [i,piece] of subtractRectangles(bounds(r.polygon.map(reflect)),[...gardenBounds,...body,...parking.map(b=>bounds(b.polygon))]).entries())roads.push({...piece,id:'1409-reconstructed-'+r.id+'-'+i,kind:'drive',derived:true});
 for(const w of plot1410.walkable)sidewalks.push({id:'1409-reconstructed-'+w.id,polygon:w.polygon.map(reflect),derived:true});
 // Route the reconstructed court exit around the pocket garden visible in
 // the official aerial. Measured plot1410 bays and private plots stay fixed.
 road('east-court-access',(116+177.5)/2,60,177.5-116,6.2);
 road('east-court-bend',177.5,69.5,6.2,19);
 road('east-court-park-bypass',(177.5+east)/2,79,east-177.5,6.2);
 for(const x of [130,160])road('east-front-spine-'+x,x,(127+184)/2,6.2,184-127);
 road('east-front-loop',145,127,36.2,6.2);
 road('east-front-entrance',(116+east)/2,165,east-116,6.2);
 for(const direction of [-1,1])for(let x=124;x<172;x+=2.6)addBay('east-rear-'+direction+'-'+x.toFixed(1),rectanglePolygon(rectangle(x,60+direction*5.6,2.5,5)));
 for(const x of [130,160])for(const direction of [-1,1])for(let z=133;z<175;z+=2.6)addBay('east-front-'+x+'-'+direction+'-'+z.toFixed(1),rectanglePolygon(rectangle(x+direction*5.6,z,5,2.5)));

 const addWalk=(id,x,z,w,d)=>{for(const [i,r] of subtractRectangles(rectangle(x,z,w,d),roads).entries())sidewalks.push({id:id+'-'+i,polygon:rectanglePolygon(r)});};
 const landscape=source.landscape||{parks:[],walkable:[],crossings:[],shelters:[],benches:[],trees:[],amphitheatres:[]};
 sidewalks.push(...landscape.walkable);crossings.push(...landscape.crossings);
 for(const x of [west+9,east-9])addWalk('perimeter-walk-'+x,x,midZ,4,south-north-12);
 for(const z of [north+9,south-9])addWalk('perimeter-walk-'+z,midX,z,east-west-12,4);
 addWalk('green-promenade',promenadeX,midZ,4,south-north-12);
 for(const z of [74,91,122])addWalk('court-footway-'+z,(56+112)/2,z,56,1.8);
 for(const z of [43,77,124])addWalk('east-footway-'+z,(112+176)/2,z,64,1.8);
 // Sidewalks are cut at every driveway; zebra paint lies on the continuous
 // asphalt so raised kerbs do not seal a car-park entrance.
 for(const [x,z,axis] of [[west+9,23.48,'x'],[parkingAisleX,south-9,'z'],[130,south-9,'z'],[160,south-9,'z']])crossings.push({x,z,axis});
 for(const [x,z,w,d] of [[79,98,41,3],[143,46,44,2.2],[157,144,2,26]]){const r=rectangle(x,z,w,d);if(!blocked(r)&&!roads.some(a=>intersects(r,a))&&!parking.some(b=>intersects(r,bounds(b.polygon))))islands.push(r);}
 // Close only sub-18cm raster-registration seams at bay mouths, retaining
 // the full measured bay polygons. No driveway is drawn through a bay.
 const seams=[];
 for(const bay of parking){const b=bounds(bay.polygon);for(const r of roads){
  const z0=Math.max(b.minZ,r.minZ),z1=Math.min(b.maxZ,r.maxZ),x0=Math.max(b.minX,r.minX),x1=Math.min(b.maxX,r.maxX);
  if(z1-z0>1.5)for(const [lo,hi] of [[r.maxX,b.minX],[b.maxX,r.minX]])if(hi>lo&&hi-lo<.18)seams.push({minX:lo,maxX:hi,minZ:z0,maxZ:z1});
  if(x1-x0>1.5)for(const [lo,hi] of [[r.maxZ,b.minZ],[b.maxZ,r.minZ]])if(hi>lo&&hi-lo<.18)seams.push({minZ:lo,maxZ:hi,minX:x0,maxX:x1});
 }}
 for(const [i,r] of seams.entries())if(!blocked(r))roads.push({...r,id:'bay-mouth-seam-'+i,kind:'drive'});
 const n2=parking.find(b=>b.label==='N2');if(n2){const b=bounds(n2.polygon),r=roads.find(r=>r.id.startsWith('1410-main-cross-aisle')&&r.minZ<b.maxZ&&r.maxZ>b.minZ);if(r)for(const [i,piece] of subtractRectangles({minX:r.maxX,maxX:b.minX,minZ:b.minZ,maxZ:b.maxZ},parking.map(b=>bounds(b.polygon))).entries())roads.push({...piece,id:'1410-accessible-apron-'+i,kind:'drive'});}
 // Trim pedestrian paving at vehicular and parking surfaces throughout the
 // district, so a repeated entrance strip cannot cover the marked bays.
 const walkPieces=sidewalks.flatMap(w=>{const r=bounds(w.polygon),area=Math.abs(w.polygon.reduce((n,p,i)=>{const q=w.polygon[(i+1)%w.polygon.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2);if(Math.abs(area-(r.maxX-r.minX)*(r.maxZ-r.minZ))>.02)return [w];return subtractRectangles(r,[...roads,...parking.map(b=>bounds(b.polygon))]).map((r,i)=>({...w,id:w.id+'-cut-'+i,polygon:rectanglePolygon(r)}));});
 const plantedPaving=new Map((landscape.courtyards?.pavingOverrides||[]).map(w=>[w.id,w.pieces]));
 sidewalks.splice(0,sidewalks.length,...walkPieces.flatMap(w=>plantedPaving.get(w.id)||[w]));
 // Aerial-derived bays are omitted when their access would require crossing
 // a private plot. Source-plan bays are never silently removed.
 const adjacent=(a,b)=>a.minX<=b.maxX+.025&&a.maxX>=b.minX-.025&&a.minZ<=b.maxZ+.025&&a.maxZ>=b.minZ-.025;
 const bayBounds=parking.map(b=>bounds(b.polygon)),served=new Set(bayBounds.flatMap((b,i)=>roads.some(r=>adjacent(b,r))?[i]:[]));let changed=true;
 while(changed){changed=false;for(let i=0;i<parking.length;i++)if(!served.has(i)&&[...served].some(j=>adjacent(bayBounds[i],bayBounds[j]))){served.add(i);changed=true;}}
 for(let i=parking.length-1;i>=0;i--)if(!served.has(i)&&parking[i].derived)parking.splice(i,1);
 const islandPieces=islands.flatMap(r=>subtractRectangles(r,[...gardenBounds,...body,...roads,...parking.map(b=>bounds(b.polygon))]).filter(p=>(p.maxX-p.minX)*(p.maxZ-p.minZ)>.3));islands.splice(0,islands.length,...islandPieces);
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
 return {revision:110,gardens,fences,parking,roads,roadSurfaces:union,sidewalks,crossings,islands,curbs,landscape,context,utilities:source.utilities||[],bounds:{west:Math.min(west-8,context.bounds?.west??west),east:Math.max(east+8,context.bounds?.east??east),north:Math.min(north-55,landscape.bounds?.minZ-10||north-55),south:Math.max(south+8,context.bounds?.south??south)}};
}
