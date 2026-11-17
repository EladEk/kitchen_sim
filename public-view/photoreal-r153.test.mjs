import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {createScanMaterialController} from './scanned-material-core.mjs';
import {installFloorCourses} from '../src/building-finish-shaders.mjs';

test('neutralized GPU-compressed albedo uses its own measured mean so wood and cloth keep their chosen colour',async()=>{
 const raw=[.359834,.211142,.098359],compressed=[.841074,.828395,.804503];
 for(const isCompressed of [false,true]){
  const root=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:'#8a6a4a'});material.userData.surfaceKind='wood';root.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
  const controller=createScanMaterialController({scans:{wood:{color:'wood',colorMean:raw,compressedColorMean:compressed,metres:1.8,strength:.3,rough:.76,environment:.65}},loader:async()=>{const t=new THREE.Texture({width:1024,height:1024});if(isCompressed)t.isCompressedTexture=true;return t;}});
  await controller.apply(root);const mean=isCompressed?compressed:raw;
  for(let i=0;i<3;i++)assert(Math.abs(material.userData.scanAlbedoGain[i]*mean[i]-1)<1e-10);
  controller.dispose();root.children[0].geometry.dispose();material.dispose();
 }
});

test('R153 wall, ceiling, floor and cement scans ship KTX2 with matching JPEG fallbacks, CC0 provenance and a bounded download size',async()=>{
 const source=await readFile('public-view/scanned-materials.mjs','utf8'),sources=JSON.parse(await readFile('public-view/assets/pbr-r153/SOURCES.json','utf8'));
 for(const kind of ['plaster','paint','porcelain','cement'])assert.match(source,new RegExp('\\n '+kind+':\\{color:\\w+,colorMean:\\['));
 let bytes=0;
 for(const asset of sources.assets){
  assert.equal(asset.license,'CC0-1.0');assert(asset.physical_width_m>0);
  for(const file of asset.files){
   for(const kind of ['ktx2','jpg']){const info=await stat(file[kind].path);assert.equal(info.size,file[kind].bytes);bytes+=info.size;}
   const ktx=await readFile(file.ktx2.path);assert.equal(ktx.subarray(0,12).toString('hex'),'ab4b5458203230bb0d0a1a0a');assert.equal(ktx.readUInt32LE(20)%4,0);assert.equal(ktx.readUInt32LE(24)%4,0);
   const name=file.ktx2.path.split('/').pop();assert(source.includes('./assets/pbr-r153/'+name+'?url'));assert(source.includes('./assets/pbr-r153/'+name.replace('.ktx2','.jpg')+'?url'));
   if(file.channel==='color'){assert(file.colorMean.every(v=>v>.6&&v<.9));assert(source.includes(file.colorMean.map(v=>v.toFixed(6).replace(/^0/,'')).join(',')));}
  }
 }
 assert(bytes<3.5*1024*1024,'R153 surface maps stay below 3.5 MB in total');
});

test('scanned floors give every tile its own patch of stone and a polished, slightly varied sheen',()=>{
 const m=new THREE.MeshStandardMaterial();installFloorCourses(m,{tile:[.8,.8],joint:.004});const shader={vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>'};m.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/textureGrad\(map,vMapUv\+tileShift/);assert.match(shader.fragmentShader,/mix\(\.30,\.42,tileVariation\)/);m.dispose();
});
