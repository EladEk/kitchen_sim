import {copyGpuClipBinding} from './gpu-selection-clip.mjs';
import {Box3,Matrix4,Raycaster,Triangle,Vector3} from 'three';

// Render-only wall fading. Collision/door geometry and saved floor plans are untouched.
export function createCameraWallFade(){
 const entries=new Map(),box=new Box3(),inverse=new Matrix4(),point=new Vector3(),nearest=new Vector3(),triangle=new Triangle(),ray=new Raycaster();
 let lastQuery=-Infinity,lastFrame=0;
 const wall=m=>m&&(m.userData.wallCavity||m.userData.surfaceKind==='plaster')&&!m.userData.architecturalCeiling;
 function near(mesh,camera){
  box.setFromObject(mesh);if(box.distanceToPoint(camera)>.45)return false;
  inverse.copy(mesh.matrixWorld).invert();point.copy(camera).applyMatrix4(inverse);
  const p=mesh.geometry.getAttribute('position'),idx=mesh.geometry.index,count=idx?.count??p.count;
  for(let i=0;i+2<count;i+=3){
   triangle.a.fromBufferAttribute(p,idx?idx.getX(i):i);triangle.b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1);triangle.c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2);
   triangle.closestPointToPoint(point,nearest);nearest.applyMatrix4(mesh.matrixWorld);if(nearest.distanceToSquared(camera)<.45*.45)return true;
  }return false;
 }
 function restore(){for(const [o,e]of entries){o.material=e.original;e.clones.forEach(m=>m.dispose());}entries.clear();}
 return {update(root,camera,target,enabled,now=performance.now(),{walking=false,candidates:cachedCandidates=null}={}){
  if(!enabled||!root){restore();lastFrame=now;return;}
  const dt=Math.min(.1,lastFrame?(now-lastFrame)/1000:.016);lastFrame=now;
  if(now-lastQuery>100){
   lastQuery=now;root.updateWorldMatrix(true,true);const candidates=cachedCandidates||[];
   if(!cachedCandidates)root.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh&&[o.material].flat().some(wall))candidates.push(o);});
   const blocked=new Set();
   if(walking){for(const o of candidates)if(near(o,camera.position))blocked.add(o);}
   else{const d=target.clone().sub(camera.position);ray.set(camera.position,d.clone().normalize());ray.far=Math.max(0,d.length()-.1);for(const hit of ray.intersectObjects(candidates,false))blocked.add(hit.object);}
   for(const o of blocked)if(!entries.has(o)){
    const original=o.material,clones=[];const clone=m=>{if(!wall(m))return m;const c=copyGpuClipBinding(m,m.clone());c.transparent=true;c.depthWrite=false;c.needsUpdate=true;clones.push(c);return c;};
    o.material=Array.isArray(original)?original.map(clone):clone(original);entries.set(o,{original,clones,amount:1,active:true});
   }
   for(const [o,e]of entries)e.active=blocked.has(o);
  }
  for(const [o,e]of entries){
   e.amount+=((e.active?.15:1)-e.amount)*(1-Math.exp(-dt/.12));for(const m of e.clones)m.opacity=e.amount;
   if(!e.active&&e.amount>.995){o.material=e.original;e.clones.forEach(m=>m.dispose());entries.delete(o);}
  }
 },reset(){restore();lastQuery=-Infinity;lastFrame=0;},dispose:restore};
}
