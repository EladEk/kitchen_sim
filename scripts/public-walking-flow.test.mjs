import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createDistrict, DISTRICT, buildingTransform} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {createSelectionController} from '../public-view/selection-view.mjs';
import {stepWalker} from '../public-view/walking.mjs';

test('actual district repeatedly enters 4103 with one collision model, bounded buffers and correct building/floor handoff',async()=>{
 const load=async name=>JSON.parse(await readFile('dist/client/baseline/'+name+'.json','utf8'));
 const [json,nav,site]=await Promise.all([load('building'),load('navigation'),load('site')]);
 const model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),scene=new THREE.Scene(),root=new THREE.Group();scene.add(root,district.group);
 const controller=createSelectionController({root,model,district,nav}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 const geometries=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
 const bytes=[...geometries].reduce((n,g)=>n+Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,g.index?.array.byteLength||0),0),initialMemory=world.memory.indexBytes,records=world.building.stats.records;
 assert(bytes<85e6,'district geometry stays below the R96 147MB allocation');assert(initialMemory<9e6);assert.equal(world.stats.collisionCopies,1);
 const lobby=nav.destinations.find(d=>d.id==='lobby'),state={building:'4102',level:9,target:''};let now=0;
 for(let pass=0;pass<16;pass++)for(const id of ['4102','4103','3461','4103','4102']){
  const building=DISTRICT.find(b=>b.id===id),matrix=buildingTransform(building),p=new THREE.Vector3(lobby.position[0],1.62,lobby.position[1]).applyMatrix4(matrix);
  const view=controller.update(state,{walking:true,position:p});assert.equal(view.building.id,id);assert.equal(view.content,model);
  district.update(p,now+=300,{walking:true});
  const movement=new THREE.Vector3(.025,0,0).transformDirection(matrix).multiplyScalar(.025);
  assert(stepWalker(p,movement.x,movement.z,world,ray),id+' lobby floor must support movement');
  assert(world.stats.buildingQueries<=1);assert(world.stats.narrowTests<40);assert.equal(world.building.stats.records,records);assert.equal(world.memory.indexBytes,initialMemory);
 }
 // An old apartment crop must not retain generated buffers during a long tour.
 const cropped=controller.update({building:'4103',level:1,target:'unit:5:1'}).content;let released=0;
 const cropGeometries=new Set();cropped.traverse(o=>{if(o.geometry&&!geometries.has(o.geometry))cropGeometries.add(o.geometry);});assert(cropGeometries.size>0);for(const geometry of cropGeometries)geometry.addEventListener('dispose',()=>released++);
 const same=controller.update({building:'3461',level:1,target:'unit:5:1'}).content;assert.equal(same,cropped,'equal canonical apartment cuts are reused across building transforms');
 controller.update(state,{walking:true,position:new THREE.Vector3(lobby.position[0],1.62,lobby.position[1]).applyMatrix4(buildingTransform(DISTRICT[4]))});
 assert.equal(released,cropGeometries.size);assert.equal(root.children.length,1);assert(!cropped.parent);
 // Upper exterior meshes survive walking floor culling even under interior groups.
 model.traverse(o=>{if(o.isMesh&&o.userData.exterior&&o.userData.level>2){let parent=o;while(parent){assert(parent.visible,'upper facade must remain visible');parent=parent.parent;}}});
 controller.update(state);model.traverse(o=>{if(o.isMesh&&o.userData.exterior===false)assert(o.visible,'overview restores interiors');});
 const unique=new Set();district.group.traverse(o=>{if(o.isInstancedMesh){let n=0;o.addEventListener('dispose',()=>n++);unique.add(()=>assert.equal(n,1));}});
 controller.dispose();world.dispose();world.dispose();district.dispose();district.dispose();unique.forEach(check=>check());
});
