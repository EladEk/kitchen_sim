import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as THREE from 'three';
import {meshKey,isLightmapReceiver,applyBakedUVs,bakedCoverage,BAKED_FILL_SCALE} from './baked-lightmap-core.mjs';
import {createInteriorLighting} from './interior-lighting.mjs';
const dir=new URL('./assets/lightmaps-r188/f0-u4/',import.meta.url);
test('the 4102 ground-floor apt 4 bake is a phone-sized compressed atlas with UV1 for every receiver',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('MANIFEST.json',dir))),uv=JSON.parse(fs.readFileSync(new URL('uv2.json',dir)));
 assert.equal(m.floor,0);assert.equal(m.unit,4);assert(m.textures.every(t=>t.size[0]===1024&&t.size[1]===1024&&t.ktx2_bytes<300e3));
 for(const t of ['indirect.ktx2','ao.ktx2'])assert.equal(fs.readFileSync(new URL(t,dir)).subarray(1,7).toString(),'KTX 20');
 const lists=Object.values(uv.receivers);assert(lists.length>100);for(const l of lists){assert.equal(l.length%6,0);assert(l.every(v=>v>=0&&v<=1));}
});
test('receivers are the unit\'s own floors, ceilings and plaster walls; overlays and facades stay unbaked',()=>{
 const poly=[[0,0],[4,0],[4,4],[0,4]],box=new THREE.Box3(new THREE.Vector3(1,0,1),new THREE.Vector3(2,.02,2));
 assert(isLightmapReceiver({userData:{},material:{userData:{architecturalRole:'floor',surfaceKind:'porcelain'}}},box,poly,0));
 assert(!isLightmapReceiver({userData:{tourNonPhysical:true},material:{userData:{surfaceKind:'plaster'}}},box,poly,0));
 assert(!isLightmapReceiver({userData:{},material:{userData:{surfaceKind:'limestone',architecturalRole:'facade'}}},box,poly,0));
 assert(!isLightmapReceiver({userData:{},material:{userData:{surfaceKind:'plaster'}}},box.clone().translate(new THREE.Vector3(9,0,0)),poly,0));
});
test('UV1 is applied by geometry key to de-indexed copies, never to mismatched or shared geometry',()=>{
 const root=new THREE.Group();root.userData.level=0;const g=new THREE.BoxGeometry(1,1,1),a=new THREE.Mesh(g,new THREE.MeshStandardMaterial()),b=new THREE.Mesh(g,a.material);b.position.set(5,0,0);root.add(a,b);
 g.computeBoundingBox();const key=meshKey(g.boundingBox.clone(),g.attributes.position.count),n=g.index.count;
 const matched=applyBakedUVs(root,{[key]:new Array(n*2).fill(.5)});assert.deepEqual(matched,[a]);assert.notEqual(a.geometry,g);assert.equal(b.geometry,g);assert(a.geometry.attributes.uv1);assert.equal(a.geometry.index,null);
 const c=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),a.material);root.add(c);assert.equal(applyBakedUVs(root,{[key]:[.5,.5]}).length,0,'wrong corner count is skipped');
});
test('inside a baked unit the faked-GI fills are reduced; elsewhere unchanged',()=>{
 assert(bakedCoverage({floor:0,unit:4},[{floor:0,unit:4}]));assert(!bakedCoverage({floor:1,unit:4},[{floor:0,unit:4}]));
 const scene=new THREE.Scene(),renderer={xr:{}},lights=createInteriorLighting(scene,renderer,{manageExposure:false});
 const run=baked=>{let r;for(let i=0;i<200;i++)r=lights.update({inside:true,walking:true,solar:{daylight:1},dt:.1,baked});return r;};
 const plain=run(false),baked=run(true);assert(Math.abs(baked.bounce-plain.bounce*BAKED_FILL_SCALE.bounce)<1e-6);
 const grazing=scene.getObjectByName('tour-grazing-fill');assert(grazing.intensity>0);lights.dispose?.();
});
