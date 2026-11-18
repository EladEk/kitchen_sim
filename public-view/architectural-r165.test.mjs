import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSurfacePalette} from '../src/surface-materials.mjs';
import {CEILING_MATERIAL} from '../src/ceiling-finish.mjs';
import {upgradeFurnitureMaterials} from '../src/physical-finishes.mjs';
import {createKitchenHvac} from '../src/kitchen-hvac.js';
import {createArchitecturalNight} from '../src/architectural-night.mjs';
import {capture4KImage} from './photo-capture.mjs';

test('wall and ceiling paint retain neutral albedo, separate physical finishes and shared micro normals',()=>{
 const owned=[],palette=createSurfacePalette(owned),wall=palette('plaster','#f5f5f3'),ceiling=palette('plaster','#f4f4f2',CEILING_MATERIAL);
 try{assert(wall.isMeshPhysicalMaterial&&ceiling.isMeshPhysicalMaterial);assert.equal(wall.roughness,.82);assert.equal(wall.sheen,.1);assert.equal(ceiling.roughness,.94);assert.equal(ceiling.sheen,0);assert(wall.normalMap&&ceiling.normalMap);assert.notEqual(wall.normalMap,ceiling.normalMap);assert.equal(wall.normalMap.anisotropy,16);assert.equal(wall.color.getHexString(),'f5f5f3');assert.equal(ceiling.userData.architecturalCeiling,true);assert.equal(palette('plaster','#f5f5f3'),wall);}finally{owned.forEach(o=>o.dispose());}
});
test('loaded furniture preserves textures and chosen colours while gaining physical fabric, wood and metal',()=>{
 const root=new T.Group(),map=new T.Texture(),sources=['fabric','wood','metal'].map(kind=>{const m=new T.MeshStandardMaterial({color:'#ab9876',map});m.userData.surfaceKind=kind;const mesh=new T.Mesh(new T.BoxGeometry(),m);root.add(mesh);return mesh;});upgradeFurnitureMaterials(root);
 try{for(const mesh of sources){assert(mesh.castShadow&&mesh.receiveShadow);assert(mesh.material.isMeshPhysicalMaterial);assert.equal(mesh.material.color.getHexString(),'ab9876');assert.equal(mesh.material.map,map);assert.equal(map.anisotropy,16);}assert.equal(sources[0].material.sheen,.65);assert.equal(sources[0].material.sheenRoughness,.4);assert.equal(sources[1].material.clearcoat,.2);assert.equal(sources[2].material.anisotropy,.45);}finally{for(const mesh of sources){mesh.geometry.dispose();mesh.material.normalMap?.dispose();mesh.material.dispose();}map.dispose();}
});
test('HVAC bulkheads and louvres are white painted surfaces, with recessed dark openings only',()=>{
 const owned=[],mat=(color,opts)=>{const m=new T.MeshStandardMaterial({color,...opts});owned.push(m);return m;},box=(x,y,z,w,h,d,m,p,data)=>{const g=new T.BoxGeometry(w,h,d),o=new T.Mesh(g,m);owned.push(g);o.position.set(x,y,z);o.userData=data;p.add(o);return o;};const root=createKitchenHvac({mat,box});try{let blades=0;root.traverse(o=>{if(o.userData.part==='hvac-horizontal-louvre'){blades++;assert.equal(o.material.color.getHexString(),'f7f6f2');assert.equal(o.material.metalness,0);}});assert(blades>8);}finally{owned.forEach(o=>o.dispose());}
});
test('night warmth and local LTC strips restore their daytime appearance without allocating new lights per frame',()=>{
 const scene=new T.Scene(),light=new T.SpotLight('#fff1df',10);light.userData.fixtureLight=true;scene.add(light);const m=new T.MeshStandardMaterial({emissive:'#fff1df',emissiveIntensity:.4}),strip=new T.Mesh(new T.BoxGeometry(3,.01,.02),m);strip.userData.part='pergola-led-strip';strip.position.y=2;scene.add(strip);const rig=createArchitecturalNight(scene);rig.bind(scene);const count=scene.children.length;
 try{rig.update({night:true});assert.equal(light.color.getHexString(),'ffe2b1');assert(m.emissiveIntensity>=1.6);assert(scene.children.filter(o=>o.isRectAreaLight).some(o=>o.intensity>0));for(let i=0;i<5;i++)rig.update({night:true});assert.equal(scene.children.length,count);rig.update({night:false});assert.equal(light.color.getHexString(),'fff1df');assert.equal(m.emissiveIntensity,.4);}finally{rig.dispose();strip.geometry.dispose();m.dispose();}
});
test('4K accumulation exports exact UHD and restores viewport, camera and overlays on success and failure',async()=>{
 for(const fail of [false,true]){let width=700,height=500,ratio=2,time=0,draws=0,restored=0,disposed=0;const scene=new T.Scene(),overlay=new T.Object3D();overlay.userData.part='selection-outline';scene.add(overlay);const camera=new T.PerspectiveCamera(55,1.4,.1,100);camera.setViewOffset(700,500,.2,.1,700,500);const oldView={...camera.view};
  const renderer={isWebGPURenderer:true,getSize:v=>v.set(width,height),getPixelRatio:()=>ratio,setPixelRatio:v=>ratio=v,setSize(w,h){width=w;height=h;},getRenderTarget:()=>null,setRenderTarget(){},getMRT:()=>null,setMRT(){},domElement:{toBlob(fn){assert.equal(width,3840);assert.equal(height,2160);assert(!overlay.visible);fn(new Blob(['png'],{type:'image/png'}));}}};
  const promise=capture4KImage(renderer,scene,camera,{clock:()=>time,yieldFrame:async()=>{time+=500;},pipelineFactory:()=>({render(){draws++;if(fail&&draws===3)throw Error('device error');},dispose(){disposed++;}}),restore:()=>restored++});
  if(fail)await assert.rejects(promise,/device error/);else{const blob=await promise;assert.equal(blob.type,'image/png');assert(draws>=6);}
  assert.equal(width,700);assert.equal(height,500);assert.equal(ratio,2);assert.equal(camera.aspect,1.4);assert.deepEqual(camera.view,oldView);assert(overlay.visible);assert.equal(restored,1);assert.equal(disposed,1);
 }
});
