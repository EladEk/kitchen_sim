import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GREY_FACADE_COLOR,GREY_FACADE_ROUGHNESS,facadeAccentBays} from '../src/facade-accents.mjs';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {createWalkingDisplay} from '../public-view/walking-display.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';

test('real exported grey balcony bands keep one matte material and their actual outward faces in every district registration and walking display',async()=>{
 const model=await new THREE.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),finish=restorePublicFinishes(model,{mobile:true}),district=createDistrict(model,site,{mobile:true}),walking=createWalkingDisplay(model),grey=new Set(),meshes=[];
 try{
  district.setActiveBuilding(null);district.group.updateMatrixWorld(true);district.group.traverse(o=>{if(o.isMesh&&[o.material].flat().some(m=>m.userData.publicFinish==='render')){meshes.push(o);for(const m of [o.material].flat())if(m.userData.publicFinish==='render')grey.add(m);}});assert.equal(grey.size,1);
  const material=[...grey][0];assert.equal(material.color.getHexString(),GREY_FACADE_COLOR.slice(1));assert.equal(material.roughness,GREY_FACADE_ROUGHNESS);assert(!material.map&&!material.normalMap&&!material.bumpMap);
  for(const building of DISTRICT){const transform=buildingTransform(building);for(const level of [1,3,6])for(const bay of facadeAccentBays(level)){
   const centre=bay.a.map((v,i)=>(v+bay.b[i])/2),point=new THREE.Vector3(centre[0],level*3.1-.20,centre[1]).applyMatrix4(transform),outward=new THREE.Vector3(bay.normal[0],0,bay.normal[1]).transformDirection(transform),hit=new THREE.Raycaster(point.clone().addScaledVector(outward,.6),outward.clone().negate(),0,1).intersectObjects(meshes,false)[0];
   assert(hit,`${building.id} floor ${level} bay ${bay.index} retains its grey front`);
   // The render-only union uses the outer plane for registered face layers
   // within 16mm. Native floor sheets differ slightly between storeys.
   assert(Math.abs(hit.point.distanceTo(point)-.16)<.01603,'front profile stays within the documented consolidation tolerance');
  }}
  walking.update(0);let visible=0;walking.group.traverseVisible(o=>{if(o.isMesh&&o.material?.userData.publicFinish==='render')visible++;});assert(visible>=6,'grey exterior remains visible while walking on ground level');
 }finally{walking.dispose();district.dispose();finish.dispose();disposeObjectResources(model);}
});
