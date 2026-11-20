import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSceneWarmup} from './scene-warmup.mjs';
import {createArchitecturalPresentation} from '../public-view/presentation.mjs';

test('WebGL preparation compiles in batches against the real frame target, links each batch and restores state',async()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,1,.1,100),light=new T.DirectionalLight();light.castShadow=true;light.shadow.map={};scene.add(light);
 const materials=Array.from({length:5},()=>new T.MeshStandardMaterial());for(let i=0;i<20;i++){const m=new T.Mesh(new T.BoxGeometry(),materials[i%5]);m.position.z=-5;scene.add(m);}
 const target=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType}),props=new Map(),log=[],progress=[];let current=null,linked=0;
 const renderer={isWebGPURenderer:false,shadowMap:{enabled:true,autoUpdate:true,needsUpdate:false},getRenderTarget:()=>current,setRenderTarget:t=>{current=t;},properties:{get:m=>props.get(m)},getContext:()=>null,
  compile(root){assert.equal(current,target);const used=new Set();root.traverse(o=>used.add(o.material));for(const m of used)props.set(m,{currentProgram:{getUniforms:()=>{linked++;}}});log.push(['compile',used.size]);return used;},
  render(){if(current===target&&camera.layers.isEnabled(31)&&!camera.layers.isEnabled(0)){assert(target.scissorTest);log.push(['warm',this.shadowMap.autoUpdate]);}else log.push(['frame',camera.layers.mask]);}};
 const warm=createSceneWarmup(renderer,scene,camera,{glBatch:2});
 assert.equal(await warm.prepare('k',{draw:true,compileTarget:target,renderFrame:()=>renderer.render(),onProgress:v=>progress.push(v)}),true);
 const compiles=log.filter(e=>e[0]==='compile');assert.equal(compiles.length,3,'5 representative objects in batches of 2');assert.equal(linked,5);
 assert.deepEqual(log.filter(e=>e[0]==='warm').map(e=>e[1]),[true,false,false],'first warm draw renders the shadow maps, later ones keep them');
 assert.deepEqual(log.at(-1),['frame',1]);assert.equal(current,null);assert.equal(target.scissorTest,false);assert.equal(renderer.shadowMap.autoUpdate,true);
 for(let i=1;i<progress.length;i++)assert(progress[i]>=progress[i-1]);assert(progress.filter(v=>v>0&&v<1).length>=3);assert.equal(progress.at(-1),1);
 scene.traverse(o=>assert(!o.layers.isEnabled(31)));
});

test('WebGL presentation prepares through the composer path it will display',async()=>{
 let rendered=0;const sceneTarget={},renderer={isWebGPURenderer:false,xr:{isPresenting:false},getPixelRatio:()=>1,setRenderTarget(){},getContext:()=>null};
 const presentation=createArchitecturalPresentation(renderer,{},{},{mobile:true,pipelineFactory:()=>({sceneTarget,resize(){},render(){rendered++;},dispose(){}})});
 let options;await presentation.prepare('k',{prepare:async(key,o)=>{options=o;o.renderFrame();return true;}},{draw:true});
 assert.equal(options.compileTarget,sceneTarget);assert.equal(rendered,1);
 await presentation.prepare('k',{prepare:async(key,o)=>{options=o;return true;}},{draw:true,effects:false});assert.equal(options.compileTarget,undefined);assert.equal(options.renderFrame,undefined);
});
