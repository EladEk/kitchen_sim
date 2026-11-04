import {installStoneCourses,installFloorCourses,installWallCavity} from '../src/building-finish-shaders.mjs';
import {installBuildingSurfaceUVs} from '../src/building-surface-uvs.mjs';
import {createSurfaceDetails} from './surface-detail.mjs';
// Reinstall shader functions lost by Three ObjectLoader JSON serialization.
export function restorePublicFinishes(root,{mobile=false,stoneUrl=null,signal}={}){
 const details=createSurfaceDetails({mobile}),previous=new Set();
 root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean))for(const value of Object.values(mat))if(value?.isTexture)previous.add(value);});
 const seen=new Set();root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean)){
  if(seen.has(mat))continue;seen.add(mat);
  const kind=mat.userData.publicFinish==='stone'?'limestone':mat.userData.publicFinish==='floor'?'porcelain':mat.userData.surfaceKind;
  if(kind)details.apply(mat,kind);
  if(mat.isMeshPhysicalMaterial&&mat.transparent){mat.color.set('#d1dcd9');mat.roughness=.105;mat.ior=1.52;mat.envMapIntensity=1.05;mat.opacity=.34;mat.needsUpdate=true;}
  if(mat.userData.publicFinish==='stone')installStoneCourses(mat);
  if(mat.userData.publicFinish==='floor')installFloorCourses(mat,mat.userData.floorCourses||{});
  if(mat.userData.wallCavity){const profile=mat.userData.wallCavity;delete mat.userData.wallCavity;installWallCavity(mat,profile);}
  if(mat.userData.metricInstancedUVs||kind){delete mat.userData.metricInstancedUVs;installBuildingSurfaceUVs(mat);}
 }});
 const used=new Set();root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean))for(const value of Object.values(mat))if(value?.isTexture)used.add(value);});
 for(const t of previous)if(!used.has(t))t.dispose();
 return {ready:details.loadStone(stoneUrl,{signal}),dispose:()=>details.dispose(),get textures(){return details.textures;}};
}
