import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {LIGHTING_LAYOUT,KITCHEN_ANCHOR,ROOMS,insidePolygon,normalizeHomeSettings,lightingPoint,ENTRANCE_SERVICES} from './home-model.mjs';
import {LIGHTING_REFERENCES,lightingReference} from './home-lighting.mjs';
import {KITCHEN_LIGHTING_POINTS} from './kitchen-lighting.mjs';
import {ROOM,DEFAULTS} from './model.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {applySceneUiVisibility} from './scene-interface.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

test('every observed light has a real source rectangle, one identity and an estimated position in its host room',()=>{
 const points=LIGHTING_LAYOUT.points.filter(p=>!p.simulation);
 assert.equal(new Set(points.map(p=>p.id)).size,points.length);
 assert.equal(points.length,14);assert.equal(points.filter(p=>p.mount==='ceiling').length,10);
 for(const ref of LIGHTING_REFERENCES)assert(existsSync(new URL(`../public${ref.image}`,import.meta.url)),ref.image);
 for(const p of points){assert.equal(lightingPoint(p.id),p);assert(p.positionInferred&&p.dimensionsInferred);assert(p.evidence.length);assert(p.position.every(Number.isFinite));
  if(p.mount==='ceiling')assert(insidePolygon([p.position[0],p.position[2]],p.commonEntry?ENTRANCE_SERVICES.context.polygon:ROOMS.find(r=>r.id===p.roomId).polygon),p.id);
  for(const e of p.evidence){assert(lightingReference(e.source));const [x,y,w,h]=e.rect;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1,`${p.id} source bounds`);}
 }
 assert(!points.some(p=>p.roomId==='bedroom-a'),'wall-only and ceiling-cropped views do not establish an extra light');
 assert.equal(points.filter(p=>p.roomId==='bedroom-b').length,1,'two photos of one bedroom holder are not two lights');
 assert(points.filter(p=>['bedroom-b','bedroom-c'].includes(p.roomId)).every(p=>p.roomInferred));
 const simulated=LIGHTING_LAYOUT.points.filter(p=>p.simulation);assert.equal(simulated.length,6);assert(simulated.every(p=>p.evidence.length===0&&p.status==='simulated'));
 for(const p of simulated){assert(insidePolygon([p.position[0],p.position[2]],ROOMS.find(r=>r.id===p.roomId).polygon));assert(!points.some(q=>q.roomId===p.roomId),'temporary lamps only fill undocumented rooms');}
});

test('home fixtures exist in daylight and walking views, are pickable and hide without changing furniture or walls',()=>{
 for(const mode of ['overview','walk']){
  const visible=createHomeScene(normalizeHomeSettings(),{mode}),hidden=createHomeScene(normalizeHomeSettings({showLighting:false}),{mode});
  try{for(const p of LIGHTING_LAYOUT.points){assert(visible.gardenGroups.has(p.id));assert(visible.picks.some(m=>m.userData.lightingId===p.id));assert(!hidden.gardenGroups.has(p.id));}
   assert.equal(visible.furnitureGroups.size,hidden.furnitureGroups.size);assert.equal(visible.wallHeight,hidden.wallHeight);
   let holders=0,bulbs=0,temporary=0;visible.group.traverse(m=>{if(m.userData.part==='observed-lamp-holder')holders++;if(m.userData.part==='installed-simulator-bulb')bulbs++;if(m.userData.part==='simulator-ceiling-fixture')temporary++;});assert.equal(holders,8);assert.equal(bulbs,8);assert.equal(temporary,6);
  }finally{visible.dispose();hidden.dispose();}
 }
});

test('clean view removes lighting annotations, keeps physical holders and restores the same marker state',()=>{
 const scene=createHomeScene(normalizeHomeSettings());
 try{const marker=scene.gardenGroups.get('lighting-S-L01').children.find(m=>m.userData.part==='lighting-marker'),holder=scene.gardenGroups.get('lighting-S-L01').children.find(m=>m.userData.part==='observed-lamp-holder');
  assert(marker.visible&&holder.visible);applySceneUiVisibility(scene,{cleanView:true});assert(!marker.visible&&holder.visible);applySceneUiVisibility(scene,{cleanView:false});assert(marker.visible&&holder.visible);
 }finally{scene.dispose();}
 assert.equal(normalizeHomeSettings(JSON.parse(JSON.stringify(normalizeHomeSettings({showLighting:false})))).showLighting,false);
 const initialClean=createHomeScene(normalizeHomeSettings({cleanView:true}));try{applySceneUiVisibility(initialClean,{cleanView:true});applySceneUiVisibility(initialClean,{cleanView:false});assert(initialClean.gardenGroups.get('lighting-S-L01').children.find(m=>m.userData.part==='lighting-marker').visible);}finally{initialClean.dispose();}
 const provisional=createHomeScene(normalizeHomeSettings({electricalInferred:false}));try{assert(!provisional.gardenGroups.has('lighting-B-L01'));assert(provisional.gardenGroups.has('lighting-S-L01'));}finally{provisional.dispose();}
});

test('detailed kitchen lights use the same horizontal source locations and existing detailed-room ceiling height',()=>{
 assert.equal(KITCHEN_LIGHTING_POINTS.length,2);
 for(const p of KITCHEN_LIGHTING_POINTS){const home=lightingPoint(p.id);assert.deepEqual(p.position,[KITCHEN_ANCHOR[0]-home.position[0],ROOM.height/1000,KITCHEN_ANCHOR[1]-home.position[2]]);assert.deepEqual(p.evidence,home.evidence);}
 const visible=createKitchen(DEFAULTS),hidden=createKitchen({...DEFAULTS,showLighting:false});
 try{assert.equal(visible.lightingGroups.size,2);assert.equal(hidden.lightingGroups.size,0);assert.equal(visible.moduleGroups.size,hidden.moduleGroups.size);}finally{visible.dispose();hidden.dispose();}
});
