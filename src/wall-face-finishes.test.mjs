import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {wallExteriorFaces,wallFaceMaterials} from './wall-face-finishes.mjs';
import {createHomeScene} from './home-scene.js';
import {buildGroundApartments} from './ground-apartments-scene.js';
import {buildBuildingContext} from './building-scene.js';
import {BUILDING_FLOORS} from './building-layout.mjs';
import {normalizeHomeSettings,HOUSE_OUTLINE,insidePolygon,CONSTRUCTION_WALLS} from './home-model.mjs';
import {groundTransform} from './ground-apartments.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';

function hitMaterial(mesh,origin,direction){mesh.updateWorldMatrix(true,false);const ray=new THREE.Raycaster(origin,direction,0,1),hit=ray.intersectObject(mesh,false)[0];assert(hit,'wall face must remain physically present');return [mesh.material].flat()[hit.face.materialIndex];}
function checkLocalWall(mesh,inside=point=>insidePolygon(point,HOUSE_OUTLINE)){
 const g=mesh.geometry;g.computeBoundingBox();const b=g.boundingBox,centre=b.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),size=b.getSize(new THREE.Vector3()).multiply(mesh.scale),wall=CONSTRUCTION_WALLS.find(w=>w.id===(mesh.userData.wallId||mesh.userData.baseWallId)),vertical=wall?Math.abs(wall.a[0]-wall.b[0])<.001:size.x<size.z,normal=vertical?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1),thickness=vertical?size.x:size.z;let checked=0;
 for(const sign of [-1,1]){const p=centre.clone().addScaledVector(normal,sign*(thickness/2+.24));if(!inside([p.x,p.z]))continue;const material=hitMaterial(mesh,p,normal.clone().multiplyScalar(-sign));assert.equal(material.userData.surfaceKind,'plaster',JSON.stringify({part:mesh.userData.part,wall:mesh.userData.wallId||mesh.userData.baseWallId,centre:centre.toArray(),size:size.toArray(),from:p.toArray(),normal:normal.toArray()}));assert.notEqual(material.userData.publicFinish,'stone');checked++;}return checked;
}
test('opposite broad faces have independent finishes and cut ends never inherit the stone material',()=>{
 const faces=wallExteriorFaces({centre:[0,0],normal:[1,0],thickness:.2,inside:p=>p[0]>0,positiveFace:0,negativeFace:1}),paint=new THREE.MeshStandardMaterial(),stone=new THREE.MeshStandardMaterial(),materials=wallFaceMaterials(paint,stone,faces);assert.equal(materials[0],paint);assert.equal(materials[1],stone);for(const i of [2,3,4,5])assert.equal(materials[i],paint);paint.dispose();stone.dispose();
});
test('ground base and personal external walls expose plaster to rooms in walking and building views',()=>{
 for(const mode of ['walk','building']){const home=createHomeScene(normalizeHomeSettings({cutaway:false}),{mode,context:false,daylight:false});let checked=0;
  try{home.group.updateMatrixWorld(true);home.group.traverse(o=>{if(o.userData.part==='architectural-wall'&&Array.isArray(o.material))checked+=checkLocalWall(o);});assert(checked>40);}finally{home.dispose();}
 }
 const root=new THREE.Group(),resources=[],groups=buildGroundApartments({root,resources,picks:[],settings:normalizeHomeSettings(),mode:'walk'}),unit=groups.get(1),registration=groundTransform(1),[a,b,c,d]=registration.matrix,inverse=new THREE.Matrix4().set(a,0,b,registration.offset[0],0,1,0,0,c,0,d,registration.offset[1],0,0,0,1).invert();unit.updateMatrixWorld(true);let count=0;
 try{unit.traverse(o=>{if(o.userData.part!=='ground-base-wall')return;const local=o.clone(false);local.matrixAutoUpdate=false;local.matrix.copy(inverse.clone().multiply(o.matrixWorld));local.updateMatrixWorld(true);count+=checkLocalWall(local);});assert(count>40);}finally{for(const r of resources)r.dispose?.();}
});
test('upper facade batches keep their inward-facing broad surfaces plaster, with unchanged physical wall bounds',()=>{
 const group=new THREE.Group(),resources=[],model=buildBuildingContext({group,resources,settings:normalizeHomeSettings({cutaway:false,buildingLevel:9}),mode:'walk'}),matrix=new THREE.Matrix4(),centre=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();let checked=0,stone=0;
 try{group.updateMatrixWorld(true);group.traverse(o=>{if(o.userData.part!=='building-facade-wall'||!o.isInstancedMesh)return;const def=BUILDING_FLOORS[o.userData.buildingFloor],inside=p=>def.units.some(u=>insidePolygon(p,u.polygon))||insidePolygon(p,def.core);for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(centre,rotation,scale);const normal=new THREE.Vector3(0,0,1).applyQuaternion(rotation);for(const sign of [-1,1]){const p=centre.clone().addScaledVector(normal,sign*(scale.z/2+.24));if(inside([p.x,p.z])){assert.equal(o.material[sign>0?4:5].userData.surfaceKind,'plaster');checked++;}else if(o.material[sign>0?4:5].userData.surfaceKind==='limestone')stone++;}}});assert(checked>150);assert(stone>100,'outer stone must remain present');}finally{for(const r of resources)r.dispose?.();}
});
test('photo snapshots retain the same per-face interior/exterior assignment as the walking renderer',()=>{
 const paint=new THREE.MeshStandardMaterial({color:'#f1efe9'}),stone=new THREE.MeshStandardMaterial({color:'#d9d2c5'});paint.userData.surfaceKind='plaster';stone.userData={surfaceKind:'limestone',publicFinish:'stone'};const faces=wallExteriorFaces({centre:[0,0],normal:[1,0],thickness:.2,inside:p=>p[0]>0,positiveFace:0,negativeFace:1}),geometry=new THREE.BoxGeometry(.2,2.75,3),wall=new THREE.Mesh(geometry,wallFaceMaterials(paint,stone,faces)),scene=new THREE.Scene();wall.position.y=1.375;scene.add(wall);const photo=createPhotoScene(scene,{textureSize:64});
 try{const copy=photo.scene.children.find(o=>o.isMesh);assert.equal(hitMaterial(copy,new THREE.Vector3(.4,1.5,0),new THREE.Vector3(-1,0,0)).userData.surfaceKind,'plaster');assert.equal(hitMaterial(copy,new THREE.Vector3(-.4,1.5,0),new THREE.Vector3(1,0,0)).userData.surfaceKind,'limestone');}finally{photo.dispose();geometry.dispose();paint.dispose();stone.dispose();}
});
