import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSceneWarmup} from './scene-warmup.mjs';
import {scheduleSceneWork} from './scene-work.mjs';
test('warmup uploads shared textures once, compiles real draw types and keeps object ownership',async()=>{
 const scene=new THREE.Scene(),texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:texture}),g=new THREE.BoxGeometry(),visible=new THREE.Mesh(g,material),hidden=new THREE.Mesh(g,material);hidden.visible=false;scene.add(visible,hidden);let uploads=0,count=0;
 const renderer={initTexture:t=>{assert.equal(t,texture);uploads++;},async compileAsync(root,camera,target){assert.equal(target,scene);root.traverse(o=>{assert.equal(o.parent,scene);count++;});}},warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera(),{limit:2});
 await warm.prepare('first',{all:true});assert.equal(count,2);await warm.prepare('first');assert.equal(count,2);await warm.prepare('second');assert.equal(count,3);assert.equal(uploads,1);await warm.prepare('third');assert(!warm.has('first'));warm.dispose();g.dispose();material.dispose();texture.dispose();
});
test('paint precedes texture upload, and a stale shader completion cannot mark a canceled room ready',async()=>{
 const scene=new THREE.Scene(),frames=[],failures=[];let resolve,started=false;const warm=createSceneWarmup({compileAsync:()=>{started=true;return new Promise(r=>resolve=r);}},scene,new THREE.PerspectiveCamera()),controller=new AbortController();
 const stop=scheduleSceneWork(()=>warm.prepare('room',{signal:controller.signal}),{requestFrame:f=>(frames.push(f),frames.length),cancelFrame(){},onError:e=>failures.push(e)});
 assert(!started);frames.shift()();await Promise.resolve();assert(!started);frames.shift()();await Promise.resolve();assert(started);controller.abort();resolve();await new Promise(r=>setImmediate(r));assert(!warm.has('room'));assert.equal(failures.length,0);stop();warm.dispose();
});

test('startup remains pending until a real frame has drawn and its shadow targets exist',async()=>{
 const scene=new THREE.Scene(),spot=new THREE.SpotLight();spot.castShadow=true;scene.add(spot);let finish,draws=0;
 const renderer={shadowMap:{enabled:true},compileAsync:()=>new Promise(r=>finish=r),render(){draws++;spot.shadow.map={};},getContext:()=>({getError:()=>0})},warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera()),preparing=warm.prepare('first',{draw:true});assert(!warm.has('first'));assert.equal(draws,0);finish();await preparing;assert.equal(draws,1);assert(warm.has('first'));warm.dispose();
});
test('a failed GPU draw or missing visible shadow never marks an empty first frame ready',async()=>{
 const scene=new THREE.Scene(),spot=new THREE.SpotLight();spot.castShadow=true;scene.add(spot);let draws=0;
 const renderer={shadowMap:{enabled:true},compileAsync:async()=>{},render(){draws++;},getContext:()=>({getError:()=>draws?1282:0})},warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera());await assert.rejects(warm.prepare('bad',{draw:true}),{name:'SceneDrawError',code:1282});assert(!warm.has('bad'));renderer.getContext=()=>({getError:()=>0});await assert.rejects(warm.prepare('missing',{draw:true}),{name:'SceneDrawError'});assert(!warm.has('missing'));warm.dispose();
});
test('native batches preserve instancing identity, parent pointers and first shadow flags',async()=>{
 const scene=new THREE.Scene(),m=new THREE.MeshStandardMaterial(),g=new THREE.BoxGeometry(),a=new THREE.InstancedMesh(g,m,2),b=new THREE.InstancedMesh(g,m,2);scene.add(a,b);for(let i=0;i<30;i++)scene.add(new THREE.Mesh(g,m));const light=new THREE.SpotLight();light.castShadow=true;light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;scene.add(light);let calls=0,drawn=false;
 const renderer={isWebGPURenderer:true,async compileAsync(root,camera,actual){assert(root.isGroup);assert.equal(actual,scene);assert(root.children.length<=2);assert(scene.children.every(o=>o.parent===scene));assert.equal(light.shadow.needsUpdate,false);calls++;},render(){assert.equal(light.shadow.needsUpdate,true);drawn=true;},shadowMap:{enabled:true}},warm=createSceneWarmup(renderer,scene,new THREE.PerspectiveCamera(),{batchSize:2});await warm.prepare('native',{all:true,draw:true});assert.equal(calls,2);assert(drawn);assert(warm.has('native'));assert.equal(light.shadow.autoUpdate,false);assert.equal(light.shadow.needsUpdate,true);warm.dispose();g.dispose();m.dispose();
});
test('a native device budget failure restores shadows and never marks a pending view ready',async()=>{const scene=new THREE.Scene(),light=new THREE.SpotLight();light.castShadow=true;scene.add(light);for(let i=0;i<3;i++)scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));let time=0;const warm=createSceneWarmup({isWebGPURenderer:true,compileAsync:async()=>{time+=20;}},scene,new THREE.PerspectiveCamera(),{maxNativeMs:10,batchSize:1,clock:()=>time});await assert.rejects(warm.prepare('slow',{all:true}),{name:'SceneDrawError'});assert(!warm.has('slow'));assert.equal(light.shadow.autoUpdate,true);warm.dispose();});
