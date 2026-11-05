import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera,RenderTarget,DepthTexture,Texture} from 'three';
import {installCelestialSky} from './celestial-sky-scene.mjs';
import {createInteriorLighting} from '../public-view/interior-lighting.mjs';

for(const mobile of [false,true])test(`native ${mobile?'mobile':'desktop'} quality changes keep the sun and interior shadow owners attached`,()=>{
 const scene=new Scene(),renderer={isWebGPURenderer:true},sky=installCelestialSky({renderer,scene,camera:new PerspectiveCamera(),ownSun:true,mobile,environmentFactory:()=>({texture:new Texture(),dispose(){}})}),interior=createInteriorLighting(scene,renderer,{mobile});
 const sun=scene.getObjectByName('astronomical-light-rig').children.find(o=>o.isDirectionalLight&&o.castShadow),ceiling=scene.getObjectByName('tour-interior-shadow'),maps=[sun,ceiling].map(light=>{const map=new RenderTarget(light.shadow.mapSize.x,light.shadow.mapSize.y);map.depthTexture=new DepthTexture(map.width,map.height);light.shadow.map=map;return map;});
 let retired=false,released=0;for(const [index,map]of maps.entries())map.addEventListener('dispose',()=>{if(retired){released++;return;}const light=[sun,ceiling][index];assert.equal(map.width,light.shadow.mapSize.x,'resize is applied before another native draw');assert.equal(map.height,light.shadow.mapSize.y);});
 try{
  for(const profile of [{tier:0,shadowSize:mobile?2048:4096},{tier:1,shadowSize:mobile?1024:2048},{tier:2,shadowSize:1024},{tier:3,shadowSize:512},{tier:0,shadowSize:mobile?2048:4096}]){
   sky.setQuality(profile);interior.setQuality(profile);
   for(const [index,light]of [sun,ceiling].entries())assert.equal(light.shadow.map,maps[index],'prepared native materials retain the same target/depth objects');
   assert.equal(sun.shadow.mapSize.x,profile.shadowSize);assert.equal(ceiling.shadow.mapSize.x,mobile?(profile.tier>=2?256:512):(profile.tier>=2?512:1024));for(const light of [sun,ceiling])assert.equal(light.shadow.map.width,light.shadow.mapSize.x);assert.equal(released,0);
  }
  sun.shadow.needsUpdate=ceiling.shadow.needsUpdate=false;
  sky.setQuality({shadowSize:mobile?2048:4096,shadowInterval:90});interior.setQuality({tier:0});
  assert.equal(sun.shadow.needsUpdate,false,'ratio/interval-only updates reuse a static shadow');assert.equal(ceiling.shadow.needsUpdate,false);
  sky.trim();interior.trim();assert.equal(released,0);assert.equal(sun.shadow.map,maps[0]);assert.equal(ceiling.shadow.map,maps[1]);assert(sun.shadow.needsUpdate&&ceiling.shadow.needsUpdate);
 }finally{retired=true;interior.dispose();sky.dispose();}
 assert.equal(released,2,'targets are released when their lighting owners retire');assert.equal(scene.children.length,0);
});
