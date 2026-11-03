import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createScanMaterialController} from './scanned-material-core.mjs';

const scans={fabric:{color:'color',normal:'normal',roughness:'roughness',metres:.3,strength:.38,rough:.97,environment:.38}};
test('scans retain chosen colours and product floors, use real metre UVs and linear data maps, and release all owned textures once',async()=>{
 const scene=new THREE.Group(),cloth=new THREE.MeshPhysicalMaterial({color:'#a7ad95'}),ordered=new THREE.MeshPhysicalMaterial(),textures=[];cloth.userData.surfaceKind='fabric';ordered.userData={surfaceKind:'fabric',productId:'ordered-floor'};scene.add(new THREE.Mesh(new THREE.BoxGeometry(),cloth),new THREE.Mesh(new THREE.BoxGeometry(),ordered));const color=cloth.color.clone();let disposed=0,calls=0;
 const controller=createScanMaterialController({scans,loader:async()=>{calls++;const t=new THREE.Texture({width:1024,height:1024});t.addEventListener('dispose',()=>disposed++);textures.push(t);return t;}});
 await controller.apply(scene);await controller.apply(scene);assert.equal(calls,3);assert(cloth.color.equals(color));assert.equal(cloth.map.colorSpace,THREE.SRGBColorSpace);assert.equal(cloth.normalMap.colorSpace,THREE.NoColorSpace);assert.equal(cloth.roughnessMap.colorSpace,THREE.NoColorSpace);assert.equal(cloth.normalMap.repeat.x,1/.3);assert.equal(cloth.normalScale.x,.38);assert.equal(cloth.bumpMap,null);assert.equal(cloth.specularIntensity,.3);assert.equal(ordered.map,null);assert.equal(cloth.userData.scannedPBR.metres,.3);
 controller.dispose();controller.dispose();assert.equal(disposed,3);assert.equal(controller.textures.length,0);for(const m of [cloth,ordered])m.dispose();scene.traverse(o=>o.geometry?.dispose());
});

test('late completion after cancellation cannot bind textures or start additional decoders',async()=>{
 let finish,calls=0,disposed=0;const scene=new THREE.Group(),material=new THREE.MeshStandardMaterial();material.userData.surfaceKind='fabric';scene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));const controller=createScanMaterialController({scans,loader:()=>{calls++;return new Promise(r=>finish=r);}}),applying=controller.apply(scene);controller.dispose();const texture=new THREE.Texture();texture.addEventListener('dispose',()=>disposed++);finish(texture);await applying;assert.equal(calls,1);assert.equal(disposed,1);assert.equal(material.map,null);assert.equal(controller.stats.materials,0);scene.children[0].geometry.dispose();material.dispose();
});

test('paint and plaster share their GPU maps while doors retain their selected colour and lawn retains natural albedo',async()=>{
 const scan={normal:'wall-normal',roughness:'wall-rough',metres:3,strength:.18,rough:.9,environment:.5},profiles={paint:scan,plaster:{...scan,strength:.38},door:{...scan,normal:'door-normal',metres:1.8},grass:{color:'grass',normal:'grass-normal',roughness:'grass-rough',metres:1.4,strength:.32,rough:1,environment:.35,naturalColor:true,source:'ambientCG',technique:'procedural'}},scene=new THREE.Group(),materials={};let loaded=0;
 for(const kind of Object.keys(profiles)){const m=new THREE.MeshStandardMaterial({color:kind==='door'?'#536c66':'#7f9565'});m.userData.surfaceKind=kind;materials[kind]=m;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),m));}const doorColour=materials.door.color.clone(),controller=createScanMaterialController({scans:profiles,loader:async()=>{loaded++;return new THREE.Texture({width:1024,height:1024});}});await controller.apply(scene);assert.equal(materials.paint.normalMap,materials.plaster.normalMap);assert.equal(materials.paint.roughnessMap,materials.plaster.roughnessMap);assert.equal(loaded,7);assert(materials.door.color.equals(doorColour));assert(materials.grass.color.equals(new THREE.Color('#ffffff')));assert.equal(materials.grass.roughness,1);assert.equal(materials.grass.userData.scannedPBR.technique,'procedural');controller.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});
