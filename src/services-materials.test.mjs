import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as THREE from 'three';
import {WATER_LAYOUT,ELECTRICAL_LAYOUT,KITCHEN_ANCHOR,normalizeHomeSettings,waterPoint} from './home-model.mjs';
import {ELECTRICAL_KINDS,ELECTRICAL_REFERENCES} from './home-electrical.mjs';
import {SERVICE_COLORS} from './service-colors.mjs';
import {KITCHEN_WATER_POINTS,kitchenElectricalFocusSettings} from './kitchen-electrical.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {DEFAULTS,snapshot} from './model.mjs';
import {pickKitchenElectrical} from './electrical-picking.mjs';
import {closeAllStudioOpenings} from './studio-state.mjs';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';
// The unchanged hood badge uses a canvas; scene tests supply its drawing stub.
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

test('water points keep photographed evidence separate from assumed fixture connections and never reintroduce K05 or feed the dryer',()=>{
 assert.equal(WATER_LAYOUT.points.length,12);assert.equal(new Set(WATER_LAYOUT.points.map(p=>p.id)).size,12);assert.equal(WATER_LAYOUT.points.filter(p=>p.status==='observed').length,2);
 for(const p of WATER_LAYOUT.points){assert.equal(waterPoint(p.id),p);assert(p.position.every(Number.isFinite));assert(p.positionInferred&&p.dimensionsInferred);assert.equal(p.height,p.position[1]);assert(!p.electrical);assert.notEqual(p.fixtureId,'dryer');
  if(p.status==='observed'){assert(p.evidence.length);for(const e of p.evidence){const ref=ELECTRICAL_REFERENCES.find(r=>r.page===e.page);assert(ref);assert(existsSync(new URL(`../public${ref.image}`,import.meta.url)));const [x,y,w,h]=e.rect;assert(x>=0&&y>=0&&x+w<=1&&y+h<=1);}}
  else {assert.equal(p.status,'layout');assert.equal(p.evidence.length,0);assert(p.fixtureId);assert(['harash','hercules','apartment-spec'].includes(p.source));}
 }
 assert(!WATER_LAYOUT.points.some(p=>p.label==='K05'));assert.equal(ELECTRICAL_LAYOUT.points.length,48);assert(WATER_LAYOUT.points.every(p=>!['living','bedroom-a','bedroom-b','bedroom-c','safe-room','master'].includes(p.roomId)));
 const p=KITCHEN_WATER_POINTS[0],home=waterPoint(p.id);assert.deepEqual(p.position,[KITCHEN_ANCHOR[0]-home.position[0],home.position[1],KITCHEN_ANCHOR[1]-home.position[2]]);
});

test('all actual electrical faceplates and water valves follow the same palette in the home and detailed kitchen',()=>{
 assert.equal(ELECTRICAL_KINDS.outlet.color,SERVICE_COLORS.outlet);assert.equal(ELECTRICAL_KINDS.control.color,SERVICE_COLORS.control);assert.equal(ELECTRICAL_KINDS.water.color,SERVICE_COLORS.water);
 const home=createHomeScene(normalizeHomeSettings({furniture:false})),kitchen=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:'translucent'});
 try{for(const p of ELECTRICAL_LAYOUT.points){const plate=home.gardenGroups.get(p.id).children.find(c=>c.userData.part==='electrical-faceplate');assert.equal(`#${plate.material.color.getHexString()}`,SERVICE_COLORS[p.kind]);}
  for(const p of WATER_LAYOUT.points){const group=home.gardenGroups.get(p.id);assert(group);assert(home.picks.some(o=>o.userData.waterId===p.id));const handle=group.children.find(c=>c.userData.part==='water-valve-handle');assert.equal(`#${handle.material.color.getHexString()}`,SERVICE_COLORS.water);}
  assert.equal(kitchen.waterGroups.size,1);assert.equal(kitchen.electricalGroups.size,9);const valve=kitchen.waterGroups.values().next().value.children.find(c=>c.userData.part==='water-escutcheon');assert.equal(valve.material.opacity,1);assert.equal(`#${valve.material.color.getHexString()}`,SERVICE_COLORS.water);
 }finally{home.dispose();kitchen.dispose();}
});

