import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFinishAdapter} from './webgpu-finishes.mjs';
import {createSurfacePalette} from '../src/surface-materials.mjs';
import {installWallCavity} from '../src/building-finish-shaders.mjs';
import {createInteriorProbe} from '../src/interior-probe.mjs';
import {createInteriorLighting} from './interior-lighting.mjs';
import {createReferenceLighting} from './reference-lighting.mjs';
import {traditionalMaterial} from '../src/traditional-material.mjs';

test('public and private paint follow the physical route with contact shading, no uniform emission and stable colour through lighting switches',()=>{
 const owned=[],surface=createSurfacePalette(owned),scene=new T.Scene();
 const source=surface('plaster','#f5f5f3');installWallCavity(source);
 const geometry=new T.BoxGeometry();geometry.deleteAttribute('uv');
 const mesh=new T.InstancedMesh(geometry,source,1);mesh.setMatrixAt(0,new T.Matrix4().makeScale(4,2.75,.15));scene.add(mesh);
 const adapter=createFinishAdapter();adapter.apply(scene);const paint=mesh.material;
 assert(paint.isMeshPhysicalNodeMaterial);assert(paint.normalNode&&paint.aoNode&&paint.colorNode);assert(paint.color.equals(source.color));assert.equal(traditionalMaterial(paint),source);
 const renderer={toneMapping:T.AgXToneMapping,toneMappingExposure:.98},makeEnvironment=()=>({texture:new T.Texture(),dispose(){}});
 const probe=createInteriorProbe(renderer,{mobile:true,environmentFactory:makeEnvironment});probe.bind(scene);
 const reference=createReferenceLighting(scene,renderer,{environmentFactory:makeEnvironment});reference.bind(scene);
 for(const enabled of [false,true,false,true,false]){
  reference.setEnabled(enabled);reference.beginFrame();probe.update(enabled?1:.8);reference.apply();
  assert.equal(paint.emissive.getHex(),0);assert.equal(source.emissive.getHex(),0);assert(paint.color.equals(source.color));assert(paint.normalNode&&paint.aoNode);
 }
 probe.update(0);assert.equal(paint.envMapIntensity,0);
 reference.dispose();probe.dispose();adapter.dispose();assert.equal(mesh.material,source);owned.forEach(o=>o.dispose());geometry.dispose();
});

test('room daylight gives perpendicular walls different illumination and releases all lights after repeated transitions',()=>{
 const scene=new T.Scene(),renderer={toneMappingExposure:.98},lighting=createInteriorLighting(scene,renderer),count=scene.children.length;
 const region={key:'living',position:[2,2.55,3],target:[2,0,3]};
 for(let i=0;i<480;i++)lighting.update({walking:true,inside:true,solar:{daylight:1},region});
 const key=scene.getObjectByName('tour-window-bounce'),direction=key.position.clone().sub(key.target.position).normalize();
 const facing=[new T.Vector3(-1,0,0),new T.Vector3(0,0,-1)].map(n=>Math.max(0,n.dot(direction))*key.intensity);
 assert(Math.abs(facing[0]-facing[1])>.6,'directional room light must retain shape on perpendicular white walls');assert(renderer.toneMappingExposure>1.3);assert.equal(scene.children.length,count);
 lighting.update({walking:true,inside:true,solar:{dark:true,daylight:0},region});assert.equal(key.intensity,0);
 lighting.dispose();assert.equal(scene.children.length,0);
});
