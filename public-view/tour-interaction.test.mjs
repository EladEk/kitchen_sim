import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTourTap,pickTourSurface,tourActionData} from './tour-interaction.mjs';
import {createSelection} from './selection.mjs';

test('tour taps work without walking and cannot fire after a drag, multitouch, cancel or right click',()=>{
 const tap=createTourTap(),e=(x=10,y=10,id=1)=>({clientX:x,clientY:y,pointerId:id,button:0});
 tap.down(e());assert(tap.up(e(12)));
 tap.down(e());tap.move(e(40));tap.move(e());assert(!tap.up(e()),'returning a drag to its origin is still a drag');
 tap.down(e());tap.down(e(10,10,2));assert(!tap.up(e(10,10,2)));assert(!tap.up(e()));
 tap.down(e());tap.cancel();assert(!tap.up(e()));
 tap.down({...e(),button:2});assert(!tap.up(e()));
});
test('selected doors retain actions and live hinge transforms without recropping, and walls occlude them',()=>{
 const template=new THREE.Group(),parent=new THREE.Group();parent.position.set(2,0,2);template.add(parent);
 const hinge=new THREE.Group();hinge.userData={tourMotionId:'hinge',level:0};parent.add(hinge);
 const material=new THREE.MeshStandardMaterial(),geo=new THREE.BoxGeometry(.8,2,.04),leaf=new THREE.Mesh(geo,material);leaf.position.set(.4,1,0);leaf.userData={level:0,action:'door',doorId:'test'};hinge.add(leaf);
 const nav={floors:[{level:0,units:[{number:1,polygon:[[0,0],[4,0],[4,4],[0,4]]}]}],destinations:[{id:'unit:1:0',floor:0,unit:1}]},selection=createSelection(template,nav,{level:0,target:'unit:1:0'}),ray=new THREE.Raycaster(new THREE.Vector3(2.4,1,3),new THREE.Vector3(0,0,-1),0,20);
 let hit=pickTourSurface(ray,selection.group);assert.equal(tourActionData(hit.object).doorId,'test');const count=selection.group.children.length,drawn=hit.object;let disposed=0;geo.addEventListener('dispose',()=>disposed++);
 hinge.rotation.y=Math.PI/2;selection.sync();assert.equal(selection.group.children.length,count);assert.equal(pickTourSurface(ray,selection.group),null);assert(Math.abs(drawn.matrixWorld.elements[0])<1e-8);
 hinge.rotation.y=0;selection.sync();const wall=new THREE.Mesh(new THREE.BoxGeometry(1,2,.05),material);wall.position.set(2.4,1,2.5);selection.group.add(wall);hit=pickTourSurface(ray,selection.group);assert.equal(hit.object,wall);assert.equal(tourActionData(hit.object),null);
 assert.equal(ray.far,20);selection.dispose();assert.equal(disposed,0,'display copies never release shared geometry');geo.dispose();wall.geometry.dispose();material.dispose();
});
