import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {updateViewDepth} from './view-depth.mjs';

const depth=(p,c)=>Math.round((p.clone().project(c).z*.5+.5)*(2**24-1));
test('zoomed-out camera distinguishes the former grass/paving elevations in a 24-bit depth buffer',()=>{
 for(const distance of [60,150,300,600]){
  const camera=new THREE.PerspectiveCamera(48,1,.06,1200),focus=new THREE.Vector3();
  camera.position.set(0,distance*.7,distance*Math.sqrt(.51));camera.lookAt(focus);camera.updateMatrixWorld(true);
  const grass=new THREE.Vector3(0,-.09,0),paving=new THREE.Vector3(0,-.039,0);
  const before=Math.abs(depth(grass,camera)-depth(paving,camera));
  updateViewDepth(camera,focus);
  const after=Math.abs(depth(grass,camera)-depth(paving,camera));
  assert(after>=9,`${distance}m: ${after} depth steps`);
  assert(after>before,`${distance}m: precision improved`);
  assert(focus.clone().project(camera).z<1);
 }
});
test('walking restores close detail, and WebXR keeps control of its own projection',()=>{
 const camera=new THREE.PerspectiveCamera(48,1,.06,1200),focus=new THREE.Vector3();camera.position.set(0,400,400);camera.lookAt(focus);camera.updateMatrixWorld(true);
 updateViewDepth(camera,focus);assert(camera.near>1);
 updateViewDepth(camera,focus,{walking:true});assert.equal(camera.near,.06);
 camera.near=.035;camera.updateProjectionMatrix();const matrix=camera.projectionMatrix.clone();
 assert.equal(updateViewDepth(camera,focus,{xr:true}),false);assert.equal(camera.near,.035);assert(camera.projectionMatrix.equals(matrix));
});
