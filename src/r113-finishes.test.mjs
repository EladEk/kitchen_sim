import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildGroundApartments} from './ground-apartments-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {groundTransform} from './ground-apartments.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';
import {installFloorCourses} from './building-finish-shaders.mjs';

test('actual exterior rays hit continuous stone across the three plaster partition end caps; interior plaster and openings remain',()=>{
 const root=new THREE.Group(),resources=[],groups=buildGroundApartments({root,resources,picks:[],settings:normalizeHomeSettings(),mode:'walk'}),unit=groups.get(1),t=groundTransform(1),[a,b,c,d]=t.matrix,inverse=new THREE.Matrix4().set(a,0,b,t.offset[0],0,1,0,0,c,0,d,t.offset[1],0,0,0,1).invert();unit.matrix.premultiply(inverse);unit.updateMatrixWorld(true);
 try{for(const z of [7.41,10.3,12.2]){const hits=new THREE.Raycaster(new THREE.Vector3(-.8,1.5,z),new THREE.Vector3(1,0,0),0,1).intersectObject(unit,true);assert(hits.length);const m=[hits[0].object.material].flat()[hits[0].face.materialIndex];assert.equal(m.userData.publicFinish,'stone',`partition at ${z} cannot bleed white through the facade`);}let belt=0,dry=0,wet=0;unit.traverse(o=>{if(o.userData.part==='garden-storey-separation'){belt+=o.count;assert(o.userData.tourNonPhysical);}if(o.userData.part==='ground-base-room'){assert.equal(o.material.userData.publicFinish,'floor');const p=o.material.userData.floorCourses;if(p.tile[0]===.3)wet++;else dry++;}});assert(belt>0&&dry>5&&wet>2);}finally{resources.forEach(r=>r.dispose?.());}
});
test('photo mode retains tile grain, recessed joints and matte variation without changing the live material',()=>{
 const source=new THREE.Scene(),material=new THREE.MeshStandardMaterial({color:'#d0cdc5'}),geometry=new THREE.PlaneGeometry(2,2);installFloorCourses(material,{tile:[.3,.3],joint:.003});source.add(new THREE.Mesh(geometry,material));const before=material.onBeforeCompile,snapshot=createPhotoScene(source);
 try{const m=snapshot.scene.children[0].material;assert(m.map.isDataTexture);assert.deepEqual(m.map.repeat.toArray(),[1/.3,1/.3]);const data=m.roughnessMap.image.data,size=m.roughnessMap.image.width;assert(data[0]>data[(size*200+200)*4]+30);assert.notEqual(m.bumpMap.image.data[0],m.bumpMap.image.data[(size*200+200)*4]);assert.equal(material.map,null);assert.equal(material.onBeforeCompile,before);}finally{snapshot.dispose();material.dispose();geometry.dispose();}
});
