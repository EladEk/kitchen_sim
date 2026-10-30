import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {updateTourCamera} from './tour-controls.mjs';
import {createSpatialCollisionIndex} from './walking-world.mjs';
import {stepWalker} from './walking.mjs';

test('opening options repeatedly in a tour preserves exact camera pose and resumes walking on the same floor',()=>{
 const camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,14,0);controls.enabled=false;
 const floor=new THREE.Mesh(new THREE.BoxGeometry(100,.2,100),new THREE.MeshBasicMaterial());floor.position.y=-.1;const root=new THREE.Group();root.add(floor);const world=createSpatialCollisionIndex(root),ray=new THREE.Raycaster();
 camera.position.set(12,1.62,7);camera.rotation.set(.2,1.1,0,'YXZ');const position=camera.position.clone(),quaternion=camera.quaternion.clone();
 controls.update();assert(camera.position.distanceTo(position)>.1,'disabled OrbitControls still changes the walking position when explicitly updated');camera.position.copy(position);camera.quaternion.copy(quaternion);
 let steps=0;const move=()=>{steps++;stepWalker(camera.position,.025,0,world,ray);};
 for(let opening=0;opening<50;opening++)for(let frame=0;frame<10;frame++)updateTourCamera({walking:true,paused:true,controls,move});
 assert.deepEqual(camera.position.toArray(),position.toArray());assert.deepEqual(camera.quaternion.toArray(),quaternion.toArray());assert.equal(steps,0);
 updateTourCamera({walking:true,paused:false,controls,move});assert.equal(steps,1);assert(camera.position.x>position.x);assert(Math.abs(camera.position.y-1.62)<1e-6);assert.deepEqual(camera.quaternion.toArray(),quaternion.toArray());
 world.dispose();floor.geometry.dispose();floor.material.dispose();controls.domElement={style:{},removeEventListener(){},ownerDocument:{removeEventListener(){}},getRootNode(){return {removeEventListener(){}};}};controls.dispose();
});
