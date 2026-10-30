import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {celestialState,effectiveSolar,israelClock,skyDirection,skyPixels} from './celestial-sky.mjs';
import {solarDefaults,normalizeSolar,openingSolar} from './solar-lighting.mjs';
import {createCelestialDisks} from './celestial-disks.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';
import {installCelestialSky} from './celestial-sky-scene.mjs';
const near=(a,b,t=1e-6)=>assert(Math.abs(a-b)<t,`${a} ≈ ${b}`),manual=(date,minutes,extra={})=>({solar:{date,minutes,live:false,...extra}});

test('live Israel time handles local date rollover and DST repeated hours without shifting the UTC instant',()=>{
 const now=new Date('2026-10-28T22:30:45Z');assert.deepEqual(israelClock(now),{date:'2026-10-29',minutes:30});
 assert.equal(effectiveSolar({live:true},now).minutes,30);
 const summer=celestialState(manual('2026-06-21',720)),winter=celestialState(manual('2026-12-21',720));assert.equal(summer.instant.toISOString(),'2026-06-21T09:00:00.000Z');assert.equal(winter.instant.toISOString(),'2026-12-21T10:00:00.000Z');
 for(const iso of ['2026-10-24T22:30:00Z','2026-10-24T23:30:00Z'])assert.equal(celestialState({solar:{live:true}},new Date(iso)).instant.toISOString(),iso.replace('Z','.000Z'));
});
test('moon phases agree with US Naval Observatory primary phases and the Sun/Moon align near the NASA 2024 eclipse',()=>{
 // USNO: New Moon 2024-04-08 18:21 UT; Full Moon 2024-04-23 23:49 UT.
 // https://aa.usno.navy.mil/calculated/moon/phases?date=2024-4-08&format=p&nump=5
 assert(celestialState(manual('2024-04-08',21*60+21)).moon.fraction<.001);
 assert(celestialState(manual('2024-04-24',2*60+49)).moon.fraction>.999);
 // NASA GSFC greatest eclipse ~18:17 UT, 25.3N/104.1W: Sun altitude 69.8°.
 const eclipse=celestialState(manual('2024-04-08',21*60+17,{latitude:25.3,longitude:-104.1,northBearing:0}));
 near(eclipse.sun.elevation,69.8,.5);near(eclipse.sun.elevation,eclipse.moon.elevation,.5);near(eclipse.sun.azimuth,eclipse.moon.azimuth,1);
});
test('celestial directions use plan north and the kitchen rotation, and a daylight Moon remains possible',()=>{
 const source=manual('2026-10-28',22*60),a=celestialState(source),b=celestialState(source,new Date(),{kitchen:true});
 assert(a.moon.aboveHorizon);assert(a.sun.elevation<0);near(a.moon.direction[0],-b.moon.direction[0]);near(a.moon.direction[2],-b.moon.direction[2]);near(a.moon.direction[1],b.moon.direction[1]);near(Math.hypot(...a.moon.direction),1);
 const east=skyDirection(90,0,0);near(east[0],1);near(east[2],0);const north=skyDirection(0,0,0);near(north[2],-1);
 assert(celestialState(manual('2026-10-28',8*60)).moon.aboveHorizon,'Moon is not artificially restricted to night');
});
test('HDR sky includes finite night illumination and the phase renderer makes a full disk brighter than a new one',()=>{
 const state=celestialState(manual('2026-10-28',22*60));state.moon.angularRadius=.12;
 const full=skyPixels({...state,moon:{...state.moon,fraction:1}},{width:256,height:128}),dark=skyPixels({...state,moon:{...state.moon,fraction:0}},{width:256,height:128});
 assert(full.data.every(Number.isFinite));let difference=0;for(let i=0;i<full.data.length;i+=4)difference+=full.data[i]-dark.data[i];assert(difference>10);
 const noon=skyPixels(celestialState(manual('2026-06-21',12*60)),{width:1024,height:512});assert(noon.data.some(value=>value>1),'HDR Sun disc or glow is brighter than diffuse sky');
});
test('the same infinite sky drives the raster and photo renderers, updates once per minute, and respects lamp-only mode',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),original=new THREE.Color('white');scene.background=original;let settings={solar:{live:true}},builds=0,disposed=0;
 const sky=installCelestialSky({renderer:{},scene,camera,getSettings:()=>settings,ownSun:true,mobile:true,environmentFactory:()=>{builds++;return {texture:new THREE.Texture(),dispose(){disposed++;}};}});
 const date=new Date('2026-10-28T20:00:00Z');sky.update({now:date});const texture=scene.background;assert(texture.isDataTexture);assert.equal(scene.userData.photoEnvironment,texture);assert(scene.environment);assert.equal(builds,1);
 sky.update({now:new Date('2026-10-28T20:00:30Z')});assert.equal(scene.background,texture);assert.equal(builds,1);
 sky.update({now:new Date('2026-10-28T20:01:00Z')});assert.equal(builds,2);assert.equal(disposed,1);
 settings={...settings,light:'night'};sky.update({now:date});assert.equal(scene.environment,null);scene.traverse(o=>{if(o.isLight)assert.equal(o.intensity,0);});
 sky.dispose();assert.equal(disposed,3);assert.equal(scene.background,original);assert.equal(scene.children.length,0);
});


