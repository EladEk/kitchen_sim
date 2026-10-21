import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as THREE from 'three';
import {solarPosition,solarDefaults,normalizeSolar,israelUtcOffset,daylightState,SOLAR_SITE} from './solar-lighting.mjs';
import {applyDaylightPresentation} from './daylight-scene.js';
import {normalizeHomeSettings,LIGHTING_LAYOUT,ROOMS} from './home-model.mjs';
import {normalizeKitchenDesign} from './planning-pair.mjs';
import {DEFAULTS} from './model.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {lightControl} from './lighting-controls.mjs';
import {designEvidence} from './design-evidence.mjs';
import {applySceneUiVisibility} from './scene-interface.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} ≈ ${b}`);
const nodes=model=>{const out=[];model.group.traverse(o=>out.push(o));return out;};
const at=(date,hour)=>({...solarDefaults(),date,minutes:hour*60});

test('solar position follows civil Israel time, seasons and the independently published NREL reference',()=>{
 assert.equal(israelUtcOffset('2026-06-21',720),3);assert.equal(israelUtcOffset('2026-12-21',720),2);
 const morning=solarPosition(at('2026-06-21',8)),afternoon=solarPosition(at('2026-06-21',16));assert(morning.azimuth>60&&morning.azimuth<100);assert(afternoon.azimuth>250&&afternoon.azimuth<300);
 assert(solarPosition(at('2026-06-21',12)).elevation>solarPosition(at('2026-12-21',12)).elevation+30);assert(!solarPosition(at('2026-12-21',20)).aboveHorizon);
 // NREL/TP-560-34302, Appendix A.5, https://docs.nlr.gov/docs/fy08osti/34302.pdf
 // 2003-10-17 12:30:30 MST = 21:30:30 Israel. This simpler NOAA approximation
 // intentionally omits refraction and seconds, so use a 0.5° tolerance.
 const ref=solarPosition({date:'2003-10-17',minutes:1290,latitude:39.742476,longitude:-105.1786,northBearing:0});near(ref.azimuth,194.34024,.5);near(ref.elevation,90-50.11162,.5);
});

test('the plan north arrow supplies the default bearing and invalid imports cannot corrupt the sun',()=>{
 assert.equal(SOLAR_SITE.northBearing,135);assert(existsSync(new URL('../public'+SOLAR_SITE.northImage,import.meta.url)));assert.equal(SOLAR_SITE.apartment,'4');assert.equal(SOLAR_SITE.building,'4102');
 const broken=normalizeSolar({date:'2026-99-99',minutes:Infinity,latitude:NaN,longitude:-500,northBearing:-225});assert.equal(broken.date,solarDefaults().date);assert.equal(broken.minutes,720);assert.equal(broken.longitude,-180);assert.equal(broken.northBearing,135);
 assert.equal(normalizeSolar({date:'2026-02-30'}).date,solarDefaults().date);
 const a=solarPosition(at('2026-06-21',8)),b=solarPosition({...a,northBearing:a.northBearing+180});near(a.direction[0],-b.direction[0]);near(a.direction[2],-b.direction[2]);near(a.direction[1],b.direction[1]);near(Math.hypot(...a.direction),1);
});

test('dark mode and time after sunset remove the sun, sky and environment, and daylight restores them',()=>{
 const scene=new THREE.Scene(),environment=new THREE.Texture();scene.environment=environment;scene.background=new THREE.Color();
 const day={light:'day',solar:at('2026-06-21',12)};applyDaylightPresentation(scene,day);assert.equal(scene.environment,environment);assert(scene.environmentIntensity>0);
 applyDaylightPresentation(scene,{...day,light:'night'});assert.equal(scene.environment,null);assert.equal(scene.environmentIntensity,0);assert.equal(daylightState({...day,light:'night'}).intensity,0);
 applyDaylightPresentation(scene,{...day,solar:at('2026-12-21',23)});assert.equal(scene.environment,null);assert.equal(scene.environmentIntensity,0);
 applyDaylightPresentation(scene,day);assert.equal(scene.environment,environment);assert(scene.environmentIntensity>0);environment.dispose();
});