test('water visibility persists through design saves and global closure, with no effect on electrical observations or furniture opening states',()=>{
 const home=normalizeHomeSettings({showWater:false,openDoors:['entry']}),again=normalizeHomeSettings(JSON.parse(JSON.stringify(home))),saved=snapshot({...DEFAULTS,showWater:false,showElectrical:true,openParts:['sink:door-left']});
 assert.equal(again.showWater,false);const closed=closeAllStudioOpenings({getItem:()=>null,setItem(){}},{home:again,kitchen:saved});assert.equal(closed.home.showWater,false);assert.equal(closed.kitchen.settings.showWater,false);assert.deepEqual(closed.kitchen.settings.openParts,[]);
 const scene=createHomeScene(again),kitchen=createKitchen(saved.settings);try{assert(WATER_LAYOUT.points.every(p=>!scene.gardenGroups.has(p.id)));assert.equal(kitchen.waterGroups.size,0);assert.equal(kitchen.electricalGroups.size,9);}finally{scene.dispose();kitchen.dispose();}
 const state={...DEFAULTS,showWater:false,openParts:['sink:door-left']},focus=kitchenElectricalFocusSettings(state,'water-W01');assert.equal(focus.showWater,true);assert.equal(focus.showElectrical,true);assert.deepEqual(focus.openParts,state.openParts);
});

test('the kitchen water point can be selected without labels through hidden cabinets and remains blocked by the wall',()=>{
 const p=KITCHEN_WATER_POINTS[0],scene=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:'hidden'}),bounds={left:0,top:0,width:400,height:500};
 try{scene.group.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(45,.8,.05,30);camera.position.set(p.position[0],1.2,3);camera.lookAt(...p.position);camera.updateMatrixWorld(true);const v=new THREE.Vector3(...p.position).project(camera),hit=pickKitchenElectrical({model:scene,camera,bounds,clientX:(v.x*.5+.5)*400,clientY:(-v.y*.5+.5)*500});assert.equal(hit?.object.userData.waterId,p.id);
  camera.position.z=-1;camera.lookAt(...p.position);camera.updateMatrixWorld(true);const q=new THREE.Vector3(...p.position).project(camera);assert.equal(pickKitchenElectrical({model:scene,camera,bounds,clientX:(q.x*.5+.5)*400,clientY:(-q.y*.5+.5)*500}),null);
 }finally{scene.dispose();}
});

test('surface maps use correct color spaces, metric scale and shared resources that dispose once per scene',()=>{
 const resources=[],surface=createSurfacePalette(resources),plaster=surface('plaster','#e9e5db'),wood=surface('wood','#ae8b61');assert.strictEqual(surface('wood','#ae8b61'),wood);assert.notStrictEqual(wood,plaster);
 for(const m of [plaster,wood]){assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);assert.equal(m.bumpMap.colorSpace,THREE.NoColorSpace);assert.equal(m.roughnessMap.colorSpace,THREE.NoColorSpace);assert(m.bumpScale>0&&m.bumpScale<.002);assert.equal(m.map.wrapS,THREE.RepeatWrapping);assert(m.roughnessMap.image.data.every((v,i)=>i%4===3||v>180));}
 const geometry=metricSurfaceUVs(new THREE.BoxGeometry(4,2,.2),[3,0,1]),uv=geometry.attributes.uv;let low=Infinity,high=-Infinity;for(let i=16;i<20;i++){low=Math.min(low,uv.getX(i));high=Math.max(high,uv.getX(i));}assert(Math.abs(high-low-4)<1e-6,'four-metre face spans four metres of surface grain');geometry.dispose();
 let count=0;for(const r of resources)r.addEventListener('dispose',()=>count++);resources.forEach(r=>r.dispose());assert.equal(count,resources.length);assert.equal(new Set(resources).size,resources.length);
 const scene=createHomeScene(normalizeHomeSettings()),kitchen=createKitchen(DEFAULTS);try{const kinds=new Set();scene.group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.surfaceKind)kinds.add(m.userData.surfaceKind);});for(const k of ['paint','porcelain','wood','fabric','cement','limestone','terrace'])assert(kinds.has(k));let floor;kitchen.group.traverse(o=>{if(o.userData.productId==='dry-floor')floor=o;});assert.equal(floor.material.userData.surfaceKind,'porcelain');assert(floor.geometry.userData.metricUVs);}finally{scene.dispose();kitchen.dispose();}
});
