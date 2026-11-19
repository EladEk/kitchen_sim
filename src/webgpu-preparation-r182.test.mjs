import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {getShadowMaterial} from 'three/tsl';
import {createSceneWarmup} from './scene-warmup.mjs';
import {loadingPercent} from './loading-progress.mjs';

test('shadow-pass materials of different lights share one cache key (one node build per caster)',()=>{
 const a=getShadowMaterial(new THREE.DirectionalLight()),b=getShadowMaterial(new THREE.SpotLight());
 assert.notEqual(a,b);assert.equal(a.colorNode,b.colorNode);assert.equal(a.customProgramCacheKey(),b.customProgramCacheKey());
});

test('a reset during compilation is reported as an abandoned preparation, never silently',async()=>{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();for(let i=0;i<3;i++)scene.add(new THREE.InstancedMesh(geometry,material,1));
 const events=[];let warm;const renderer={isWebGPURenderer:true,async compileAsync(){warm.reset();},render(){}};
 warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera(),{batchSize:1,onDiagnostic:e=>events.push(e)});
 assert.equal(await warm.prepare('initial',{draw:true}),false);
 const abandoned=events.find(e=>e.event==='scene-preparation-abandoned');assert(abandoned);assert.equal(abandoned.details.reason,'reset');assert.equal(abandoned.details.phase,'shader-compilation');
 warm.dispose();geometry.dispose();material.dispose();
});

test('preparation timing separates compile-pass and first-draw pipeline counts',async()=>{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();scene.add(new THREE.InstancedMesh(geometry,material,1));
 const stats={nodeBuilds:0,syncPipelines:0,asyncPipelines:0},events=[];
 const renderer={isWebGPURenderer:true,async compileAsync(){stats.nodeBuilds+=2;stats.asyncPipelines+=2;},render(){stats.nodeBuilds++;stats.syncPipelines++;}};
 const warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera(),{counters:()=>({...stats}),onDiagnostic:e=>events.push(e)});
 assert.equal(await warm.prepare('initial',{draw:true}),true);
 const timing=events.find(e=>e.event==='scene-preparation-timing').details;
 assert.equal(timing.compileAsyncPipelines,2);assert.equal(timing.compileNodeBuilds,2);assert.equal(timing.drawSyncPipelines,1);assert.equal(timing.drawNodeBuilds,1);assert.equal(timing.totalNodeBuilds,3);
 warm.dispose();geometry.dispose();material.dispose();
});

test('compile progress advances per compiled object, not only per batch',async()=>{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();for(let i=0;i<4;i++)scene.add(new THREE.InstancedMesh(geometry,material,1));
 const values=[],renderer={isWebGPURenderer:true,async compileAsync(){},render(){}};
 const warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera(),{batchSize:2});await warm.prepare('p',{draw:true,onProgress:v=>values.push(v)});
 // 4 objects in two batches + one draw unit: 0, 2/5, 4/5, 1.
 assert.deepEqual(values.map(v=>Math.round(v*100)),[0,40,80,100]);assert.equal(loadingPercent(69+30*.4),81);
 warm.dispose();geometry.dispose();material.dispose();
});
