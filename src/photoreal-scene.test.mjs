import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PathTracingSceneGenerator} from 'three-gpu-pathtracer';
import {createPhotoScene,photoSceneSignature,photoCameraSignature,PhotoSceneLimit} from './photoreal-scene.mjs';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings,SERVICE_YARD} from './home-model.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('photo snapshot excludes hidden storeys and expands instance colours/transforms without touching the XR model',()=>{
 const source=new THREE.Scene(),g=new THREE.BoxGeometry(),m=new THREE.MeshStandardMaterial({color:'white'}),instances=new THREE.InstancedMesh(g,m,2);
 instances.setMatrixAt(0,new THREE.Matrix4().makeTranslation(2,0,0));instances.setMatrixAt(1,new THREE.Matrix4().makeTranslation(-2,0,0));instances.setColorAt(0,new THREE.Color('red'));instances.setColorAt(1,new THREE.Color('blue'));source.add(instances);
 const hidden=new THREE.Group();hidden.visible=false;hidden.add(new THREE.Mesh(g,m));source.add(hidden);
 const before=Array.from(g.attributes.position.array),snapshot=createPhotoScene(source),meshes=snapshot.scene.children;
 assert.equal(meshes.length,2);assert.equal(snapshot.triangles,24);assert(meshes[0].material.color.r>.9);assert(meshes[1].material.color.b>.9);
 near(new THREE.Box3().setFromObject(meshes[0]).getCenter(new THREE.Vector3()).x,2);assert.notEqual(meshes[0].geometry,g);
 snapshot.dispose();assert.deepEqual(Array.from(g.attributes.position.array),before);assert.equal(instances.count,2);assert.equal(instances.geometry.boundsTree,undefined);g.dispose();m.dispose();
});
test('real home snapshot can build the path-tracing acceleration data, including the 2 by 3 shed and live doors',()=>{
 const source=new THREE.Scene(),home=createHomeScene(normalizeHomeSettings({openParts:['garden-shed:door']}),{mode:'overview'});source.add(home.group);let photo;
 try{photo=createPhotoScene(source);const generator=new PathTracingSceneGenerator(photo.scene),result=generator.generate();assert(result.bvh);assert(result.geometry.attributes.position.count>10000);assert(result.materials.every(m=>m.isMeshStandardMaterial));assert.equal(SERVICE_YARD.shed.w*SERVICE_YARD.shed.d,6);result.geometry.dispose();}
 finally{photo?.dispose();home.dispose();}
});
test('photo materials use physical glass and baked metric stone courses; technical helpers and invisible slots stay invisible',()=>{
 const s=new THREE.Scene(),g=new THREE.BoxGeometry(2,3,.1),glass=new THREE.MeshPhysicalMaterial({transparent:true,opacity:.3});
 const pane=new THREE.Mesh(g,glass);pane.userData.part='building-glazing';s.add(pane);
 const stone=new THREE.MeshStandardMaterial();stone.userData.publicFinish='stone';const wall=new THREE.Mesh(g,stone);wall.position.x=4;s.add(wall);
 const secret=new THREE.Mesh(g,new THREE.MeshBasicMaterial({colorWrite:false}));s.add(secret);
 const overlay=new THREE.Mesh(g,stone);overlay.userData.securityOverlay=true;s.add(overlay);
 const photo=createPhotoScene(s);assert.equal(photo.meshes,2);const [p,w]=photo.scene.children;
 assert(p.material.isMeshPhysicalMaterial);assert(p.material.transmission>.9);near(p.material.ior,1.5);assert.equal(p.material.opacity,1);
 assert(w.material.map.isDataTexture);assert(w.material.bumpMap);assert.notEqual(w.geometry,g);assert.equal(g.attributes.position.count,w.geometry.attributes.position.count);
 photo.dispose();s.traverse(o=>{if(o.material)o.material.dispose();});g.dispose();
});
test('photo reset signatures detect camera, door motion, hidden branches and material changes',()=>{
 const s=new THREE.Scene(),g=new THREE.BoxGeometry(),m=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(g,m),camera=new THREE.PerspectiveCamera();s.add(mesh);
 let key=photoSceneSignature(s);mesh.rotation.y=.1;assert.notEqual(photoSceneSignature(s),key);key=photoSceneSignature(s);mesh.visible=false;assert.notEqual(photoSceneSignature(s),key);
 mesh.visible=true;key=photoSceneSignature(s);m.color.set('red');assert.notEqual(photoSceneSignature(s),key);
 const c=photoCameraSignature(camera);camera.position.x=2;assert.notEqual(photoCameraSignature(camera),c);assert.throws(()=>createPhotoScene(s,{maxTriangles:1}),PhotoSceneLimit);assert.equal(mesh.geometry,g);g.dispose();m.dispose();
});
