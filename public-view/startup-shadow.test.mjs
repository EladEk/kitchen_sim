import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {WebGLShadowMap} from 'three/src/renderers/webgl/WebGLShadowMap.js';
import {WebGLUniforms} from 'three/src/renderers/webgl/WebGLUniforms.js';
import {createInteriorLighting} from './interior-lighting.mjs';

function shadowRenderer(){return {state:{setBlending(){},setScissorTest(){},viewport(){},buffers:{depth:{getReversed:()=>false,setTest(){}},color:{setClear(){}}}},getRenderTarget:()=>null,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget(){},clear(){}};}
function fallbackTexture(){
 const gl={ACTIVE_UNIFORMS:0x8B86,SAMPLER_2D_SHADOW:0x8B62,getProgramParameter:()=>1,getActiveUniform:()=>({name:'spotShadowMap[0]',size:1,type:0x8B62}),getUniformLocation:()=>0,uniform1iv(){}};let texture;
 new WebGLUniforms(gl,{}).setValue(gl,'spotShadowMap',[null],{allocateTextureUnit:()=>0,setTexture2D:t=>texture=t});return texture;
}
test('the actual Three shadow pass allocates a valid PCF comparison texture before the first outdoor beauty frame',()=>{
 for(const mobile of [false,true]){
  const scene=new THREE.Scene(),lighting=createInteriorLighting(scene,{toneMappingExposure:.98},{mobile}),spot=scene.getObjectByName('tour-interior-shadow'),camera=new THREE.PerspectiveCamera(),pass=new WebGLShadowMap(shadowRenderer(),{}, {maxTextureSize:4096});pass.enabled=true;pass.type=THREE.PCFShadowMap;
  assert(spot.visible&&spot.castShadow);assert.equal(spot.intensity,0);assert.equal(spot.shadow.map,null);assert.equal(spot.shadow.autoUpdate,false);assert.equal(spot.shadow.needsUpdate,true,'zero intensity must not suppress the first allocation');
  // Reproduce R113's bad state with the actual renderer shadow and uniform code.
  spot.shadow.needsUpdate=false;scene.updateMatrixWorld(true);pass.render([spot],scene,camera);assert.equal(spot.shadow.map,null);const fallback=fallbackTexture();assert.equal(fallback.compareFunction,null);assert.equal(fallback.version,0,'the missing shadow would bind an uninitialized fallback');
  lighting.update({inside:false,walking:false,solar:{daylight:1}});assert.equal(spot.shadow.needsUpdate,true);pass.render([spot],scene,camera);assert(spot.shadow.map.depthTexture?.isDepthTexture);assert.equal(spot.shadow.map.depthTexture.compareFunction,THREE.LessEqualCompare);assert.equal(spot.shadow.needsUpdate,false);assert.equal(spot.shadow.map.width,mobile?512:1024);assert(spot.shadow.matrix.elements.every(Number.isFinite));
  for(const tier of [3,0]){const old=spot.shadow.map;let disposed=0;old.addEventListener('dispose',()=>disposed++);lighting.setQuality({tier});assert.equal(disposed,1);assert.equal(spot.shadow.map,null);assert(spot.shadow.needsUpdate);pass.render([spot],scene,camera);assert.notEqual(spot.shadow.map,old);assert.equal(spot.shadow.map.width,mobile?(tier>=2?256:512):(tier>=2?512:1024));assert.equal(spot.shadow.map.depthTexture.compareFunction,THREE.LessEqualCompare);}
  lighting.trim();assert.equal(spot.shadow.needsUpdate,true);pass.render([spot],scene,camera);assert.equal(spot.shadow.map.depthTexture.compareFunction,THREE.LessEqualCompare);lighting.dispose();
 }
});

test('a configured PCF depth sampler produces visible geometry in the native GLES check',t=>{
 const result=spawnSync('python',['qa/check-startup-shadow-gpu.py'],{encoding:'utf8',timeout:30000,maxBuffer:100000});if(result.error?.code==='ENOENT'||result.status===77){t.skip('Native EGL unavailable');return;}assert.equal(result.status,0,result.stderr||result.stdout);const data=JSON.parse(result.stdout);assert.equal(data.initializedShadowError,0);assert(data.litPixel[0]>190);
});
