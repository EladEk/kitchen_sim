import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSurfaceDetails,surfacePixels} from './surface-detail.mjs';
import {restorePublicFinishes} from './finishes.mjs';

test('public material channels have finite bounded detail and suitable linear/color spaces',()=>{
 const set=createSurfaceDetails({mobile:true});
 try{for(const kind of ['limestone','porcelain','cement','plaster','paint','wood','fabric','paving','asphalt','grass']){
  const maps=set.get(kind),pixels=surfacePixels(kind,256);assert.equal(set.get(kind),maps);assert.equal(maps.color.image.width,256);
  assert.equal(maps.color.colorSpace,THREE.SRGBColorSpace);assert.equal(maps.height.colorSpace,THREE.NoColorSpace);assert.equal(maps.roughness.colorSpace,THREE.NoColorSpace);
  assert.equal(maps.color.minFilter,THREE.LinearMipmapLinearFilter);assert(maps.color.generateMipmaps);
  assert(new Set(pixels.color).size>3);assert(new Set(pixels.height).size>3);assert(pixels.color.every(Number.isFinite));
 }}finally{set.dispose();}
});
test('restored public stone/floor shaders retain physical UVs, independent channels and stable glass',async()=>{
 const root=new THREE.Group(),old=new THREE.DataTexture(new Uint8Array(16),2,2),stone=new THREE.MeshStandardMaterial({map:old}),floor=new THREE.MeshStandardMaterial(),glass=new THREE.MeshPhysicalMaterial({transparent:true,opacity:.28});stone.userData={publicFinish:'stone',metricInstancedUVs:true};floor.userData={publicFinish:'floor'};
 let released=0;old.addEventListener('dispose',()=>released++);for(const mat of [stone,floor,glass])root.add(new THREE.Mesh(new THREE.BoxGeometry(),mat));
 const finish=restorePublicFinishes(root,{mobile:true});await finish.ready;
 assert.equal(released,1);assert.equal(stone.map.image.width,256);assert.notEqual(stone.map,stone.bumpMap);assert.notEqual(stone.map,floor.map);assert.equal(glass.ior,1.52);assert(glass.opacity<.5);
 const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};stone.onBeforeCompile(shader);assert(shader.vertexShader.includes('metricPosition'));assert(shader.fragmentShader.includes('stoneId'));
 finish.dispose();const textures=new Set();root.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const v of Object.values(o.material))if(v?.isTexture)textures.add(v);o.material.dispose();});textures.forEach(t=>t.dispose());
});
