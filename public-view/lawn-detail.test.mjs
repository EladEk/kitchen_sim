import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLawnDetail,lawnAt,lawnRegions} from './lawn-detail.mjs';
import {createWalkingWorld} from './walking-world.mjs';

const outer=[[-12,-12],[12,-12],[12,12],[-12,12]],hole=[[1,1],[4,1],[4,4],[1,4]],layers=[{y:0,polygons:[[outer,hole]]}];
test('nearby grass has blade silhouettes within real lawn polygons, bounded instances and deterministic placement',()=>{
 const lawn=createLawnDetail(layers,{mobile:true}),position=new THREE.Vector3(0,1.62,0),regions=lawnRegions(layers);lawn.update(position,400,{walking:true});assert(lawn.stats.count>500);assert(lawn.stats.count<=1500);assert.equal(lawn.mesh.castShadow,false);assert(lawn.mesh.userData.tourNonPhysical);
 const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),before=Array.from(lawn.mesh.instanceMatrix.array);for(let i=0;i<lawn.mesh.count;i++){lawn.mesh.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);assert(lawnAt(regions,p.x,p.z));assert(Math.hypot(p.x,p.z)<5.01);assert.equal(p.y,Math.fround(.001));}
 lawn.update(new THREE.Vector3(25,1.62,25),1000,{walking:true});assert.equal(lawn.mesh.count,0);lawn.update(position,1500,{walking:true});assert.deepEqual(Array.from(lawn.mesh.instanceMatrix.array),before);lawn.update(new THREE.Vector3(.8,1.62,0),2000,{walking:true,detailScale:.5});assert(lawn.mesh.count<=750);lawn.update(position,2400,{walking:false});assert.equal(lawn.mesh.visible,false);lawn.dispose();lawn.dispose();assert.equal(lawn.stats.count,0);
});

test('populated lawn never becomes floor support or a walking collision',()=>{
 const lawn=createLawnDetail(layers,{mobile:true});lawn.update(new THREE.Vector3(0,1.62,0),500,{walking:true});const scene=new THREE.Group(),floor=new THREE.Mesh(new THREE.BoxGeometry(24,.1,24),new THREE.MeshStandardMaterial());floor.position.y=-.05;scene.add(floor,lawn.mesh);const world=createWalkingWorld({model:new THREE.Group(),site:scene,buildings:[]});
 try{assert.equal(world.outside.stats.records,1);const ray=new THREE.Raycaster(new THREE.Vector3(0,1.62,0),new THREE.Vector3(0,-1,0),0,3),hit=world.firstHit(ray);assert(hit);assert(Math.abs(hit.point.y)<.00001);}finally{world.dispose();lawn.dispose();floor.geometry.dispose();floor.material.dispose();}
});
