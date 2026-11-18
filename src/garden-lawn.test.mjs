import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {expandTSLGraph} from './tsl-test-evaluator.mjs';
import {createFinishNodeMaterial} from '../public-view/webgpu-finishes.mjs';

const gardenLawns=group=>{const out=new Set();group.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData?.surfaceKind==='grass'&&m.userData.lawnShading)out.add(m);});return [...out];};

test('R181 the signed-in garden lawn gets the anti-tiled, macro-varied lawn shader on WebGL',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{
  const lawns=gardenLawns(scene.group);assert.equal(lawns.length,1,'garden plot carries one lawn material');
  const m=lawns[0],shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};
  m.onBeforeCompile(shader,{});
  assert.match(shader.vertexShader,/vSiteXZ=\(modelMatrix\*lawnVertex\)\.xz/);
  assert.match(shader.fragmentShader,/float lawnNoise\(vec2 p\)/);
  assert.equal((shader.fragmentShader.match(/texture2D\(map,/g)||[]).length,2,'base + one rotated anti-tiling tap');
  assert.doesNotMatch(shader.fragmentShader,/#include <map_fragment>/);
  assert.match(shader.fragmentShader,/#include <color_fragment>\n[\s\S]*lawnPatch/);
  assert.match(m.customProgramCacheKey(),/-lawn-r181$/);
 }finally{scene.dispose();}
});

test('R181 the garden lawn uses the photographed anti-tiled TSL graph on WebGPU once the photoscan is bound',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 const photo=new T.DataTexture(new Uint8Array([90,130,60,255]),1,1);photo.needsUpdate=true;photo.userData.scanTechnique='photoscan';
 try{for(const mobile of [true,false]){
  const source=gardenLawns(scene.group)[0].clone();source.userData={...source.userData};source.map=photo;
  const material=createFinishNodeMaterial(source,{mobile});
  try{
   assert(material.isMeshPhysicalNodeMaterial,'lawn sheen needs the physical node material');
   const taps=expandTSLGraph([material.colorNode],material).filter(n=>n.isTextureNode&&n.value===photo);
   assert.equal(taps.length,2,'base + rotated anti-tiling tap of the photo');
  }finally{material.dispose();source.dispose();}
 }}finally{photo.dispose();scene.dispose();}
});

test('R181 before the photoscan arrives the garden keeps the procedural turf (no texture relief)',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{
  const source=gardenLawns(scene.group)[0],material=createFinishNodeMaterial(source,{mobile:true});
  try{assert(!expandTSLGraph([material.colorNode],material).some(n=>n.isTextureNode));}finally{material.dispose();}
 }finally{scene.dispose();}
});
