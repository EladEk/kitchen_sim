import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GREY_FACADE_COLOR,GREY_FACADE_ROUGHNESS,facadeAccentBays,facadeAccentRows,facadeAccentCollision} from './facade-accents.mjs';
import {BUILDING_FLOORS} from './building-layout.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {buildingBoxes} from './building-navigation.mjs';
import {createElevators} from './elevator-model.mjs';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {createFinishNodeMaterial} from '../public-view/webgpu-finishes.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';

test('grey surrounds follow only the six registered main sun balconies on each repeating floor, preserving open roof terraces',()=>{
 for(const f of BUILDING_FLOORS){const bays=facadeAccentBays(f.level);assert.equal(bays.length,f.level>=1&&f.level<=6?6:0);
  for(const bay of bays){const poly=f.balconies[bay.index],xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);assert.equal(bay.sourcePage,f.page);assert(bay.length>2);for(const p of [bay.a,bay.b])assert(p[0]>=Math.min(...xs)-1e-6&&p[0]<=Math.max(...xs)+1e-6&&p[1]>=Math.min(...zs)-1e-6&&p[1]<=Math.max(...zs)+1e-6);}
  const rows=facadeAccentRows(f.level);for(const r of [...rows.returns,...rows.beams])assert(r.every(Number.isFinite)&&r.slice(3,6).every(v=>v>0));
  assert.equal(facadeAccentRows(f.level,{height:.85}).beams.some(r=>r[1]+r[4]/2>f.elevation+.85),false,'floor cut has no floating full-height upper cap');
 }
});

test('the actual facade has a shared matte grey finish independent of stone joints in source, restored WebGL, WebGPU and photo conversion',()=>{
 const root=new THREE.Group(),resources=[],settings=normalizeHomeSettings({furniture:false,buildingLevel:9,cutaway:false});
 let finish,photo,node;
 try{
  const model=buildBuildingContext({group:root,resources,settings,mode:'building'}),materials=new Set();
  root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData.publicFinish==='render')materials.add(m);});assert.equal(materials.size,1);
  const mat=[...materials][0];assert.equal(mat.color.getHexString(),GREY_FACADE_COLOR.slice(1));assert.equal(mat.roughness,GREY_FACADE_ROUGHNESS);assert.equal(mat.metalness,0);assert(!mat.map&&!mat.bumpMap&&!mat.normalMap);
  for(const f of BUILDING_FLOORS.filter(f=>f.level>0&&f.level<=6)){const floor=model.floors.get(f.level);assert(floor.getObjectByName('building-balcony-grey-returns'));assert(floor.getObjectByName('building-balcony-grey-beams'));}
  finish=restorePublicFinishes(root,{mobile:true});assert(!mat.map&&!mat.bumpMap&&!mat.normalMap,'restoration must not put a stone/noise texture onto grey render');
  node=createFinishNodeMaterial(mat);assert(node.isNodeMaterial);assert.equal(node.color.getHexString(),GREY_FACADE_COLOR.slice(1));assert.equal(node.roughness,GREY_FACADE_ROUGHNESS);
  const sample=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),mat);sample.add(mesh);photo=createPhotoScene(sample);assert.equal(photo.scene.children[0].material.color.getHexString(),GREY_FACADE_COLOR.slice(1));assert(!photo.scene.children[0].material.map);mesh.geometry.dispose();
 }finally{photo?.dispose();node?.dispose();finish?.dispose();resources.forEach(r=>r.dispose?.());}
});

test('new vertical balcony returns have matching source walking collision while overhead beams leave standing space clear',()=>{
 for(const f of BUILDING_FLOORS){const rows=facadeAccentRows(f.level),colliders=facadeAccentCollision(f.level),boxes=buildingBoxes(f.level,normalizeHomeSettings({furniture:false}),createElevators()).filter(b=>b.greyFacade);assert.equal(colliders.length,rows.returns.length);assert.deepEqual(boxes,colliders);
  for(const b of boxes){assert(b.maxY-b.minY>2.6);assert(b.maxY<f.elevation+2.7);}
 }
});
