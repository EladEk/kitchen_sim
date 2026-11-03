import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRoomEnvironment,roomEnvironmentKey,roomLightingRegion} from './room-environment.mjs';
import {createInteriorLighting} from './interior-lighting.mjs';

const rect=[[0,0],[4,0],[4,4],[0,4]],data={storey:3.05,floors:[{level:0,elevation:0,units:[{number:4,polygon:rect}],core:rect,map:{rooms:[]}}],destinations:[]};
test('walking between rooms never swaps the sky IBL, renders a cube or changes colour management',()=>{
 const scene=new THREE.Scene(),sky=new THREE.Texture();scene.environment=sky;scene.environmentIntensity=.6;const renderer={toneMapping:THREE.AgXToneMapping,render(){throw Error('Unexpected offscreen room rendering');}},controller=createRoomEnvironment(renderer,scene,{createTarget(){throw Error('Unexpected room target');}});
 for(const key of ['hall','master','hall','living'])for(let now=0;now<1500;now+=16){assert.equal(controller.update({now,key,position:new THREE.Vector3(1,1.62,1),inside:true,walking:true}),false);assert.equal(scene.environment,sky);assert.equal(scene.environmentIntensity,.6);assert.equal(renderer.toneMapping,THREE.AgXToneMapping);}
 assert.equal(controller.stats.targets,0);controller.invalidate();controller.trim();controller.dispose();
});
test('interior fill has one neutral local shadow, bounded mobile maps, gentle room transitions and no daylight at night',()=>{
 const scene=new THREE.Scene(),sky=new THREE.Texture();scene.environment=sky;const renderer={toneMappingExposure:.98},lighting=createInteriorLighting(scene,renderer,{mobile:true}),spot=scene.getObjectByName('tour-interior-shadow'),a={key:'a',position:[1,2.55,1],target:[1,0,1]},b={key:'b',position:[3,2.55,3],target:[3,0,3]};assert(spot.castShadow);assert.equal(spot.shadow.mapSize.x,512);const colour=spot.color.clone();let state;
 for(let i=0;i<240;i++)state=lighting.update({inside:true,walking:true,solar:{daylight:1},dt:1/60,region:a});assert(state.shadow>8);assert.equal(scene.environment,sky);assert(spot.position.equals(new THREE.Vector3(...a.position)));const before=spot.intensity;
 lighting.update({inside:true,walking:true,solar:{daylight:1},dt:1/60,region:b});assert(spot.intensity<before&&spot.intensity>before*.8);assert(spot.position.equals(new THREE.Vector3(...a.position)),'fade the old shadow before moving its source');for(let i=0;i<240;i++)lighting.update({inside:true,walking:true,solar:{daylight:1},dt:1/60,region:b});assert(spot.position.equals(new THREE.Vector3(...b.position)));assert(spot.color.equals(colour));lighting.setQuality({tier:3,shadowInterval:140});assert.equal(spot.shadow.mapSize.x,256);state=lighting.update({inside:true,walking:true,solar:{daylight:0},dt:1/60,region:b});assert.equal(state.shadow,0);assert.equal(state.bounce,0);lighting.dispose();lighting.dispose();assert.equal(scene.children.length,0);
});
test('room identity and ceiling fill use the occupied private polygon without copying it to another building',()=>{
 const overrides=new Map([['4102:0:4',{layer:{rooms:[{id:'master',unit:4,label:[2,2],polygons:[rect]}]}}]]),location={building:'4102',floor:0,unit:4,position:{x:1,z:1}};
 assert.equal(roomEnvironmentKey(data,location,overrides),'4102:0:4:master');assert.deepEqual(roomLightingRegion(data,location,overrides),{key:'4102:0:4:master',position:[2,2.55,2],target:[2,0,2]});assert.equal(roomEnvironmentKey(data,{...location,building:'4103'},overrides),'4103:0:4:common');assert.equal(roomLightingRegion(data,{...location,building:null},overrides),null);
});
test('lowered common rooms use their real floor elevation for the interior shadow',()=>{
 const shared={...data,destinations:[{id:'pumps',floor:0,elevation:-1.05,polygon:rect,position:[2,2]}]},region=roomLightingRegion(shared,{building:'4102',floor:0,position:{x:1,z:1}});assert.equal(region.target[1],-1.05);assert(Math.abs(region.position[1]-1.5)<.00001);
});
