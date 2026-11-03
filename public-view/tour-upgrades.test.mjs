import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAdaptiveQuality} from './adaptive-quality.mjs';
import {createInteriorLighting,interiorAt} from './interior-lighting.mjs';
import {zoomMapView,roomAtMap} from './tour-map.mjs';
import {readTourViews,captureTourImage} from './tour-tools.mjs';

test('adaptive quality ignores suspension/XR, degrades gradually and recovers only after sustained headroom',()=>{
 const quality=createAdaptiveQuality({mobile:true,pixelRatio:3});let now=1;
 for(let i=0;i<80;i++)quality.sample(now+=16);
 const initial=quality.profile;
 for(let i=0;i<100;i++)quality.sample(now+=500);
 assert.deepEqual(quality.profile,initial);
 for(let i=0;i<400;i++)quality.sample(now+=60,{xr:true});assert.deepEqual(quality.profile,initial);
 let changes=0;
 for(let i=0;i<500;i++)if(quality.sample(now+=65))changes++;
 assert(changes>=3);assert(quality.profile.scale<.8);assert(quality.profile.shadowSize<=1024);assert(quality.profile.detailScale<1);assert(!quality.profile.effects);
 const reduced=quality.profile.scale;
 for(let i=0;i<400;i++)quality.sample(now+=16);assert.equal(quality.profile.scale,reduced,'short headroom cannot oscillate quality');
 for(let i=0;i<1600;i++)quality.sample(now+=16);assert(quality.profile.scale>reduced);
 assert(quality.ratioForSize(3000,3000)**2*3000*3000<=1400001);
 quality.setMode('quality');for(let i=0;i<1000;i++)quality.sample(now+=90);assert.equal(quality.profile.scale,1);
 quality.setMode('performance');assert.equal(quality.profile.tier,2);
});

test('interior exposure and shared floor/wall bounce ease in and out while preserving solar night',()=>{
 const scene=new THREE.Scene(),renderer={toneMappingExposure:.98},lighting=createInteriorLighting(scene,renderer);
 assert.equal(scene.children.length,4);
 const first=lighting.update({inside:true,walking:true,solar:{daylight:.8},dt:.016});assert(first.exposure>.98&&first.exposure<1.01);
 let state;for(let i=0;i<480;i++)state=lighting.update({inside:true,walking:true,solar:{daylight:.8},dt:.016});assert(state.exposure>1.18&&state.bounce>0&&state.walls>0);
 state=lighting.update({inside:true,walking:true,solar:{daylight:0},dt:.016});assert.equal(state.bounce,0);assert.equal(state.walls,0);
 for(let i=0;i<360;i++)state=lighting.update({inside:false,walking:true,solar:{daylight:.8},dt:.016});assert(state.exposure<.99);
 lighting.dispose();assert.equal(scene.children.length,0);
 const rect=[[0,0],[4,0],[4,4],[0,4]],data={floors:[{level:0,units:[{polygon:rect}],core:rect}],destinations:[]};
 assert(interiorAt(data,{building:'4102',floor:0,position:{x:2,z:2}}));assert(!interiorAt(data,{building:'4102',floor:0,position:{x:5,z:2}}));assert(!interiorAt(data,{building:null,floor:0,position:{x:2,z:2}}));
});

test('map zoom is anchored, bounded to the plan and room highlighting follows the actual polygon',()=>{
 const base=[-2,-3,10,20],zoomed=zoomMapView(base,base,2,[3,7]);assert.deepEqual(zoomed,[.5,2,5,10]);
 const minimum=zoomMapView(base,zoomed,.01);assert.deepEqual(minimum,base);
 const maximum=zoomMapView(base,base,100,[100,-100]);assert.equal(maximum[2],2);assert.equal(maximum[3],4);assert(maximum[0]>=-2&&maximum[0]+2<=8);assert(maximum[1]>=-3&&maximum[1]+4<=17);
 const room={id:'living',polygons:[[[0,0],[3,0],[3,3],[0,3]]]};assert.equal(roomAtMap({rooms:[room]},[1,1]),room);assert.equal(roomAtMap({rooms:[room]},[4,1]),null);
});

test('saved views reject malformed coordinates and image export restores renderer size even when capture fails',async()=>{
 const valid={id:'one',name:'Living entrance',position:[10,1.62,-4],yaw:1,pitch:.1};
 assert.deepEqual(readTourViews({getItem:()=>JSON.stringify([valid,{...valid,position:[null,2,3]}])},'views'),[valid]);
 assert.deepEqual(readTourViews({getItem:()=>'{broken'},'views'),[]);
 let ratio=1.25,size=[800,600],resizes=0;const renderer={getSize:t=>t.set(...size),getPixelRatio:()=>ratio,setPixelRatio:r=>{ratio=r;},setSize:(w,h)=>{size=[w,h];},render(){},domElement:{toBlob(callback){callback(null);}}};
 await assert.rejects(captureTourImage(renderer,{}, {},{resize(){resizes++;}}));assert.equal(ratio,1.25);assert.deepEqual(size,[800,600]);assert.equal(resizes,1);
});
