import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createReferenceLighting,readReferenceLighting,saveReferenceLighting} from './reference-lighting.mjs';
test('uniform white display lighting defaults on and its explicit preference survives public/personal entry changes',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert(readReferenceLighting(storage));saveReferenceLighting(storage,false);assert(!readReferenceLighting(storage));saveReferenceLighting(storage,true);assert(readReferenceLighting(storage));assert(readReferenceLighting({getItem(){throw Error('unavailable');}}));
});
test('day, night and repeated toggles keep selected colours and targets stable, then restore solar lighting and material probes',()=>{
 const scene=new T.Scene(),sky=new T.Texture(),oldProbe=new T.Texture(),sun=new T.DirectionalLight('#ffe0b7',3),wall=new T.MeshStandardMaterial({color:'#d9d2c5',envMap:oldProbe}),renderer={toneMapping:T.AgXToneMapping,toneMappingExposure:.98};scene.environment=sky;scene.add(sun,new T.Mesh(new T.BoxGeometry(),wall));const color=wall.color.clone(),target=new T.Texture();let releases=0;
 const light=createReferenceLighting(scene,renderer,{environmentFactory:source=>{const values=source.image.data;for(let i=0;i<values.length;i+=4)assert(values[i]===values[i+1]&&values[i+1]===values[i+2],'white radiance has no sky tint');return {texture:target,dispose(){releases++;}};}});light.bind(scene);
 for(let i=0;i<12;i++){
  light.beginFrame();sun.intensity=i%2?0:3;scene.environment=i%2?null:sky;light.apply();assert.equal(sun.intensity,0);assert.equal(scene.environment,target);assert.equal(wall.envMap,target);assert(wall.color.equals(color));assert.equal(renderer.toneMapping,T.NeutralToneMapping);assert.equal(renderer.toneMappingExposure,1);
  light.setEnabled(false);light.beginFrame();sun.intensity=3;scene.environment=sky;light.apply();assert.equal(sun.intensity,3);assert.equal(scene.environment,sky);assert.equal(wall.envMap,oldProbe);assert.equal(renderer.toneMapping,T.AgXToneMapping);assert.equal(releases,0);light.setEnabled(true);
 }
 const roomProbe=new T.Texture();light.setEnabled(false);wall.envMap=roomProbe;light.beginFrame();light.apply();assert.equal(wall.envMap,roomProbe,'natural mode must keep its room reflection between frames');light.setEnabled(true);
 light.apply();light.dispose();light.dispose();roomProbe.dispose();assert.equal(releases,1);assert.equal(scene.environment,sky);assert.equal(wall.envMap,oldProbe);scene.children[1].geometry.dispose();wall.dispose();sky.dispose();oldProbe.dispose();
});
