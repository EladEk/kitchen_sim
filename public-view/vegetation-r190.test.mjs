import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as THREE from 'three';
import {createRealisticProps,hedgeModule,HEDGE} from './realistic-props.mjs';
const dir=new URL('./assets/vegetation-r190/',import.meta.url);
test('R190 hedge atlas is CC0, compressed and phone-sized',()=>{
 const s=JSON.parse(fs.readFileSync(new URL('SOURCES.json',dir))),m=JSON.parse(fs.readFileSync(new URL('MANIFEST.json',dir)));
 assert(s.assets.every(a=>a.license==='CC0-1.0'&&/polyhaven\.com\/a\/searsia_lucida/.test(a.official_page)));
 for(const t of m.textures){const k=fs.readFileSync(new URL(t.texture+'.ktx2',dir));assert.equal(k.subarray(1,7).toString(),'KTX 20');assert(k.length<300e3);assert(fs.existsSync(new URL(t.texture+'.webp',dir)));}
});
test('hedge modules: alpha-tested cards around an opaque core, UVs inside their tile, no gaps between modules',()=>{
 const shell=hedgeModule(),core=hedgeModule({core:true}),uv=shell.attributes.uv;
 for(let i=0;i<uv.count;i++){const v=uv.getY(i);assert(uv.getX(i)>=0&&uv.getX(i)<=1);assert(v>0&&v<1&&Math.abs(v-.375)>1e-3,'stays off the tile seam');}
 assert(core.boundingBox.max.z<shell.boundingBox.max.z&&core.boundingBox.max.y<HEDGE.top,'core hides inside the cards');
 const hedges=[0,1,2].map(i=>({x:i*1.9,z:0,angle:0,height:1.15,length:1.9})),props=createRealisticProps({trees:[[0,10]],hedges,mobile:true});
 try{const h=props.group.children.find(o=>o.name==='hedge'),c=props.group.children.find(o=>o.name==='hedge-core');
  assert(h&&c);assert.equal(h.material.alphaTest,.5);assert.equal(h.material.alphaToCoverage,false,'no MSAA on phones/post-processing');assert.equal(c.material.alphaTest,0);assert.equal(c.material.userData.scanKind,'hedgeFoliage','core shares the atlas texture');
  const m=new THREE.Matrix4(),s=new THREE.Vector3();h.getMatrixAt(0,m);m.decompose(new THREE.Vector3(),new THREE.Quaternion(),s);assert(s.x*HEDGE.width>1.9,'modules overlap');
 }finally{props.dispose();}
});
test('every alpha-tested foliage material is a hard cutout (alpha-to-coverage needs MSAA the phone path lacks)',()=>{
 const props=createRealisticProps({trees:[[0,10]],hedges:[{x:0,z:0,angle:0,height:1.1,length:1.9}],backdrop:[{x:50,z:0,angle:0,scale:[1,1,1]}],mobile:true});
 try{for(const m of props.resources.materials.filter(m=>m.alphaTest>0)){assert(!m.alphaToCoverage);assert(!m.transparent);}}finally{props.dispose();}
});
test('WebGPU finishes keep the map alpha for alpha-tested materials',()=>{
 const src=fs.readFileSync(new URL('./webgpu-finishes.mjs',import.meta.url),'utf8');
 assert.match(src,/if\(source\.map&&source\.alphaTest>0\)material\.opacityNode=reference\('opacity','float'\)\.mul\(sample\(source\.map,coordinates\)\.a\)/);
});
