import * as THREE from 'three';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';

// A continuous outer skin hides the tiny ends of perpendicular plaster walls.
// Rows follow the existing solid wall spans, so doors/windows stay open.
export function facadeSkinRows(row,faces,{positiveFace=4,negativeFace=5,vertical=false,datum=3.1}={}){
 const [x,y,z,w,h,d,angle=0]=row,skin=[],belt=[];
 for(const sign of [-1,1]){
  if(!faces[sign>0?positiveFace:negativeFace])continue;
  const normal=vertical?[1,0]:[Math.sin(angle),Math.cos(angle)],offset=sign*((vertical?w:d)/2+.008),cx=x+normal[0]*offset,cz=z+normal[1]*offset;
  skin.push([cx,y,cz,vertical?.008:w,h,vertical?d:.008,angle]);
  const lo=Math.max(y-h/2,datum-.0375),hi=Math.min(y+h/2,datum-.0025);
  if(hi>lo+.001)belt.push([cx+normal[0]*sign*.005,(lo+hi)/2,cz+normal[1]*sign*.005,vertical?.002:w,hi-lo,vertical?d:.002,angle]);
 }
 return {skin,belt};
}
export function appendFacadeVeneers(parent,rows,material,resources,{geometry=null,part='exterior-stone-skin',level=0}={}){
 if(!rows.length)return null;
 const cube=geometry||new THREE.BoxGeometry(1,1,1);if(!geometry)resources.push(cube);
 installBuildingSurfaceUVs(material);
 const mesh=new THREE.InstancedMesh(cube,material,rows.length),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 rows.forEach(([x,y,z,w,h,d,angle=0],i)=>{matrix.compose(p.set(x,y,z),q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle),s.set(w,h,d));mesh.setMatrixAt(i,matrix);});
 mesh.name=part;mesh.userData={part,buildingFloor:level,tourNonPhysical:true};mesh.castShadow=false;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);resources.push(mesh);return mesh;
}
