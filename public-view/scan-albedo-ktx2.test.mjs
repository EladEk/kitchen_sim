import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createScanMaterialController} from './scanned-material-core.mjs';

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

test('shipped wood and fabric profiles declare the KTX2 mean alongside the raw scan mean',async()=>{
 const source=await readFile('public-view/scanned-materials.mjs','utf8');
 for(const kind of ['fabric','wood'])assert.match(source,new RegExp('\\n '+kind+':\\{colorMean:\\[[^\\]]+\\],compressedColorMean:\\['));
});
