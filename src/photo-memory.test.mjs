import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cancelableBVHWorker,retirePhotoResources,disposeObjectResources} from './photo-resources.mjs';
import {createPhotoScene,PhotoSceneLimit} from './photoreal-scene.mjs';
test('canceling a BVH settles the caller even when the terminated worker never answers',async()=>{
 let retired=0;const worker=cancelableBVHWorker({generate:()=>new Promise(()=>{}),dispose(){retired++;}}),job=worker.generate({});await Promise.resolve();const rejection=assert.rejects(job,e=>e.name==='AbortError');worker.dispose();worker.dispose();await rejection;assert.equal(retired,1);await assert.rejects(worker.generate({}),e=>e.name==='AbortError');
});
test('photo budget rejects oversized scenes before cloning any live geometry',()=>{
 const scene=new THREE.Scene(),g=new THREE.BoxGeometry(),m=new THREE.MeshStandardMaterial(),mesh=new THREE.InstancedMesh(g,m,5000);scene.add(mesh);let clones=0;g.clone=()=>{clones++;throw Error('Cloned too soon');};assert.throws(()=>createPhotoScene(scene,{maxBytes:1024}),PhotoSceneLimit);assert.equal(clones,0);mesh.dispose();g.dispose();m.dispose();
});
test('retirement disposes pinned SDK leftovers, worker, snapshot and owned renderer context',()=>{
 const counts=new Map(),resource=name=>({dispose(){counts.set(name,(counts.get(name)||0)+1);}}),tracer=resource('tracer');tracer._lowResPathTracer=resource('low');tracer._lowResPathTracer.material=resource('low-material');tracer._pathTracer={material:resource('material')};tracer._generator={geometry:resource('merged')};tracer._internalBackground=resource('background');
 retirePhotoResources({tracer,worker:resource('worker'),snapshot:resource('snapshot'),renderer:{...resource('renderer'),forceContextLoss(){counts.set('context',1);}},canvas:{remove(){counts.set('canvas',1);}}});for(const name of ['tracer','low','low-material','material','merged','background','worker','snapshot','renderer','context','canvas'])assert.equal(counts.get(name),1,name);
});
test('shared model resources are disposed once and CPU texture data is detached',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(),t=new THREE.DataTexture(new Uint8Array(16),2,2),m=new THREE.MeshStandardMaterial({map:t,bumpMap:t});root.add(new THREE.Mesh(g,m),new THREE.Mesh(g,m));let counts=0;for(const r of [g,t,m])r.addEventListener('dispose',()=>counts++);disposeObjectResources(root);assert.equal(counts,3);assert.equal(t.source.data,null);assert.equal(root.children.length,0);
});
