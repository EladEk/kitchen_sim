import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {createPhotoScene} from '../src/photoreal-scene.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';
import {createWalkingDisplay} from '../public-view/walking-display.mjs';

function hit(root,point,direction){root.updateMatrixWorld(true);const ray=new THREE.Raycaster(point,direction,0,5),hit=ray.intersectObject(root,true).find(h=>h.object.isMesh);assert(hit);return {object:hit.object,material:[hit.object.material].flat()[hit.face.materialIndex]};}
test('the actual exported kitchen party wall is white plaster in the source, walking batch and every registered building',async()=>{
 const model=await new THREE.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),point=new THREE.Vector3(9.4,2.35,3.5),direction=new THREE.Vector3(1,0,0),finish=restorePublicFinishes(model,{mobile:true});await finish.ready;
 let district,walking;const check=(root,p,d)=>{const material=hit(root,p,d).material;assert.equal(material.userData.surfaceKind,'plaster');assert.equal(material.color.getHexString(),'f5f5f3');};
 try{
  const corner=hit(model,new THREE.Vector3(.798,1.375,-.15),new THREE.Vector3(1,0,0)).material;assert.equal(corner.userData.surfaceKind,'limestone');assert.equal(corner.color.getHexString(),'d9d2c5');
  check(model,point,direction);walking=createWalkingDisplay(model);walking.update(0);check(walking.group,point,direction);
  district=createDistrict(model,site,{mobile:true});district.setActiveBuilding(null,{includeActive:true});for(const building of DISTRICT){const matrix=buildingTransform(building);check(district.group,point.clone().applyMatrix4(matrix),direction.clone().transformDirection(matrix));}
 }finally{walking?.dispose();district?.dispose();const owned=new Set(finish.textures);finish.dispose();disposeObjectResources(model,{skipTextures:owned});}
});
test('the real master-room facade stays stone outside and plaster inside after export, district batching, mirrors and photo conversion',async()=>{
 const json=JSON.parse(await readFile('dist/client/baseline/building.json','utf8')),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),model=await new THREE.ObjectLoader().parseAsync(json),finish=restorePublicFinishes(model,{mobile:true});await finish.ready;let district;
 try{
  const inward=hit(model,new THREE.Vector3(1.7,1.6,14.65),new THREE.Vector3(-1,0,0));assert.equal(inward.material.userData.surfaceKind,'plaster');assert.equal(hit(model,new THREE.Vector3(-1,1.6,14.65),new THREE.Vector3(1,0,0)).material.userData.surfaceKind,'limestone');
  const wall=inward.object.clone(false),sample=new THREE.Scene();wall.matrixAutoUpdate=false;wall.matrix.copy(inward.object.matrixWorld);sample.add(wall);const photo=createPhotoScene(sample,{textureSize:64});try{assert.equal(hit(photo.scene,new THREE.Vector3(1.7,1.6,14.65),new THREE.Vector3(-1,0,0)).material.userData.surfaceKind,'plaster');}finally{photo.dispose();}
  district=createDistrict(model,site,{mobile:true});for(const id of ['4103','3461','3471']){const matrix=buildingTransform(DISTRICT.find(b=>b.id===id)),point=new THREE.Vector3(1.7,1.6,14.65).applyMatrix4(matrix),direction=new THREE.Vector3(-1,0,0).transformDirection(matrix);assert.equal(hit(district.group,point,direction).material.userData.surfaceKind,'plaster',id);}
 }finally{district?.dispose();const owned=new Set(finish.textures);finish.dispose();disposeObjectResources(model,{skipTextures:owned});}
});
