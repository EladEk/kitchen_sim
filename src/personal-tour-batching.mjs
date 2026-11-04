import * as THREE from 'three';
import {mergeDistrictParts} from '../public-view/district.mjs';

// The editable scene keeps individual handles. The tour merges only static
// surfaces, retaining moving doors, shutters and furniture parts for picking.
export function batchPersonalTour(home){
 const dynamic=new Set(home.motions.map(m=>m.object)),buckets=new Map(),removed=[];
 home.group.updateWorldMatrix(true,true);const inverse=home.group.matrixWorld.clone().invert();
 const movable=o=>{for(let p=o;p&&p!==home.group;p=p.parent)if(dynamic.has(p))return true;return false;};
 home.group.traverse(o=>{
  if(!o.visible||o.userData.tourNonPhysical||o.userData.mirrorSurface||!o.isMesh||o.isInstancedMesh||movable(o)||o.userData.securityOverlay||o.userData.action==='security-camera')return;
  const mats=Array.isArray(o.material)?o.material:[o.material],ranges=mats.length>1?o.geometry.groups:[{start:0,count:o.geometry.index?.count??o.geometry.attributes.position.count,materialIndex:0}],matrix=inverse.clone().multiply(o.matrixWorld),ceiling=!!o.userData.ceiling,flags=JSON.stringify([ceiling,o.castShadow,o.receiveShadow,o.userData.exterior!==false]);
  for(const range of ranges){const mat=mats[range.materialIndex];if(!mat||mat.opacity===0||mat.colorWrite===false)continue;let byFlag=buckets.get(mat);if(!byFlag){byFlag=new Map();buckets.set(mat,byFlag);}if(!byFlag.has(flags))byFlag.set(flags,[]);byFlag.get(flags).push({geometry:o.geometry,matrix,start:range.start,count:range.count});}
  removed.push(o);
 });
 const before=removed.length;for(const o of removed)o.removeFromParent();let batches=0;
 for(const [material,flags] of buckets)for(const [key,parts] of flags){const [ceiling,castShadow,receiveShadow,exterior]=JSON.parse(key);const geometry=mergeDistrictParts(parts);if(!geometry)continue;home.resources.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=castShadow;mesh.receiveShadow=receiveShadow;mesh.userData={level:0,ceiling,exterior,part:'personal-tour-static'};home.group.add(mesh);batches++;}
 const used=new Set();home.group.traverse(o=>{if(o.geometry)used.add(o.geometry);});
 for(let i=home.resources.length-1;i>=0;i--){const r=home.resources[i];if(r.isBufferGeometry&&!used.has(r)){r.dispose();home.resources.splice(i,1);}}
 const retainedPicks=home.picks.filter(o=>{for(let p=o;p;p=p.parent)if(p===home.group)return true;return false;});home.picks.splice(0,home.picks.length,...retainedPicks);
 removed.length=0;buckets.clear();dynamic.clear();used.clear();home.group.updateMatrixWorld(true);return {staticMeshes:before,batches};
}
