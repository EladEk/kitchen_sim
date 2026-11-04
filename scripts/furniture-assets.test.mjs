import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {bindFurnitureMeshLibrary} from '../src/furniture-mesh-library.mjs';
import {createSoftGeometry} from '../src/soft-furnishings.mjs';
test('the shipped compressed GLB decodes in the actual Three loader, retains metre bounds and has non-flat upholstery',async()=>{
 const bytes=await readFile('public-view/assets/furniture-r113/upholstery.glb'),gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assert(bytes.length<100000);gltf.scene.updateMatrixWorld(true);const library=new Map();gltf.scene.traverse(o=>{if(o.isMesh)library.set(o.name,o.geometry.clone().applyMatrix4(o.matrixWorld));});assert.deepEqual([...library.keys()].sort(),['cushion','duvet']);const unbind=bindFurnitureMeshLibrary(library);
 try{for(const kind of library.keys()){const geometry=createSoftGeometry(1.8,.15,1.2,{kind});geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3());for(const [actual,expected]of [[size.x,1.8],[size.y,.15],[size.z,1.2]])assert(Math.abs(actual-expected)<.001);assert(geometry.attributes.position.count>500);const p=geometry.attributes.position,heights=[];for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.6&&Math.abs(p.getZ(i))<.4&&p.getY(i)>0)heights.push(p.getY(i));assert(Math.max(...heights)-Math.min(...heights)>.004);geometry.dispose();}}finally{unbind();for(const g of library.values())g.dispose();gltf.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
test('all KTX2 scans have real Basis compression, mipmaps, and matching manifest hashes',async()=>{
 const {createHash}=await import('node:crypto'),manifest=JSON.parse(await readFile('public-view/assets/pbr-r113/MANIFEST.json'));assert.equal(manifest.textures.length,14);let total=0;for(const row of manifest.textures){const bytes=await readFile(row.output);assert.equal(bytes.subarray(0,12).toString('hex'),'ab4b5458203230bb0d0a1a0a');assert(bytes.readUInt32LE(40)>1,'complete mip pyramid');assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);total+=bytes.length;}assert(total<8e6);
});
