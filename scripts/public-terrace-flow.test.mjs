import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GARDEN_TERRACES} from '../src/garden-terraces.mjs';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {createWalkingDisplay} from '../public-view/walking-display.mjs';

test('all four contractor terraces survive actual public export, walking batches and every rotated/reflected building',async()=>{
 const model=await new T.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8'));
 const centres=GARDEN_TERRACES.map(t=>new T.Vector3(t.polygon.reduce((s,p)=>s+p[0]/t.polygon.length,0),.25,t.polygon.reduce((s,p)=>s+p[1]/t.polygon.length,0)));
 const check=(root,p)=>{root.updateMatrixWorld(true);const hit=new T.Raycaster(p,new T.Vector3(0,-1,0),0,.5).intersectObject(root,true).find(h=>h.object.isMesh);assert(hit);assert(Math.abs(hit.point.y-.008)<.001);const material=[hit.object.material].flat()[hit.face.materialIndex];assert.equal(material.color.getHexString(),'d2c6b2');assert.equal(material.userData.surfaceKind,'cement');};
 let walking,district;try{for(const p of centres)check(model,p);walking=createWalkingDisplay(model);walking.update(0);for(const p of centres)check(walking.group,p);district=createDistrict(model,site,{mobile:true});district.setActiveBuilding(null,{includeActive:true});for(const building of DISTRICT)for(const p of centres)check(district.group,p.clone().applyMatrix4(buildingTransform(building)));}finally{walking?.dispose();district?.dispose();}
});
