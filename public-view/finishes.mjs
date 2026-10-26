import {installStoneCourses,installFloorCourses} from '../src/building-finish-shaders.mjs';
import {installBuildingSurfaceUVs} from '../src/building-surface-uvs.mjs';
// Reinstall shader functions lost by Three ObjectLoader JSON serialization.
export function restorePublicFinishes(root){
 const seen=new Set();root.traverse(o=>{for(const mat of [o.material].flat().filter(Boolean)){
  if(seen.has(mat))continue;seen.add(mat);
  if(mat.userData.publicFinish==='stone')installStoneCourses(mat);
  if(mat.userData.publicFinish==='floor')installFloorCourses(mat);
  if(mat.userData.metricInstancedUVs){delete mat.userData.metricInstancedUVs;installBuildingSurfaceUVs(mat);}
 }});
}
