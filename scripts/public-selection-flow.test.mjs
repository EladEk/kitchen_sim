import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import * as THREE from 'three';
import {DISTRICT,createDistrict,buildingTransform} from '../public-view/district.mjs';import {createSelectionController,fitSelectionCamera,buildingSelectionState} from '../public-view/selection-view.mjs';
test('actual viewer controller switches every building to a real floor and apartment, retaining its balcony and framing',async()=>{
 const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json','utf8')),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),model=await new THREE.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),scene=new THREE.Scene(),root=new THREE.Group(),district=createDistrict(model,site);scene.add(root,district.group);const selection=createSelectionController({root,model,district,nav}),camera=new THREE.PerspectiveCamera(48,.55,.06,1200),controls={target:new THREE.Vector3(),update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}},ray=new THREE.Raycaster();
 for(const b of DISTRICT){
  const floorState=buildingSelectionState({level:1,target:''},b.id);assert.equal(floorState.level,1);let view=selection.update(floorState);assert(!model.visible);assert(!district.group.visible);assert(view.content.children.length>50);assert(view.content.children.every(o=>o.userData.level===1));
  const apartmentState=buildingSelectionState({level:1,target:'unit:5:1'},b.id);assert.equal(apartmentState.target,'unit:5:1');view=selection.update(apartmentState);scene.updateMatrixWorld(true);assert(view.content.children.length>0);const box=fitSelectionCamera(camera,controls,view);camera.updateProjectionMatrix();
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<1&&Math.abs(p.y)<1,b.id+' selection outside the viewport');}
  const balcony=new THREE.Vector3(8,5,-24).applyMatrix4(buildingTransform(b));ray.set(balcony,new THREE.Vector3(0,-1,0));assert(ray.intersectObject(view.content,true).length>0,b.id+' balcony missing');
  selection.update({building:b.id,level:1,target:'unit:5:1'},{walking:true});assert(model.visible&&district.group.visible);
 }
 selection.dispose();district.dispose();
});
