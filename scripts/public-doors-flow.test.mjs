import test from 'node:test';
import {LOBBY_WALL_COLOR} from '../src/common-finish.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {DISTRICT,createDistrict} from '../public-view/district.mjs';
import {createDistrictDoorController,publicDoorCatalog} from '../public-view/district-doors.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {createSelectionController} from '../public-view/selection-view.mjs';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';

const load=async name=>JSON.parse(await readFile('dist/client/baseline/'+name+'.json','utf8'));
test('every standard door has two poses, all 43 apartment entries are dark, and every floor has a separate corridor finish',async()=>{
 const model=await new THREE.ObjectLoader().parseAsync(await load('building')),catalog=publicDoorCatalog(model);assert.equal(catalog.size,402);const entries=[...catalog.values()].filter(r=>r.userData.tourDoor.kind==='entry');assert.equal(entries.length,43);
 for(const root of entries){let solid=0;root.traverse(o=>{if(o.isMesh&&o.material?.userData.surfaceKind==='door'){assert.equal(o.material.color.getHexString(),'536c66');solid++;}});assert(solid,'each apartment entry has an opaque dark leaf');}
 const corridorFloors=new Set();model.traverse(o=>{if(o.isMesh&&o.material?.color?.getHexString()===LOBBY_WALL_COLOR.slice(1)&&o.material.userData.surfaceKind==='plaster')corridorFloors.add(o.userData.level);});assert.deepEqual([...corridorFloors].sort(),[0,1,2,3,4,5,6,7,8]);
 const c=createDistrictDoorController({model});for(const root of catalog.values()){const d=root.userData.tourDoor;assert(Math.abs(d.open-d.closed)>.1,d.id);assert(c.onSelect({action:'district-door',doorId:d.id},'4102'));assert.equal(root[d.axis][d.property],d.defaultOpen?d.closed:d.open);assert(c.onSelect({action:'district-door',doorId:d.id},'4102'));assert.equal(root[d.axis][d.property],d.defaultOpen?d.open:d.closed);}assert.equal(c.stats.overrides,0);c.dispose();disposeObjectResources(model);
});

test('all 43 entries block while closed and release their old collider after opening in every rotated or mirrored building',async()=>{
 const [json,nav,site]=await Promise.all(['building','navigation','site'].map(load)),model=await new THREE.ObjectLoader().parseAsync(json),finish=restorePublicFinishes(model,{mobile:true});await finish.ready;let world,selection,district;
 const doors=createDistrictDoorController({model,onChange:({building,doorId,source})=>{world.refreshDoors(building,source);selection.sync();district.syncDoor(building,doorId);}});district=createDistrict(model,site,{mobile:true,doorController:doors});const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root,district.group);selection=createSelectionController({root,model,district,nav,doorController:doors});world=createWalkingWorld({model,site:district.collisionRoot});
 assert(district.doorStats.batches<=24,'distant doors stay in a small set of instanced batches');const catalog=publicDoorCatalog(model),entries=[...catalog.values()].filter(r=>r.userData.tourDoor.kind==='entry'),matrix=new THREE.Matrix4(),instance=new THREE.Matrix4(),scales=new THREE.Vector3(),normal=new THREE.Vector3();let checked=0;
 for(const b of DISTRICT){selection.update({building:b.id,level:9,target:''});for(const pivot of entries){const d=pivot.userData.tourDoor;assert(doors.onSelect({action:'district-door',doorId:d.id},b.id));scene.updateMatrixWorld(true);let leaf;pivot.traverse(o=>{if(!leaf&&o.isMesh&&o.material?.userData.surfaceKind==='door')leaf=o;});assert(leaf);matrix.copy(leaf.matrixWorld);if(leaf.isInstancedMesh){leaf.getMatrixAt(0,instance);matrix.multiply(instance);}leaf.geometry.computeBoundingBox();const center=leaf.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(matrix);scales.setFromMatrixScale(matrix);const axis=['x','y','z'].reduce((a,k)=>Math.abs(scales[k])<Math.abs(scales[a])?k:a,'x');normal.set(0,0,0)[axis]=1;normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(matrix));const ray=new THREE.Raycaster(center.clone().addScaledVector(normal,.12),normal.clone().negate(),0,.24),closed=world.firstHit(ray);assert.equal(closed?.object.userData.doorId,d.id,b.id+' / '+d.id+' closes physically');assert.equal(closed.buildingId,b.id);assert(doors.onSelect({action:'district-door',doorId:d.id},b.id));assert.equal(world.firstHit(ray),null,b.id+' / '+d.id+' leaves the doorway clear');checked++;}}
 assert.equal(checked,344);assert.equal(doors.stats.overrides,0);assert(world.memory.indexBytes<7e6);assert(world.memory.doorIndexes<=9);console.log('Verified entry poses:',checked,'; context batches:',district.doorStats.batches,'; collision bytes:',world.memory.indexBytes);
 selection.dispose();world.dispose();district.dispose();doors.dispose();finish.dispose();disposeObjectResources(model,{skipTextures:new Set(finish.textures)});
});
