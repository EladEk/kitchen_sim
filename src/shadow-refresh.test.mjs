import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Scene} from 'three';
import {createShadowRefresh} from './shadow-refresh.mjs';
import {createInteriorLighting} from '../public-view/interior-lighting.mjs';

test('sun shadow anchor stays fixed during short steps; movement, solar changes, and occluders invalidate it',()=>{
 const schedule=createShadowRefresh({distance:1.2}),p=new Vector3();assert(schedule.update(p,'day:14:2048',0));
 for(let i=1;i<=10;i++)assert(!schedule.update(p.set(i*.1,0,0),'day:14:2048',i*16));assert.deepEqual(schedule.anchor.toArray(),[0,0,0]);
 assert(schedule.update(p.set(1.3,0,0),'day:14:2048',180));assert(schedule.update(p,'night:14:2048',181));schedule.invalidate();assert(schedule.update(p,'night:14:2048',182));assert(schedule.update(p,'night:14:1024',183));
});

test('interior shadows render for a new room or moving door, not repeatedly while walking within the room',()=>{
 const scene=new Scene(),lighting=createInteriorLighting(scene,{toneMappingExposure:1},{mobile:true}),spot=scene.getObjectByName('tour-interior-shadow'),region={key:'lobby',position:[0,2.55,0],target:[0,0,0]};spot.shadow.map={dispose(){}};spot.shadow.needsUpdate=false;
 lighting.update({inside:true,walking:true,region,solar:{daylight:1}});assert(spot.shadow.needsUpdate);spot.shadow.needsUpdate=false;
 for(let i=0;i<360;i++)lighting.update({inside:true,walking:true,region,solar:{daylight:1}});assert.equal(spot.shadow.needsUpdate,false);
 lighting.invalidateShadows();assert(spot.shadow.needsUpdate);lighting.dispose();
});
