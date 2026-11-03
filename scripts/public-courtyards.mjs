import clipping from 'polygon-clipping';
import reference from '../public-view/courtyard-reference-r109.json' with {type:'json'};
import {rectanglePolygon,inside,bounds} from '../public-view/site-layout.mjs';
import {DISTRICT,districtFootprint} from '../public-view/district-layout.mjs';

const rect=([minX,maxX,minZ,maxZ])=>rectanglePolygon({minX,maxX,minZ,maxZ});
const area=poly=>poly.reduce((total,ring,i)=>total+(i?-1:1)*Math.abs(ring.reduce((s,p,j)=>{const q=ring[(j+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2),0);
const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);};
const pointIn=(p,poly)=>inside(p,poly[0])&&!poly.slice(1).some(h=>inside(p,h));
const pathPolygon=path=>{const [a,b]=path.points,dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),x=-dz/l*path.width/2,z=dx/l*path.width/2;return [[a[0]+x,a[1]+z],[b[0]+x,b[1]+z],[b[0]-x,b[1]-z],[a[0]-x,a[1]-z]];};

// All polygon work runs once at build time. The client only reads prepared
// holes and bounded instance placements; there is no browser clipping pass.
export function compilePublicCourtyards(layout){
 const blocked=clipping.union(...[
  ...layout.roadSurfaces.map(rectanglePolygon),...layout.parking.map(p=>p.polygon),
  ...layout.gardens.map(g=>g.plot),...DISTRICT.map(b=>rectanglePolygon(districtFootprint(b,.4)))
 ].map(p=>[p]));
 const paths=reference.paths.map(p=>({...p,polygon:pathPolygon(p)}));
 // These wide public paved zones are the visible lawn/tree forecourts in the
 // aerial. Other existing paths, especially every building entry, are reserved.
 const mayPlant=w=>/^(?:1409-reconstructed-)?1410-(?:common-south-forecourt|west-edge-walk)/.test(w.id);
 const reserved=clipping.union(...paths.map(p=>[p.polygon]),...layout.sidewalks.filter(w=>!mayPlant(w)).map(w=>[w.polygon,...(w.holes||[])]));
 const beds=[];
 function bed(id,polygon,kind,foliage='green',height=.4){
  const polygons=clipping.difference([polygon],blocked,reserved).filter(p=>area(p)>1.2);
  if(polygons.length)beds.push({id,kind,foliage,height,polygons,dimensionsInferred:true});
 }
 for(const b of reference.plantingBands)bed(b.id,rect(b.bounds),'shrubs',b.foliage,b.height);
 for(const [i,z] of reference.treePockets.centresZ.entries()){
  const [minX,maxX]=reference.treePockets.boundsX,d=reference.treePockets.depth;
  bed(reference.treePockets.id+'-'+i,rect([minX,maxX,z-d/2,z+d/2]),'lawn');
 }
 const plantMask=clipping.union(...beds.flatMap(b=>b.polygons));
 const pavingOverrides=[];
 for(const w of layout.sidewalks){
  const original=[w.polygon,...(w.holes||[])];
  if(!clipping.intersection([original],plantMask).length)continue;
  const pieces=clipping.difference([original],plantMask);
  pavingOverrides.push({id:w.id,pieces:pieces.map((rings,i)=>({...w,id:w.id+'-planted-'+i,polygon:rings[0],holes:rings.slice(1)}))});
 }
 const walkable=paths.flatMap(p=>clipping.difference([p.polygon],blocked,plantMask).map((rings,i)=>({id:'courtyard-'+p.id+'-'+i,polygon:rings[0],holes:rings.slice(1),landscape:true,role:'path',derived:true})));
 const trees=[];
 function tree(point){
  if(trees.some(p=>Math.hypot(p[0]-point[0],p[1]-point[1])<5.5))return;
  const suitable=beds.some(b=>b.foliage==='green'&&b.polygons.some(poly=>pointIn(point,poly)&&poly.every(r=>r.every((a,i)=>distance(point,a,r[(i+1)%r.length])>1.28))));
  if(suitable)trees.push(point);
 }
 for(const z of reference.treePockets.centresZ)tree([94.75,z]);
 for(const x of [105.95,118.1])for(let z=-8;z<165;z+=12)tree([x,z]);
 for(let x=-12;x<200;x+=12)for(const z of [69.88,78.85])tree([x,z]);
 const shrubs=[];
 const noise=n=>{const v=Math.sin(n*127.1+73.7)*43758.5453;return v-Math.floor(v);};
 for(const b of beds.filter(b=>b.kind==='shrubs'))for(const poly of b.polygons){
  const r=bounds(poly[0]),red=b.foliage==='burgundy',margin=red?.34:.52,step=red?.54:.82;
  for(let x=r.minX+margin;x<r.maxX-margin+.001;x+=step)for(let z=r.minZ+margin;z<r.maxZ-margin+.001;z+=step){
   const point=[x,z];if(!pointIn(point,poly)||!poly.every(ring=>ring.every((a,i)=>distance(point,a,ring[(i+1)%ring.length])>=margin-.002)))continue;
   const i=shrubs.length,radius=(red?.29:.46)*(1+noise(i)*.07);
   shrubs.push({position:point,scale:[radius,b.height*(.9+noise(i+15)*.18),radius],angle:noise(i+30)*Math.PI*2,foliage:b.foliage});
  }
 }
 return {revision:109,source:reference.sourceURL,sourceKind:reference.sourceKind,verifiedAsBuilt:false,
  accuracy:'Visible relative arrangement from the supplied aerial; positions reconciled to existing public ground controls. Plant widths/counts/species are estimates.',
  paths:paths.map(({polygon,...p})=>p),beds,trees,shrubs,pavingOverrides,walkable,
  crossings:[{x:46.5,z:74.55,axis:'x',length:6.2,derived:true},{x:177.5,z:73.8,axis:'x',length:6.2,derived:true}],
  sourceSHA256:reference.sourceSHA256};
}
