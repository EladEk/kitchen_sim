// Build-time clipping only. Browsers receive the compiled, reconciled polygons.
import clipping from 'polygon-clipping';
import {CatmullRomCurve3,Vector3} from 'three';
import trace from '../public-view/district-landscape-r108.json' with {type:'json'};
import {rectanglePolygon,inside,bounds} from '../public-view/site-layout.mjs';
import {DISTRICT,districtFootprint,DISTRICT_GROUND} from '../public-view/district-layout.mjs';
import {compilePublicCourtyards} from './public-courtyards.mjs';
const circle=([x,z],r,n=48)=>Array.from({length:n},(_,i)=>[x+Math.cos(i/n*Math.PI*2)*r,z+Math.sin(i/n*Math.PI*2)*r]);
function ribbon(points,width){
 const curve=new CatmullRomCurve3(points.map(([x,z])=>new Vector3(x,0,z))),length=curve.getLength(),count=Math.max(8,Math.ceil(length/.8)),left=[],right=[];
 for(let i=0;i<=count;i++){const p=curve.getPoint(i/count),t=curve.getTangent(i/count),nx=-t.z*width/2,nz=t.x*width/2;left.push([p.x+nx,p.z+nz]);right.push([p.x-nx,p.z-nz]);}
 return left.concat(right.reverse());
}
export function compilePublicLandscape(layout){
 const mask=clipping.union(...[...layout.roadSurfaces.map(rectanglePolygon),...layout.parking.map(p=>p.polygon),...layout.gardens.map(g=>g.plot),...DISTRICT.map(b=>rectanglePolygon(districtFootprint(b,.3)))].map(p=>[p]));
 const northLimit=DISTRICT_GROUND.north-8.5,northDomain=rectanglePolygon({minX:-40,maxX:DISTRICT_GROUND.east-6.2,minZ:-155,maxZ:northLimit});
 const main=clipping.difference(clipping.intersection([trace.mainPark.worldPolygon],[northDomain]),mask),pocket=clipping.difference([trace.pocketGarden.worldPolygon],mask);
 const parks=[{id:'north-public-park',label:'הפארק שמעבר לכביש',near:['4102','4103','3461'],polygons:main},{id:'east-pocket-garden',label:'הגינה לצד 3461 ו־3471',near:['3461','3471'],polygons:pocket}];
 const walkable=[],plazas=[],shelters=[],benches=[];
 const addWalk=(id,polygon,domain=null,role='path')=>{
  const constrained=domain?clipping.intersection([polygon],domain):[[polygon]],polygons=clipping.difference(constrained,mask);
  for(const [index,rings] of polygons.entries())walkable.push({id:'landscape-'+id+'-'+index,polygon:rings[0],holes:rings.slice(1),landscape:true,role,derived:true});
 };
 for(const path of trace.mainPark.paths){const points=path.worldPoints.map(([x,z])=>[x,Math.min(z,northLimit-1.2)]);addWalk(path.id,ribbon(points,path.width),main);}
 for(const p of trace.mainPark.shadePavilions){
  const position=[p.worldCentre[0],Math.min(p.worldCentre[1],northLimit-p.radiusEstimate-1.8)],radius=p.radiusEstimate;
  shelters.push({id:p.id,position,radius,height:3.55,heightInferred:true});plazas.push({position,radius:radius+.75});addWalk(p.id+'-plaza',circle(position,radius+.75),main,'plaza');
 }
 // Join the adjusted near-road pavilion to the source-derived path network.
 addWalk('south-shade-link',ribbon([[125.19,northLimit-1.2],shelters[2].position],2.2),main);
 const amphitheatre={...trace.mainPark.amphitheatre,position:trace.mainPark.amphitheatre.worldCentre,rows:6,rise:.18,heightInferred:true};
 addWalk('amphitheatre-link',ribbon([shelters[1].position,[119,-86],[107.6,-88],amphitheatre.position],2.2),main);
 addWalk('amphitheatre-stage',circle(amphitheatre.position,4.2),main,'plaza');
 addWalk('north-edge-walk',ribbon([[21,-127],[54,-121],[87,-115],[115,-107],[145,-97],[171,-86],[193,-60]],2.2),main);
 addWalk('west-loop-link',ribbon([[35.9,-43],[25,-62],[27,-93],[32,-118]],2.2),main);
 addWalk('north-shade-link',ribbon([[69.4,-83.8],[84,-91],[107.6,-96.02],[129.9,-90.21],[171,-86]],2.2),main);
 addWalk('pocket-loop',ribbon([[202.8,45.5],[195,45],[187.8,49],[188,58],[195,65.4],[202.5,65]],1.8),pocket);
 addWalk('pocket-west-entry',ribbon([[178,43],[187.8,49]],1.8));
 for(const position of [[191,46],[198,65],[32,-55],[93,-53],[157,-62]])benches.push({position,angle:position[1]>0?-.5:.3});
 // Crossings are inferred connections, kept on the existing street surface.
 const crossings=[35.9,89.1,174].map(x=>({x,z:DISTRICT_GROUND.north,axis:'z',length:10.5,derived:true}));
 for(const crossing of crossings)addWalk('park-entry-'+crossing.x,ribbon([[crossing.x,-24],[crossing.x,-44]],2.4));
 const forbidden=[...walkable.map(w=>w.polygon),...layout.sidewalks.map(w=>w.polygon)],trees=[];
 const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);};
 const clearPath=point=>!walkable.filter(w=>w.role==='path').some(w=>inside(point,w.polygon)||w.polygon.some((a,i)=>segmentDistance(point,a,w.polygon[(i+1)%w.polygon.length])<1.35));
 for(const shelter of shelters){let count=0;for(let i=0;i<12&&count<2;i++){const a=i/12*Math.PI*2,point=[shelter.position[0]+Math.cos(a)*shelter.radius*.72,shelter.position[1]+Math.sin(a)*shelter.radius*.72];if(!clearPath(point))continue;benches.push({position:point,angle:-a-Math.PI/2});count++;i+=2;}}
 const clear=point=>!forbidden.some(poly=>inside(point,poly)||poly.some((a,i)=>segmentDistance(point,a,poly[(i+1)%poly.length])<2.3))&&!plazas.some(p=>Math.hypot(point[0]-p.position[0],point[1]-p.position[1])<p.radius+2);
 for(const park of parks)for(const [ring] of park.polygons){
  const center=ring.reduce((a,p)=>[a[0]+p[0]/ring.length,a[1]+p[1]/ring.length],[0,0]);
  for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8);for(let j=0;j<n;j++){const x=a[0]+(b[0]-a[0])*(j+.5)/n,z=a[1]+(b[1]-a[1])*(j+.5)/n,dx=center[0]-x,dz=center[1]-z,l=Math.hypot(dx,dz),point=[x+dx/l*2.8,z+dz/l*2.8];if(inside(point,ring)&&clear(point))trees.push(point);}}
 }
 for(const point of [[50,-101],[56,-104],[151,-72],[154,-76],[162,-55],[25,-89],[30,-91],[195,56]])if(parks.some(p=>p.polygons.some(([ring])=>inside(point,ring)))&&clear(point))trees.push(point);
 const courtyards=compilePublicCourtyards(layout);
 walkable.push(...courtyards.walkable);crossings.push(...courtyards.crossings);
 return {revision:109,source:trace.sourceURL,sourceKind:trace.sourceKind,verifiedAsBuilt:false,uncertaintyMetres:trace.uncertaintyMetres,parks,walkable,crossings,shelters,benches:benches.filter(b=>clearPath(b.position)),trees,courtyards,amphitheatres:[amphitheatre],bounds:{minX:-40,maxX:DISTRICT_GROUND.east+8,minZ:-145,maxZ:DISTRICT_GROUND.south+8}};
}
