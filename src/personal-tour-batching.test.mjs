import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {batchPersonalTour} from './personal-tour-batching.mjs';
test('tour batching preserves glass shadow behavior, ceiling visibility and moving door handles',()=>{
 const group=new THREE.Group(),glass=new THREE.MeshStandardMaterial({transparent:true,opacity:.2}),solid=new THREE.MeshStandardMaterial(),resources=[glass,solid],moving=new THREE.Group();group.add(moving);
 for(const [x,material,cast,ceiling,parent] of [[0,glass,false,false,group],[2,solid,true,false,group],[4,solid,false,true,group],[6,solid,true,false,moving]]){const geometry=new THREE.BoxGeometry(),mesh=new THREE.Mesh(geometry,material);mesh.position.x=x;mesh.castShadow=cast;mesh.receiveShadow=true;mesh.userData={ceiling,exterior:false};parent.add(mesh);resources.push(geometry);}
 const door=moving.children[0],home={group,resources,motions:[{object:moving}],picks:[door]};batchPersonalTour(home);assert.equal(moving.children[0],door);assert.equal(home.picks[0],door);
 const batches=group.children.filter(o=>o.isMesh);assert.equal(batches.length,3);assert(batches.filter(o=>o.material===glass).every(o=>!o.castShadow));assert(batches.filter(o=>o.userData.ceiling).every(o=>!o.castShadow));assert(batches.every(o=>o.userData.exterior===false&&o.receiveShadow));assert(batches.some(o=>o.material===solid&&!o.userData.ceiling&&o.castShadow));for(const r of new Set(resources))r.dispose();group.clear();
});
