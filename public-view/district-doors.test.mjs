import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDistrictDoorController,publicDoorCatalog} from './district-doors.mjs';
import {createDoorContext} from './door-context.mjs';
import {DISTRICT,buildingTransform,mirroredGeometry} from './district.mjs';
import {createWalkingWorld} from './walking-world.mjs';
import {createSelectionController} from './selection-view.mjs';
import {markPublicDoor} from '../src/public-door-motion.mjs';

function fixture(){const model=new THREE.Group(),pivot=new THREE.Group();pivot.position.set(11,0,0);pivot.rotation.y=-Math.PI/2;model.add(pivot);const geometry=new THREE.BoxGeometry(1,2,.06),material=new THREE.MeshStandardMaterial(),leaf=new THREE.Mesh(geometry,material);leaf.position.set(.5,1,0);leaf.userData={level:0,exterior:false};pivot.add(leaf);markPublicDoor(pivot,{id:'test',open:-Math.PI/2,kind:'entry'});model.updateMatrixWorld(true);return {model,pivot,geometry,material,leaf,dispose(){geometry.dispose();material.dispose();}};}
const memoryStorage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
test('door states are independent across all eight buildings and survive reload; switching the shared model restores the right pose',()=>{
 const f=fixture(),storage=memoryStorage(),controller=createDistrictDoorController({model:f.model,storage});
 for(const b of DISTRICT){controller.activate(b.id);assert.equal(f.pivot.rotation.y,-Math.PI/2);assert(controller.onSelect({action:'district-door',doorId:'test'},b.id));assert.equal(f.pivot.rotation.y,0);assert.equal(controller.isOpen(b.id,'test'),false);}
 assert.equal(controller.stats.overrides,8);controller.dispose();const restored=createDistrictDoorController({model:f.model,storage});for(const b of DISTRICT){restored.activate(b.id);assert.equal(f.pivot.rotation.y,0);}assert(!restored.onSelect({action:'district-door',doorId:'missing'},'4102'));assert(!restored.onSelect({action:'district-door',doorId:'test'},'unknown'));
 assert(restored.onSelect({action:'district-door',doorId:'test'},'4103'));restored.activate('4102');assert.equal(f.pivot.rotation.y,0);restored.activate('4103');assert.equal(f.pivot.rotation.y,-Math.PI/2);assert.equal(restored.stats.overrides,7);restored.dispose();f.dispose();
});
test('context doors share geometry, retain positive instance determinants for mirrors, and update only the chosen building',()=>{
 const f=fixture(),c=createDistrictDoorController({model:f.model,storage:memoryStorage()}),context=createDoorContext([{source:f.model,members:DISTRICT,include:()=>true}],{getOpen:c.isOpen,transform:buildingTransform,mirrorGeometry:g=>mirroredGeometry(g,[0,0])}),matrix=new THREE.Matrix4();
 context.setVisibility('none',null);const before=new Map();context.group.traverse(o=>{if(!o.isInstancedMesh)return;before.set(o,o.instanceMatrix.array.slice());for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);assert(matrix.determinant()>0);}});assert.equal(context.stats.instances,8);assert.equal(context.stats.batches,2);
 c.activate('3461');assert(c.onSelect({action:'district-door',doorId:'test'},'3461'));context.sync('3461','test');let changed=0;for(const [mesh,data] of before){for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert(matrix.determinant()>0);if(data.slice(i*16,i*16+16).some((v,k)=>v!==mesh.instanceMatrix.array[i*16+k]))changed++;}}assert.equal(changed,1);let releases=0;f.geometry.addEventListener('dispose',()=>releases++);context.dispose();context.dispose();assert.equal(releases,0);c.dispose();f.dispose();
});
test('closed doors update the actual collision query in one building while other copies and cropped hinges stay independent',()=>{
 const f=fixture(),storage=memoryStorage();let world,selection;const c=createDistrictDoorController({model:f.model,storage,onChange:({building,source})=>{world.refreshDoors(building,source);selection.sync();}}),root=new THREE.Group(),district={group:new THREE.Group(),setActiveBuilding(){}};
 world=createWalkingWorld({model:f.model,site:new THREE.Group()});const nav={storey:3.1,floors:[{level:0,units:[{number:1,polygon:[[9,-2],[14,-2],[14,2],[9,2]]}]}],destinations:[{id:'unit:1:0',floor:0,unit:1}]};selection=createSelectionController({root,model:f.model,district,nav,doorController:c});
 const rayFor=id=>{const b=DISTRICT.find(b=>b.id===id),m=buildingTransform(b),origin=new THREE.Vector3(11.5,1,.5).applyMatrix4(m),direction=new THREE.Vector3(0,0,-1).transformDirection(m);return new THREE.Raycaster(origin,direction,0,1);};
 const view=selection.update({building:'4103',level:0,target:'unit:1:0'}),geometries=new Set();view.content.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});assert.equal(world.firstHit(rayFor('4103')),null);assert(c.onSelect({action:'district-door',doorId:'test'},'4103'));assert.equal(world.firstHit(rayFor('4103'))?.buildingId,'4103');assert.equal(world.firstHit(rayFor('4102')),null);let closed;view.content.traverse(o=>{if(o.userData.tourDoor)closed=o;});assert.equal(closed.rotation.y,0);
 const bytes=world.memory.indexBytes,trees=world.memory.sharedBVHs;for(let i=0;i<30;i++){c.onSelect({action:'district-door',doorId:'test'},'4103');assert(world.memory.indexBytes<=bytes+128);if(i%2===1)assert.equal(world.memory.indexBytes,bytes);assert.equal(world.memory.sharedBVHs,trees);}const after=new Set();view.content.traverse(o=>{if(o.geometry)after.add(o.geometry);});assert.deepEqual(after,geometries);selection.update({building:'4102',level:0,target:'unit:1:0'});assert.equal(f.pivot.rotation.y,-Math.PI/2);
 selection.update({building:'4102',level:9,target:''});assert(!f.leaf.visible,'whole-building doors use the instanced display');selection.update({building:'4102',level:0,target:'unit:1:0'});let drawn;selection.current.content.traverse(o=>{if(o.isMesh&&o.userData.doorId==='test')drawn=o;});assert(drawn?.visible,'apartment selection restores a directly clickable moving copy');
 selection.dispose();world.dispose();assert.equal(world.memory.indexBytes,0);c.dispose();f.dispose();
 const fresh=fixture(),restored=createDistrictDoorController({model:fresh.model,storage}),again=createWalkingWorld({model:fresh.model,site:new THREE.Group()});restored.initializeCollisions((id,source)=>again.refreshDoors(id,source));restored.activate('4102');assert.equal(again.firstHit(rayFor('4103'))?.buildingId,'4103');assert.equal(again.firstHit(rayFor('4102')),null);again.dispose();restored.dispose();fresh.dispose();
});
