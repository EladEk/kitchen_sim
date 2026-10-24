import {writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {buildBuildingContext} from '../src/building-scene.js';
import {normalizeHomeSettings} from '../src/home-model.mjs';
import {polygonContains} from '../src/building-geometry.mjs';
import {segmentDistance,buildingBoxes,buildingCanStand,moveBuildingPlayer} from '../src/building-navigation.mjs';
import {createElevators} from '../src/elevator-model.mjs';
const near=(p,poly)=>Math.min(...poly.map((a,i)=>segmentDistance(p,a,poly[(i+1)%poly.length]))),inside=(p,poly)=>polygonContains(p,poly),mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
export function auditBalconyAccess(){
 const settings=normalizeHomeSettings({buildingLevel:9,cutaway:false,furniture:false}),resources=[],root=new THREE.Group(),model=buildBuildingContext({group:root,resources,settings,mode:'building'}),cars=createElevators(),floors=[],failures=[];root.updateMatrixWorld(true);
 try{for(const f of BUILDING_FLOORS.filter(f=>f.level>0)){
  const boxes=buildingBoxes(f.level,settings,cars),wallBoxes=[],matrix=new THREE.Matrix4();model.floors.get(f.level).traverse(o=>{if(!o.isInstancedMesh||!['building-interior-wall','building-facade-wall'].includes(o.userData.part))return;o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);wallBoxes.push(o.geometry.boundingBox.clone().applyMatrix4(matrix));}});
  const portals=[];
  for(const d of BUILDING_INTERIORS.floors[f.level].doors.filter(d=>d.balconyDoor))portals.push({id:d.id,kind:'hinged',a:d.hinge,b:d.closed,point:mid(d.hinge,d.closed),balconies:d.balconies});
  for(const path of f.envelope)for(const [index,o]of path.openings.entries())if(o.kind==='slider'){
   const a=path.polygon[o.edge],b=path.polygon[(o.edge+1)%path.polygon.length],projection=p=>(p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]),start=projection(o.a)<projection(o.b)?o.a:o.b,end=start===o.a?o.b:o.a,point=start.map((v,i)=>v+(end[i]-v)*.75),balconies=f.balconies.map((poly,i)=>near(point,poly)<.35?i:-1).filter(i=>i>=0);if(balconies.length)portals.push({id:`slider-${portals.length}-${index}`,kind:'slider',a:o.a,b:o.b,point,balconies});
  }
  for(const p of portals){const len=Math.hypot(...p.a.map((v,i)=>p.b[i]-v)),normal=[-(p.b[1]-p.a[1])/len,(p.b[0]-p.a[0])/len];let crossed=false,opaque=false;
   for(const sign of [-1,1]){const a=p.point.map((v,i)=>v-normal[i]*sign*.55),b=p.point.map((v,i)=>v+normal[i]*sign*.55);if(!f.units.some(u=>inside(a,u.polygon))||!p.balconies.some(id=>inside(b,f.balconies[id])))continue;
    const end=moveBuildingPlayer(a,b.map((v,i)=>v-a[i]),f.level,boxes,cars);if(Math.hypot(...end.map((v,i)=>v-b[i]))<.055){crossed=true;p.inside=a;p.outside=b;}
    for(const height of [.12,.55,1.4,1.9])for(let t=.15;t<.9;t+=.1){const point=new THREE.Vector3(a[0]+(b[0]-a[0])*t,f.elevation+height,a[1]+(b[1]-a[1])*t);if(wallBoxes.some(box=>box.containsPoint(point)))opaque=true;}
   }
   p.crossed=crossed;p.opaque=opaque;if(!crossed||opaque)failures.push({floor:f.level,portal:p.id,kind:opaque?'wall-in-balcony-access':'blocked-balcony-crossing',point:p.point});
  }
  const links=f.balconies.map(()=>new Set());
  for(let i=0;i<f.balconies.length;i++)for(let j=i+1;j<f.balconies.length;j++){const p=f.balconies[i],q=f.balconies[j];let connected=false;
   for(let a=0;a<p.length&&!connected;a++)for(let b=0;b<q.length&&!connected;b++){const x=p[a],y=p[(a+1)%p.length],u=q[b],v=q[(b+1)%q.length],normal=Math.abs(x[0]-y[0])<.01?0:1,axis=1-normal;if(Math.abs(u[normal]-v[normal])>.01||Math.abs(x[normal]-u[normal])>.06)continue;const lo=Math.max(Math.min(x[axis],y[axis]),Math.min(u[axis],v[axis])),hi=Math.min(Math.max(x[axis],y[axis]),Math.max(u[axis],v[axis]));if(hi-lo<.45)continue;
    for(const t of [.2,.5,.8]){const point=normal===0?[x[0],lo+(hi-lo)*t]:[lo+(hi-lo)*t,x[1]],pass=[-.22,0,.22].every(d=>{const at=[...point];at[normal]+=d;return buildingCanStand(at,f.level,boxes,cars);});if(pass){connected=true;break;}}
   }if(connected){links[i].add(j);links[j].add(i);}}
  const reachable=new Set(portals.filter(p=>p.crossed&&!p.opaque).flatMap(p=>p.balconies)),queue=[...reachable];for(let h=0;h<queue.length;h++)for(const j of links[queue[h]])if(!reachable.has(j)){reachable.add(j);queue.push(j);}
  for(let i=0;i<f.balconies.length;i++)if(!reachable.has(i))failures.push({floor:f.level,balcony:i,kind:'balcony-without-access'});
  floors.push({floor:f.level,balconies:f.balconies.length,reachable:reachable.size,portals,links:links.map(s=>[...s])});
 }}finally{resources.forEach(r=>r.dispose?.());}
 return{revision:61,summary:{floors:floors.length,balconies:floors.reduce((n,f)=>n+f.balconies,0),reachable:floors.reduce((n,f)=>n+f.reachable,0),portalCrossings:floors.reduce((n,f)=>n+f.portals.length,0),failures:failures.length},floors,failures};
}
if(process.argv[1]?.endsWith('audit-balcony-access.mjs')){const r=auditBalconyAccess();writeFileSync(process.argv[2]||'qa/balcony-access-r61.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.summary));if(r.failures.length){console.log(JSON.stringify(r.failures,null,2));process.exitCode=1;}}
