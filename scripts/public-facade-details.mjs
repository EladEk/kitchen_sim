import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {inside} from '../public-view/site-layout.mjs';

// Public, generic furnishings and construction finishes. No owner layout or
// claimed resident-specific curtain/occupancy data are used.
export function refinePublicFacade(root,resources=[]){
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),normal=new THREE.Vector3(),offset=new THREE.Vector3();
 const rounded=new RoundedBoxGeometry(1,.06,.42,1,.008),correction=new THREE.Matrix4().makeScale(1,1/.06,1/.42);resources.push(rounded);
 const curtain=new THREE.PlaneGeometry(1,1,18,1),p=curtain.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,Math.cos((p.getX(i)+.5)*Math.PI*12)*.022);
 curtain.computeVertexNormals();resources.push(curtain);
 const fabrics=['#e6e1d6','#d8ddd7'].map(color=>{const m=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide});m.userData.surfaceKind='fabric';resources.push(m);return m;});
 const rod=new THREE.CylinderGeometry(.008,.008,1,6),metal=new THREE.MeshStandardMaterial({color:'#666963',roughness:.4,metalness:.5});resources.push(rod,metal);
 const groups=new Map(),rods=new Map();let sills=0,panels=0;
 root.updateMatrixWorld(true);
 const meshes=[];root.traverse(o=>{if(o.isInstancedMesh)meshes.push(o);});
 for(const o of meshes){
  if(o.userData.part==='building-stone-sill'){
   o.geometry=rounded;
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.multiply(correction);o.setMatrixAt(i,matrix);sills++;}
   o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();
  }
  if(o.userData.part!=='building-glazing'||!(o.userData.buildingFloor>0))continue;
  const level=o.userData.buildingFloor,floor=BUILDING_FLOORS[level];
  for(let i=0;i<o.count;i++){
   o.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
   if(scale.y>1.6||scale.x<.45||i%4===0)continue; // no curtains across sliders
   normal.set(0,0,1).applyQuaternion(rotation);
   const inward=sign=>floor.envelope.some(path=>inside([position.x+normal.x*.22*sign,position.z+normal.z*.22*sign],path.polygon));
   const sign=inward(1)?1:inward(-1)?-1:0;if(!sign)continue;
   const material=fabrics[(i+level)%fabrics.length],key=level+':'+((i+level)%fabrics.length);
   if(!groups.has(key))groups.set(key,{parent:o.parent,level,material,matrices:[]});
   for(const side of [-1,1]){
    offset.set(side*scale.x*.33,0,0).applyQuaternion(rotation).addScaledVector(normal,.20*sign).add(position);
    groups.get(key).matrices.push(new THREE.Matrix4().compose(offset,rotation,new THREE.Vector3(scale.x*.28,scale.y-.06,1)));panels++;
   }
   if(!rods.has(level))rods.set(level,{parent:o.parent,matrices:[]});
   const direction=new THREE.Vector3(1,0,0).applyQuaternion(rotation),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
   offset.copy(position).addScaledVector(normal,.20*sign);offset.y+=scale.y/2-.025;
   rods.get(level).matrices.push(new THREE.Matrix4().compose(offset,q,new THREE.Vector3(1,scale.x-.04,1)));
  }
 }
 const append=(parent,geo,material,matrices,level,part)=>{if(!matrices.length)return;const mesh=new THREE.InstancedMesh(geo,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part,buildingFloor:level};mesh.computeBoundingSphere();parent.add(mesh);resources.push(mesh);};
 for(const {parent,level,material,matrices} of groups.values())append(parent,curtain,material,matrices,level,'public-curtain');
 for(const [level,{parent,matrices}] of rods)append(parent,rod,metal,matrices,level,'public-curtain-rod');
 return {sills,panels};
}
