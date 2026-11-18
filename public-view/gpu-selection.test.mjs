import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createGpuSelection} from './gpu-selection.mjs';import {copyGpuClipBinding} from './gpu-selection-clip.mjs';import {createPhotoScene} from '../src/photoreal-scene.mjs';
const nav={storey:3,floors:[{level:0,elevation:0,units:[{number:4,polygon:[[-1,-1],[1,-1],[1,1],[-1,1]]},{number:5,polygon:[[2,-1],[4,-1],[4,1],[2,1]]}]}],destinations:[{id:'unit:4:0',unit:4,floor:0},{id:'unit:5:0',unit:5,floor:0}]};
test('unit and height changes preserve GPU geometry, materials, fade bindings and door transforms',()=>{
 const source=new T.Group(),geo=new T.BoxGeometry(6,3,.2),material=new T.MeshPhysicalMaterial(),wall=new T.Mesh(geo,material);wall.position.y=1.5;wall.userData.sectionWall=true;source.add(wall);
 const pivot=new T.Group();pivot.userData.tourMotionId='door';pivot.add(new T.Mesh(geo,material));source.add(pivot);
 const section=createGpuSelection(source,nav);section.update({level:0,target:'unit:4:0',wallHeight:1});const before=[];section.group.traverse(o=>{if(o.isMesh)before.push([o,o.geometry,o.material]);});
 for(const target of ['unit:5:0','unit:4:0'])for(const wallHeight of [2.8,.5,1.6])section.update({level:0,target,wallHeight});
 for(const [o,g,m]of before){assert.equal(o.geometry,g);assert.equal(g,geo);assert.equal(o.material,m);}pivot.rotation.y=.7;section.sync();assert.equal(section.group.children[0].children[1].rotation.y,.7);assert(!section.fallback);
 const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};before[0][0].material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('discard'));assert(Math.abs(shader.uniforms.uSectionCutY.value-1.63)<1e-9);assert.equal(shader.uniforms.uSelectionMode.value,2);
 const faded=copyGpuClipBinding(before[0][0].material,before[0][0].material.clone()),second={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};faded.onBeforeCompile(second);assert.equal(second.uniforms.uSectionCutY,shader.uniforms.uSectionCutY);faded.dispose();section.dispose();geo.dispose();material.dispose();
});
test('path-traced export uses an owned clipped snapshot and restores the live scene',()=>{
 const scene=new T.Scene(),source=new T.Group(),geo=new T.BoxGeometry(6,3,.2),material=new T.MeshStandardMaterial(),wall=new T.Mesh(geo,material);wall.position.y=1.5;wall.userData.sectionWall=true;source.add(wall);
 const section=createGpuSelection(source,nav);scene.add(section.group);section.update({level:0,target:'unit:4:0',wallHeight:1});const live=section.group.children[0].children[0];
 const photo=createPhotoScene(scene);photo.scene.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();assert(o.geometry.boundingBox.max.y<=1.031);}});assert.equal(section.group.parent,scene);assert.equal(live.geometry,geo);photo.dispose();section.dispose();geo.dispose();material.dispose();
});

test('CPU picks ignore cut-away upper walls and concave unit fragments',async()=>{
 const {pickTourSurface}=await import('./tour-interaction.mjs');
 const source=new T.Group(),m=new T.MeshStandardMaterial({side:T.DoubleSide}),wall=new T.Mesh(new T.BoxGeometry(.1,3,5),m),door=new T.Mesh(new T.BoxGeometry(.1,3,1),m);wall.position.set(0,1.5,0);door.position.set(-2,1.5,0);wall.userData={sectionWall:true,part:'wall'};door.userData={sectionWall:true,part:'door'};source.add(wall,door);
 const fullNav={storey:3,floors:[{level:0,elevation:0,units:[{number:4,polygon:[[-3,-3],[3,-3],[3,3],[-3,3]]}]}],destinations:[{id:'unit:4:0',unit:4,floor:0}]};
 const section=createGpuSelection(source,fullNav),ray=new T.Raycaster(new T.Vector3(2,2,0),new T.Vector3(-1,-.35,0).normalize());section.update({level:0,target:'unit:4:0',wallHeight:1});assert.equal(pickTourSurface(ray,section.group,{far:10}).object.userData.part,'door');section.update({level:0,target:'unit:4:0',wallHeight:3});assert.equal(pickTourSurface(ray,section.group,{far:10}).object.userData.part,'wall');section.dispose();wall.geometry.dispose();door.geometry.dispose();
 const second=new T.Group(),front=new T.Mesh(new T.BoxGeometry(6,3,.1),m),back=new T.Mesh(new T.BoxGeometry(1,3,.1),m);front.position.y=1.5;front.userData={part:'wall',sectionWall:true};back.position.set(2,1.5,-2);back.userData={part:'door',sectionWall:true};second.add(front,back);fullNav.floors[0].units[0].polygon=[[-3,-3],[3,-3],[3,-1],[0,-1],[0,2],[-3,2]];
 const unit=createGpuSelection(second,fullNav);unit.update({level:0,target:'unit:4:0',wallHeight:3});ray.set(new T.Vector3(2,1.5,2),new T.Vector3(0,0,-1));assert.equal(pickTourSurface(ray,unit.group,{far:10}).object.userData.part,'door');unit.dispose();front.geometry.dispose();back.geometry.dispose();m.dispose();
});
test('photo snapshots reuse sliced buffers across camera/light changes and dispose on section changes',async()=>{
 const {photoSceneSignature}=await import('../src/photoreal-scene.mjs');const scene=new T.Scene(),source=new T.Group(),g=new T.BoxGeometry(5,3,.2),m=new T.MeshStandardMaterial(),wall=new T.Mesh(g,m);wall.position.y=1.5;wall.userData.sectionWall=true;source.add(wall);const section=createGpuSelection(source,nav);scene.add(section.group);section.update({level:0,target:'unit:4:0',wallHeight:1});const signature=photoSceneSignature(scene);
 const a=createPhotoScene(scene);a.dispose();const cached=section.group.userData.gpuSelectionSnapshotCache;const b=createPhotoScene(scene);b.dispose();assert.equal(section.group.userData.gpuSelectionSnapshotCache,cached);
 section.update({level:0,target:'unit:4:0',wallHeight:2});assert.notEqual(photoSceneSignature(scene),signature);const c=createPhotoScene(scene);c.dispose();assert.notEqual(section.group.userData.gpuSelectionSnapshotCache,cached);section.dispose();assert(!section.group.userData.gpuSelectionSnapshotCache);g.dispose();m.dispose();
});