test('both real scenes have only fixture illumination in dark mode and no illumination with lamps switched off',()=>{
 for(const lampsOn of [true,false])for(const make of [()=>createHomeScene(normalizeHomeSettings({light:'night',lampsOn}),{mode:'walk'}),()=>createKitchen({...DEFAULTS,light:'night',lampsOn})]){
  const model=make();try{const all=nodes(model),active=all.filter(o=>o.isLight&&o.intensity>0&&o.visible);assert.equal(active.length>0,lampsOn);assert(active.every(o=>o.userData.fixtureLight));assert(!all.some(o=>o.userData.part==='sun-position-marker'&&o.visible));assert(active.filter(o=>o.castShadow).length<=6);if(!lampsOn)assert(all.filter(o=>o.isMesh&&o.userData.part!=='electrical-highlight').every(o=>(Array.isArray(o.material)?o.material:[o.material]).every(m=>!m.emissiveIntensity||m.emissive?.getHex()===0)));}finally{model.dispose();}
 }
});

test('the moving sun updates in place in both coordinate systems and glass admits sunlight',()=>{
 const home=createHomeScene(normalizeHomeSettings({cutaway:false,solar:at('2026-06-21',8)})),kitchen=createKitchen({...DEFAULTS,solar:at('2026-06-21',8)});
 try{
  const hsun=nodes(home).find(o=>o.userData.part==='solar-directional-light'),ksun=nodes(kitchen).find(o=>o.userData.part==='solar-directional-light'),before=hsun.position.clone(),count=nodes(home).length,identity=home.group.children[0];
  for(const model of [home,kitchen])model.updateDaylight({light:'day',solar:at('2026-06-21',16)});
  assert(!hsun.position.equals(before));assert.equal(nodes(home).length,count);assert.equal(home.group.children[0],identity);
  const hd=hsun.position.clone().sub(hsun.target.position).normalize(),kd=ksun.position.clone().sub(ksun.target.position).normalize();near(hd.x,-kd.x);near(hd.z,-kd.z);near(hd.y,kd.y);
  for(const model of [home,kitchen]){const glass=nodes(model).filter(o=>o.userData.glazing);assert(glass.length>0);assert(glass.every(o=>o.castShadow===false),'transparent panes cannot cast opaque daylight shadows');const roof=nodes(model).find(o=>o.userData.part==='solar-ceiling-occluder');assert(roof?.castShadow);assert.equal(roof.material.colorWrite,false,'shadow ceiling does not hide the interior from the orbit camera');}
 }finally{home.dispose();kitchen.dispose();}
});

test('temporary lights fill only undocumented rooms, never claim photo evidence and remain physical in clean view',()=>{
 const temporary=LIGHTING_LAYOUT.points.filter(p=>p.simulation);assert.equal(temporary.length,6);
 for(const room of ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind)))assert(LIGHTING_LAYOUT.points.some(p=>p.roomId===room.id));
 for(const p of temporary){assert.deepEqual(p.evidence,[]);assert.equal(designEvidence(p).basis,'estimate');assert.equal(lightControl({},p.id).kelvin,4000);}
 const model=createHomeScene(normalizeHomeSettings({light:'night'}));try{applySceneUiVisibility(model,{cleanView:true});for(const p of temporary){const g=model.gardenGroups.get(p.id);assert(g.children.find(o=>o.userData.part==='simulator-ceiling-fixture').visible);assert(!g.children.find(o=>o.userData.part==='lighting-marker').visible);assert(g.children.some(o=>o.userData.fixtureLight&&o.intensity>0));}}finally{model.dispose();}
});

test('both save formats retain time, dark mode and temporary lamp choices with 4000K defaults',()=>{
 const solar=at('2026-12-21',16),id=LIGHTING_LAYOUT.points.find(p=>p.simulation).id,lightControls={[id]:{enabled:false,brightness:42,kelvin:3000}},input={solar,light:'night',lampsOn:false,lightControls};
 for(const normalize of [normalizeHomeSettings,normalizeKitchenDesign]){const value=normalize(JSON.parse(JSON.stringify(input)));assert.deepEqual(value.solar,solar);assert.equal(value.light,'night');assert.equal(value.lampsOn,false);assert.deepEqual(value.lightControls,lightControls);assert.equal(lightControl(normalize(),id).kelvin,4000);}
});
