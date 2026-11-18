import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {photorealQuality,textureAnisotropy,sharpenMaterialTextures} from './photoreal-quality.mjs';
import {createFinishNodeMaterial,createFinishAdapter} from './webgpu-finishes.mjs';
import {createAdaptiveQuality} from './adaptive-quality.mjs';
import {traditionalMaterial} from '../src/traditional-material.mjs';

test('sustained slow frames adapt mobile resolution without rebuilding effect tiers',()=>{
 const adaptive=createAdaptiveQuality({mobile:true,pixelRatio:3});
 let previous=photorealQuality({mobile:true}),changes=0;
 for(let now=0;now<24000;now+=40)if(adaptive.sample(now)){
  const q=photorealQuality({mobile:true,tier:adaptive.profile.tier,enhanced:true});
  assert(q.pomSteps<=previous.pomSteps);assert(q.shadowSize<=previous.shadowSize);assert(!q.ssr&&!q.gi);previous=q;changes++;
 }
 assert(changes>1);assert.equal(previous.pomSteps,6);assert.equal(previous.ao,true);
 const desktop=photorealQuality({enhanced:true});assert(desktop.gi&&desktop.ssr&&desktop.temporal);assert.equal(desktop.pomSteps,16);
});

test('anisotropy respects device limits and never changes framebuffer/depth textures',()=>{
 assert.equal(textureAnisotropy({getMaxAnisotropy:()=>8}),8);assert.equal(textureAnisotropy({getMaxAnisotropy:()=>32}),16);
 const map=new T.Texture(),depth=new T.DepthTexture(),target=new T.RenderTarget(4,4),m=new T.MeshStandardMaterial({map});
 m.depthTexture=depth;m.envMap=target.texture;sharpenMaterialTextures(m,8);assert.equal(map.anisotropy,8);assert.equal(depth.anisotropy,1);assert.equal(target.texture.anisotropy,1);
 m.dispose();map.dispose();depth.dispose();target.dispose();
});

test('node conversion retains chosen colours and physical glass, adds cloth sheen and foliage scattering',()=>{
 for(const kind of ['wood','fabric','stone','foliage','glass']){
  const source=kind==='glass'?new T.MeshPhysicalMaterial({transmission:.92,ior:1.5,thickness:.008}):new T.MeshStandardMaterial({color:'#647361',roughness:.4});
  source.userData=kind==='foliage'?{foliage:true}:kind==='glass'?{architecturalGlass:true}:{surfaceKind:kind};
  const m=createFinishNodeMaterial(source);assert(m.isNodeMaterial);assert(m.color.equals(source.color));assert.equal(traditionalMaterial(m),source);
  if(kind==='fabric')assert(m.sheen>.4&&m.clearcoat===0);
  if(kind==='foliage')assert(m.type==='MeshSSSNodeMaterial'&&m.thicknessColorNode);
  if(kind==='glass'){assert.equal(m.transmission,.92);assert.equal(m.ior,1.5);assert.equal(m.thickness,.008);}
  m.dispose();source.dispose();
 }
});

test('shared adapted materials survive quality changes and restore/dispose exactly once',()=>{
 const source=new T.MeshStandardMaterial();source.userData.publicFinish='stone';const root=new T.Group(),geometry=new T.BoxGeometry();
 for(let i=0;i<3;i++)root.add(new T.Mesh(geometry,source));
 const adapter=createFinishAdapter({mobile:true});adapter.apply(root);const converted=root.children[0].material;let disposed=0;converted.addEventListener('dispose',()=>disposed++);
 adapter.setQuality({tier:3});adapter.apply(root);for(const o of root.children)assert.equal(o.material,converted);
 adapter.dispose();adapter.dispose();assert.equal(disposed,1);for(const o of root.children)assert.equal(o.material,source);source.dispose();geometry.dispose();
});