test('Sun disk pixels match Three equirectUv coordinates, so north and the horizon are not mirrored',()=>{
 const state=celestialState(manual('2026-06-21',12*60)),image=skyPixels(state,{width:2048,height:1024}),[x,y,z]=state.sun.direction;
 // Exact convention used by Three ShaderChunk.common.equirectUv and the path tracer.
 const u=Math.atan2(z,x)/(Math.PI*2)+.5,v=Math.asin(y)/Math.PI+.5;
 const ix=Math.floor(u*image.width),iy=Math.floor(v*image.height),index=(iy*image.width+ix)*4;
 assert(image.data[index]>10,'Sun disk is at the astronomical world direction');
 const opposite=((image.height-1-iy)*image.width+(image.width-1-ix))*4;
 assert(image.data[opposite]<1,'mirrored sky position must not contain the Sun');
});

test('noon diffuse illumination is useful indoors and fades with the Sun without brightening lamps-only mode',()=>{
 const noon=celestialState(manual('2026-06-21',720));
 const night=celestialState(manual('2026-06-21',0));
 const dark=celestialState({...manual('2026-06-21',720),light:'night'});
 assert(noon.environmentIntensity>.8);assert(night.environmentIntensity<.02);assert.equal(dark.environmentIntensity,0);assert.equal(dark.sunIntensity,0);
});

test('opening defaults to noon and old saved live settings cannot turn on the clock implicitly',()=>{
 assert.equal(solarDefaults().live,false);assert.equal(normalizeSolar().live,false);
 const old={live:true,minutes:7,date:'2024-01-01',northBearing:82};
 const restored=openingSolar(old);assert.equal(restored.minutes,720);assert.equal(restored.live,false);assert.equal(restored.northBearing,82);
 const now=new Date('2026-10-28T22:30:00Z');assert.equal(effectiveSolar(undefined,now).minutes,720);
 assert.equal(effectiveSolar({live:true},now).minutes,30);
});
test('screen-resolution celestial disks keep direction, phase and horizon visibility and do not enter the photo BVH',()=>{
 const disks=createCelestialDisks(),scene=new THREE.Scene();scene.add(disks.mesh);
 const day=celestialState(manual('2026-06-21',720));disks.update(day);
 assert.equal(disks.mesh.material.uniforms.sunVisible.value,1);
 assert.deepEqual(disks.mesh.material.uniforms.sunDirection.value.toArray(),day.sun.direction);
 assert.equal(disks.mesh.material.depthWrite,false);assert.equal(disks.mesh.material.depthTest,true);assert.equal(disks.mesh.frustumCulled,false);
 const night=celestialState(manual('2026-10-28',22*60));disks.update(night);
 assert.equal(disks.mesh.material.uniforms.sunVisible.value,0);assert.equal(disks.mesh.material.uniforms.moonVisible.value,1);
 assert.equal(disks.mesh.material.uniforms.moonFraction.value,night.moon.fraction);
 const photo=createPhotoScene(scene);assert.equal(photo.meshes,0);photo.dispose();
 disks.update({...night,dark:true});assert.equal(disks.mesh.visible,false);disks.dispose();
});
test('manual noon sky does not regenerate each minute and toggling live time resumes the clock',()=>{
 let settings={};let builds=0;const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const sky=installCelestialSky({renderer:{},scene,camera,getSettings:()=>settings,mobile:true,environmentFactory:()=>{builds++;return {texture:new THREE.Texture(),dispose(){}};}});
 sky.update({now:new Date('2026-10-28T20:00:00Z')});sky.update({now:new Date('2026-10-28T20:01:00Z')});assert.equal(builds,1);assert.equal(sky.state.solar.minutes,720);
 settings={solar:{live:true}};sky.update({now:new Date('2026-10-28T20:02:00Z')});assert.equal(sky.state.solar.minutes,22*60+2);sky.dispose();
});

test('wide district shadow coverage keeps astronomical directions and snaps sub-texel camera motion',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),sky=installCelestialSky({renderer:{},scene,camera,getSettings:()=>manual('2026-10-30',720),ownSun:true,mobile:true,environmentFactory:()=>({texture:new THREE.Texture(),dispose(){}})});
 const focus=new THREE.Vector3();sky.update({focus,shadowRadius:240});let sun;scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)sun=o;});assert(sun);
 const before=sun.target.position.clone(),axis=new THREE.Vector3(...sky.state.sun.direction),right=new THREE.Vector3(0,1,0).cross(axis).normalize(),up=axis.clone().cross(right).normalize();sky.update({focus:new THREE.Vector3(.000001,.000001,.000001),shadowRadius:240});const movement=sun.target.position.clone().sub(before);assert(Math.abs(movement.dot(right))<1e-8);assert(Math.abs(movement.dot(up))<1e-8);
 const direction=sun.position.clone().sub(sun.target.position).normalize();assert(direction.distanceTo(new THREE.Vector3(...sky.state.sun.direction))<1e-10);assert.equal(sun.shadow.camera.right,240);assert(sun.shadow.camera.far>1000);sky.dispose();
});
