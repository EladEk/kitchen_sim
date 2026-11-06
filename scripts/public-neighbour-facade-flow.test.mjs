import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {FACADE_COLOR,FACADE_ROUGHNESS} from '../src/facade-finish.mjs';

test('actual exported facade preserves the same dry finish and outward surfaces in all eight rotated and mirrored district copies',async()=>{
 const model=await new T.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),finish=restorePublicFinishes(model,{mobile:true}),district=createDistrict(model,site,{mobile:true}),walls=[],stones=new Set();
 try{
  district.setActiveBuilding(null);model.updateMatrixWorld(true);district.group.updateMatrixWorld(true);
  model.traverse(o=>{if(o.isMesh&&[o.material].flat().some(m=>m.userData.publicFinish==='stone'||m.userData.wallCavity))walls.push(o);});
  district.group.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData.publicFinish==='stone')stones.add(m);});assert.equal(stones.size,1,'one shared stone finish covers the whole district');
  for(const m of stones){assert.equal(m.color.getHexString(),FACADE_COLOR.slice(1));assert.equal(m.roughness,FACADE_ROUGHNESS);assert.equal(m.metalness,0);assert.equal(m.normalScale.x,.035);const pixels=m.map.image.data,values=Array.from(pixels).filter((_,i)=>i%4!==3);assert(Math.max(...new Set(values))-Math.min(...new Set(values))<12);assert(m.customProgramCacheKey().includes('r134'));}
  const controls=[];for(const floor of [1,3,6])for(const x of [3.5,7,16,20]){const origin=new T.Vector3(x,floor*3.1+.45,-26),direction=new T.Vector3(0,0,1),hit=new T.Raycaster(origin,direction,0,45).intersectObjects(walls,false)[0];if(!hit)continue;const material=[hit.object.material].flat()[hit.face.materialIndex]||hit.object.material;if(material.userData.publicFinish==='stone')controls.push({point:hit.point.clone(),outward:direction.clone().negate()});}assert(controls.length>=9,'use real solid facade controls across three storeys');
  for(const b of DISTRICT){const matrix=buildingTransform(b),nm=new T.Matrix3().getNormalMatrix(matrix);for(const {point,outward}of controls){const p=point.clone().applyMatrix4(matrix),n=outward.clone().applyMatrix3(nm).normalize(),hits=new T.Raycaster(p.clone().addScaledVector(n,.3),n.negate(),0,.6).intersectObject(district.group,true),hit=hits.find(h=>h.face&&!(Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material).transparent);assert(hit,b.id+' facade missing');const m=[hit.object.material].flat()[hit.face.materialIndex]||hit.object.material;assert.equal(m.userData.publicFinish,'stone',b.id+' facade changed to plaster');assert(hit.point.distanceTo(p)<.003,b.id+' cladding shifted after merging');}}
 }finally{district.dispose();finish.dispose();const geometries=new Set(),materials=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean))materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
});
