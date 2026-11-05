import * as T from 'three';
import {mergeDistrictParts} from './district.mjs';
import {motionAncestor,motionRoots,createMotionCopy} from './model-motions.mjs';

// Display only: collision queries and door actions retain the original model.
// Spatial cells keep culling useful; rooms share material/geometry batches.
// A shared allocation size gives equivalent cells the same instance-buffer
// shader layout. Draw count stays exact, including bounds and collision geometry.
export const walkingInstanceCapacity=count=>Math.max(32,2**Math.ceil(Math.log2(Math.max(1,count))));
export function createWalkingDisplay(source,{cellSize=8}={}){
 const group=new T.Group(),owned=[],instances=[],motions=[],cells=new Map(),buckets=new Map(),furniture=new Map(),ids=new Map();
 group.name='walking-batched-building';source.updateWorldMatrix(true,true);
 const inverse=source.matrixWorld.clone().invert(),local=new T.Matrix4(),centre=new T.Vector3();
 const id=m=>{if(!ids.has(m))ids.set(m,ids.size);return ids.get(m);};
 const cell=(o,matrix)=>{
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();o.geometry.boundingBox.getCenter(centre).applyMatrix4(matrix);
  const level=o.userData.level??0,exterior=o.userData.exterior!==false,key=[level,exterior,Math.floor(centre.x/cellSize),Math.floor(centre.z/cellSize)].join(':');
  if(!cells.has(key)){const g=new T.Group();g.userData={level,exterior};cells.set(key,g);group.add(g);}return [key,cells.get(key)];
 };
 for(const motion of motionRoots(source)){
  if(motion.userData.tourDoor)continue;const copy=createMotionCopy(motion,source);motions.push(copy);group.add(copy.group);
 }
 source.traverseVisible(o=>{
  if(!o.isMesh||o.userData.furnitureCollisionProxy||motionAncestor(o,source))return;
  const base=inverse.clone().multiply(o.matrixWorld),materials=[o.material].flat();
  if(!materials.some(m=>m&&m.visible!==false&&m.opacity!==0))return;
  // Keep exceptional/deforming geometry independent, including custom actions.
  if(o.isSkinnedMesh||o.isBatchedMesh||o.morphTargetInfluences?.length||o.instanceColor){
   const copy=o.clone(false);copy.matrixAutoUpdate=false;copy.matrix.copy(base);group.add(copy);if(copy.isInstancedMesh)instances.push(copy);return;
  }
  const count=o.isInstancedMesh?o.count:1,total=o.geometry.index?.count??o.geometry.attributes.position.count;
  for(let i=0;i<count;i++){
   const matrix=base.clone();if(o.isInstancedMesh){o.getMatrixAt(i,local);matrix.multiply(local);}
   const [key,parent]=cell(o,matrix);
   // GLB cloth/foliage stays instanced and retains its original scanned UVs.
   // Transparent parts also retain a small spatial batch for sorting.
   if(o.userData.furnitureRender||o.userData.mirrorSurface||materials.some(m=>m?.transparent)){
    const k=JSON.stringify([key,o.geometry.uuid,materials.map(id),o.castShadow,o.receiveShadow]);
    if(!furniture.has(k))furniture.set(k,{parent,source:o,matrices:[]});furniture.get(k).matrices.push(matrix);continue;
   }
   const ranges=materials.length>1?o.geometry.groups:[{start:0,count:total,materialIndex:0}];
   for(const range of ranges){const material=materials[range.materialIndex];if(!material||material.visible===false||material.opacity===0)continue;
    const k=JSON.stringify([key,id(material),o.castShadow,o.receiveShadow,o.renderOrder]);
    if(!buckets.has(k))buckets.set(k,{parent,source:o,material,parts:[]});buckets.get(k).parts.push({geometry:o.geometry,matrix,start:range.start,count:range.count});
   }
  }
 });
 for(const {parent,source:o,material,parts}of buckets.values()){
  const geometry=mergeDistrictParts(parts);if(!geometry)continue;geometry.computeBoundingSphere();owned.push(geometry);
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=o.castShadow;mesh.receiveShadow=o.receiveShadow;mesh.renderOrder=o.renderOrder;mesh.userData={...o.userData,walkingBatch:true};parent.add(mesh);
 }
 for(const {parent,source:o,matrices}of furniture.values()){
  const mesh=new T.InstancedMesh(o.geometry,o.material,walkingInstanceCapacity(matrices.length));mesh.count=matrices.length;matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();
  mesh.castShadow=o.castShadow;mesh.receiveShadow=o.receiveShadow;mesh.renderOrder=o.renderOrder;mesh.userData={...o.userData,walkingBatch:true};parent.add(mesh);instances.push(mesh);
 }
 buckets.clear();furniture.clear();ids.clear();
 return {group,update(floor){for(const g of cells.values())g.visible=g.userData.exterior||Math.abs(g.userData.level-floor)<=1;for(const copy of motions){copy.group.visible=copy.group.userData.exterior||Math.abs(copy.group.userData.level-floor)<=1;if(copy.group.visible)copy.sync();}},
  sync(){for(const copy of motions)copy.sync();},
  dispose(){for(const g of owned)g.dispose();for(const mesh of instances)mesh.dispose();for(const copy of motions)copy.dispose();group.removeFromParent();group.clear();cells.clear();owned.length=instances.length=motions.length=0;}};
}
