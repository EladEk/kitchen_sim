import polygonClipping from 'polygon-clipping';
import {ShapeUtils,Vector2} from 'three';
// Public source-plan outlines only. A display footprint includes its terraces
// and the thickness of perimeter walls/guards; walking retains the inner trace.
const EPS=.14;
export function offsetPolygon(poly,d=.16){
 const area=poly.reduce((n,p,i)=>{const q=poly[(i+1)%poly.length];return n+p[0]*q[1]-q[0]*p[1];},0),sign=Math.sign(area)||1;
 const lines=poly.map((p,i)=>{const q=poly[(i+1)%poly.length],v=[q[0]-p[0],q[1]-p[1]],l=Math.hypot(...v)||1;return {p:[p[0]+sign*v[1]/l*d,p[1]-sign*v[0]/l*d],v};});
 return lines.map((b,i)=>{const a=lines[(i+lines.length-1)%lines.length],den=a.v[0]*b.v[1]-a.v[1]*b.v[0];if(Math.abs(den)<1e-8)return b.p;const q=[b.p[0]-a.p[0],b.p[1]-a.p[1]],t=(q[0]*b.v[1]-q[1]*b.v[0])/den;return [a.p[0]+a.v[0]*t,a.p[1]+a.v[1]*t];});
}
function contacts(poly,unit){
 const spans=[];poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length],axis=Math.abs(b[0]-a[0])<.001?1:0,normal=1-axis;if(Math.abs(b[normal]-a[normal])>.001)return;
 unit.forEach((p,j)=>{const q=unit[(j+1)%unit.length];if(Math.abs(q[normal]-p[normal])>.001||Math.abs(p[normal]-a[normal])>EPS)return;const lo=Math.max(Math.min(a[axis],b[axis]),Math.min(p[axis],q[axis])),hi=Math.min(Math.max(a[axis],b[axis]),Math.max(p[axis],q[axis]));if(hi-lo>.04)spans.push({axis,normal:a[normal],lo,hi});});
 });return spans;
}
function clipAxis(poly,axis,value,greater){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],a=(p[axis]-value)*(greater?1:-1),b=(q[axis]-value)*(greater?1:-1);if(a>=-1e-8)out.push(p);if((a>=0)!==(b>=0)){const t=a/(a-b);out.push(p.map((v,k)=>v+(q[k]-v)*t));}}return out;}
export function unitDisplayPolygons(floor){
 const result=new Map(floor.units.map(u=>[u.number,[offsetPolygon(u.polygon)]]));
 for(const poly of floor.balconies||[]){
  const owners=floor.units.map(u=>({unit:u.number,spans:contacts(poly,u.polygon)})).filter(u=>u.spans.length);
  if(!owners.length)throw Error('Unassigned source balcony on floor '+floor.level);
  if(owners.length===1){result.get(owners[0].unit).push(offsetPolygon(poly));continue;}
  // A tessellated terrace can cross the end of a party wall. Continue the
  // source party boundary instead of dropping the smaller adjoining portion.
  const axis=owners[0].spans[0].axis,ordered=owners.map(o=>({...o,lo:Math.min(...o.spans.filter(s=>s.axis===axis).map(s=>s.lo)),hi:Math.max(...o.spans.filter(s=>s.axis===axis).map(s=>s.hi))})).sort((a,b)=>(a.lo+a.hi)-(b.lo+b.hi));
  for(let i=0;i<ordered.length;i++){let piece=poly;if(i)piece=clipAxis(piece,axis,(ordered[i-1].hi+ordered[i].lo)/2,true);if(i+1<ordered.length)piece=clipAxis(piece,axis,(ordered[i].hi+ordered[i+1].lo)/2,false);if(piece.length>=3)result.get(ordered[i].unit).push(offsetPolygon(piece));}
 }
 return result;
}

export function displayTriangles(polygons){
 const union=polygonClipping.union(...polygons.map(p=>[p]));const triangles=[];
 for(const rings of union){const open=r=>r.slice(0,-1).map(p=>new Vector2(...p)),outer=open(rings[0]),holes=rings.slice(1).map(open),vertices=outer.concat(...holes);for(const face of ShapeUtils.triangulateShape(outer,holes))triangles.push(face.map(i=>[vertices[i].x,vertices[i].y]));}
 return triangles;
}
