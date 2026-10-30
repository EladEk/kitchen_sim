import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createDistrict} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {createSelection} from '../public-view/selection.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';
import {createPhotoScene} from '../src/photoreal-scene.mjs';
import {PathTracingSceneGenerator} from 'three-gpu-pathtracer';

test('production district construction/disposal releases buffers even when disposed handles are retained',async()=>{
 const load=async name=>JSON.parse(await readFile('dist/client/baseline/'+name+'.json','utf8'));
 let json=await load('building');const model=await new THREE.ObjectLoader().parseAsync(json);json=null;const site=await load('site'),retired=[];global.gc?.();const before=process.memoryUsage().arrayBuffers;
 for(let pass=0;pass<5;pass++){
  const district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot});
  const geometries=new Set();district.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});const bytes=[...geometries].reduce((n,g)=>n+Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,g.index?.array.byteLength||0),0);assert(bytes<65e6);geometries.clear();
  const props=district.props;assert(props.resources.geometries.length>0);assert(world.memory.indexBytes<6e6);world.dispose();district.dispose();retired.push(district,world);assert.equal(world.memory.indexBytes,0);assert.equal(world.memory.sharedBVHs,0);assert.equal(props.resources.geometries.length,0);assert.equal(props.resources.materials.length,0);assert.equal(props.resources.textures.length,0);assert.equal(district.group.children.length,0);
 }
 if(global.gc){await new Promise(setImmediate);global.gc();await new Promise(setImmediate);global.gc();assert(process.memoryUsage().arrayBuffers<before+16*1024*1024,'disposed handles must not keep complete district buffers alive');}
 disposeObjectResources(model);
});
test('packed production apartment attributes still build the real photo acceleration structure',async()=>{
 const [json,nav]=await Promise.all(['building','navigation'].map(async name=>JSON.parse(await readFile('dist/client/baseline/'+name+'.json','utf8'))));
 const model=await new THREE.ObjectLoader().parseAsync(json),section=createSelection(model,nav,{level:1,target:'unit:5:1'}),scene=new THREE.Scene();scene.add(section.group);const snapshot=createPhotoScene(scene,{maxBytes:128*1024*1024,textureSize:512});
 const generator=new PathTracingSceneGenerator(snapshot.scene);try{const result=generator.generate();assert(result.bvh);assert(result.geometry.attributes.position.count>0);}finally{generator.geometry.dispose();snapshot.dispose();section.dispose();disposeObjectResources(model);}
});
