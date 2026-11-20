import {ARCHITECTURAL_MATERIALS} from '../src/architectural-materials.mjs';
import {installStoneCourses,installFloorCourses,installWallCavity} from '../src/building-finish-shaders.mjs';
import {installBuildingSurfaceUVs} from '../src/building-surface-uvs.mjs';
import {createSurfaceDetails} from './surface-detail.mjs';
// Reinstall shader functions lost by Three ObjectLoader JSON serialization.
export function restorePublicFinishes(root,{mobile=false,stoneUrl=null,signal}={}){
 const details=createSurfaceDetails({mobile}),previous=new Set();
 root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean))for(const value of Object.values(mat))if(value?.isTexture)previous.add(value);});
 const seen=new Set();root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean)){
  if(seen.has(mat))continue;seen.add(mat);
  // Older baselines stored the balcony returns as stone; they are anthracite render.
  if(mat.userData.architecturalRole==='secondary'&&mat.userData.publicFinish==='stone'){mat.userData.publicFinish='render';delete mat.userData.surfaceKind;for(const key of ['map','normalMap','roughnessMap','bumpMap','aoMap'])mat[key]=null;mat.needsUpdate=true;}
  const kind=mat.userData.publicFinish==='render'?null:mat.userData.publicFinish==='stone'?'limestone':mat.userData.publicFinish==='floor'?'porcelain':mat.userData.surfaceKind;
  if(kind&&!(mat.userData.physicalFinishRevision>=165&&['plaster','paint'].includes(kind)))details.apply(mat,kind);
  if(mat.isMeshPhysicalMaterial&&mat.transparent){
   // Physical reflectivity is derived from IOR; its legacy setter changes IOR.
   mat.color.set('#f6faf8');mat.roughness=.04;mat.metalness=0;mat.ior=1.52;mat.specularIntensity=1;
   mat.opacity=Math.min(mat.opacity??.075,.14);mat.envMapIntensity=1.35;mat.needsUpdate=true;
  }
  if(mat.userData.publicFinish==='stone')installStoneCourses(mat);
  if(mat.userData.publicFinish==='floor')installFloorCourses(mat,mat.userData.floorCourses||{});
  if(mat.userData.wallCavity){const profile=mat.userData.wallCavity;delete mat.userData.wallCavity;installWallCavity(mat,profile);}
  if(mat.userData.architecturalRole){const values={...ARCHITECTURAL_MATERIALS[mat.userData.architecturalRole]};if(mat.userData.selectedFinishColor)delete values.color;mat.setValues(values);}
  if(mat.userData.metricInstancedUVs||kind){delete mat.userData.metricInstancedUVs;installBuildingSurfaceUVs(mat);}
 }});
 const used=new Set();root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean))for(const value of Object.values(mat))if(value?.isTexture)used.add(value);});
 for(const t of previous)if(!used.has(t))t.dispose();
 return {ready:Promise.resolve(),dispose:()=>details.dispose(),get textures(){return details.textures;}};
}
