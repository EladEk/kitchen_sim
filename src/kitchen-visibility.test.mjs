import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createKitchen} from './scene.js';
import {DEFAULTS,snapshot} from './model.mjs';
import {KITCHEN_ELECTRICAL_POINTS as P,kitchenElectricalFocusSettings} from './kitchen-electrical.mjs';
import {cabinetVisibility,electricalLabelsVisible,kitchenVisibilitySettings,objectVisible} from './kitchen-visibility.mjs';
import {pickKitchenElectrical} from './electrical-picking.mjs';
import {closeAllStudioOpenings} from './studio-state.mjs';
import {applySceneUiVisibility} from './scene-interface.mjs';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const cameraFor=(point,from=[2.0,1.3,3.2])=>{const camera=new THREE.PerspectiveCamera(45,360/480,.05,30);camera.position.set(...from);camera.lookAt(...point.position);camera.updateMatrixWorld(true);return camera;};
const pixelFor=(point,camera)=>{const v=new THREE.Vector3(...point.position).project(camera);return {clientX:(v.x*.5+.5)*360+10,clientY:(-v.y*.5+.5)*480+20};};
const bounds={left:10,top:20,width:360,height:480};

test('hiding all UI removes 3D annotation rings and dimensions in place, retaining fixtures, model transforms and open fronts',()=>{
 const settings={...DEFAULTS,showElectrical:true,dimensions:true,openParts:['sink:door-left']},models=[createKitchen(settings),createHomeScene(normalizeHomeSettings(),{mode:'walk'})];
 try{for(const model of models){
  model.group.updateMatrixWorld(true);const nodes=[],transforms=new Map(),fixtures=[],annotations=[];
  model.group.traverse(o=>{nodes.push(o);transforms.set(o,o.matrixWorld.toArray());if(o.userData.part==='electrical-faceplate')fixtures.push(o);if(['electrical-highlight','electrical-annotation-hit'].includes(o.userData.part))annotations.push(o);});assert(fixtures.length>0);assert(annotations.length>0);
  annotations[0].visible=false;const old=annotations.map(o=>o.visible);
  applySceneUiVisibility(model,{...settings,cleanView:true});assert(annotations.every(o=>!o.visible));assert(fixtures.every(o=>o.visible));if(model.dimensionGroup)assert.equal(model.dimensionGroup.visible,false);
  applySceneUiVisibility(model,{...settings,cleanView:true});applySceneUiVisibility(model,{...settings,cleanView:false});assert.deepEqual(annotations.map(o=>o.visible),old,'repeated hiding restores the original visibility exactly');if(model.dimensionGroup)assert.equal(model.dimensionGroup.visible,true);
  model.group.updateMatrixWorld(true);const after=[];model.group.traverse(o=>{after.push(o);assert.deepEqual(o.matrixWorld.toArray(),transforms.get(o));});assert.deepEqual(after,nodes,'no geometry or opening object is replaced');
 }}finally{models.forEach(m=>m.dispose());}
});

test('new and pre-existing saves default to a clean, unlabelled kitchen with normal cabinets',()=>{
 assert.equal(DEFAULTS.showElectricalLabels,false);assert.equal(DEFAULTS.cabinetVisibility,'solid');
 assert.deepEqual(kitchenVisibilitySettings({}),{showElectricalLabels:false,cabinetVisibility:'solid'});
 for(const invalid of [undefined,null,'x-ray',true,5])assert.equal(cabinetVisibility({cabinetVisibility:invalid}),'solid');
 for(const invalid of [undefined,'true',1])assert.equal(electricalLabelsVisible({showElectricalLabels:invalid}),false);
 for(const mode of ['solid','translucent','hidden']){
  const save=JSON.parse(JSON.stringify(snapshot({...DEFAULTS,cabinetVisibility:mode,showElectricalLabels:true,openParts:['sink:door-left']}))),closed=closeAllStudioOpenings({getItem:()=>null,setItem(){}},{kitchen:save}).kitchen;
  assert.equal(closed.settings.cabinetVisibility,mode);assert.equal(closed.settings.showElectricalLabels,true);assert.deepEqual(closed.settings.openParts,[]);
  assert.deepEqual(kitchenVisibilitySettings(closed.settings),{cabinetVisibility:mode,showElectricalLabels:true});
 }
});

test('hidden mode removes every kitchen furnishing while preserving walls, window, floor and all real fixture positions',()=>{
 const scene=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:'hidden'});
 try{
  scene.group.updateMatrixWorld(true);assert(scene.furnishingRoots.length>20);assert(scene.furnishingRoots.every(o=>!o.visible));assert(scene.roomStructure.has(scene.windowGroup));assert(scene.windowGroup.children.filter(o=>o.userData.part==='window-glass').length===4);
  for(const root of scene.roomStructure){assert(objectVisible(root));root.traverse(o=>{if(o.isMesh){if(o.userData.part==='window-glass'){assert(o.material.transparent);assert.equal(o.material.opacity,.15);}else assert(o.material.opacity>=.98);}});}
  assert.equal(scene.electricalGroups.size,9);for(const p of P){const node=scene.electricalGroups.get(p.id);assert(objectVisible(node));assert.deepEqual(node.position.toArray(),p.position);}
  assert(scene.picks.length>0);assert(scene.picks.every(p=>!p.userData.kitchenFurnishing&&objectVisible(p)));assert(scene.electricalOccluders.every(p=>!p.userData.kitchenFurnishing));
 }finally{scene.dispose();}
});

test('translucent mode changes only furnishing materials; physical sockets/walls remain opaque and window glazing retains its transparency',()=>{
 const scene=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:'translucent'}),materials=new Set();
 try{
  for(const root of scene.furnishingRoots){assert(root.visible);root.traverse(o=>{if(!o.isMesh)return;assert(o.material.transparent);assert(o.material.opacity<=.24);assert.equal(o.material.depthWrite,false);assert.equal(o.castShadow,false);materials.add(o.material);});}
  for(const root of scene.roomStructure)root.traverse(o=>{if(o.isMesh){if(o.userData.part==='window-glass'){assert(o.material.transparent);assert.equal(o.material.opacity,.15);}else assert(o.material.opacity>=.98);assert(!materials.has(o.material),'shared stone or metal must be cloned before ghosting');}});
  for(const p of scene.electricalGroups.values()){const face=p.children.find(o=>o.userData.part==='electrical-faceplate');assert.equal(face.material.opacity,1);assert.equal(face.material.depthTest,true);}
  assert(scene.electricalOccluders.every(o=>!o.userData.kitchenFurnishing));
  let disposed=0;materials.forEach(m=>m.addEventListener('dispose',()=>disposed++));scene.dispose();assert.equal(disposed,materials.size,'all ghost materials are released');
 }catch(error){scene.dispose();throw error;}
});

test('changing cabinet visibility preserves every independent opening transform and keeps cabinet inspection readable',()=>{
 const settings={...DEFAULTS,showElectrical:true,openParts:['sink:door-left','island-1:drawer-0','oven:lift-up']},scenes=['solid','translucent','hidden'].map(cabinetVisibility=>createKitchen({...settings,cabinetVisibility}));
 try{scenes.forEach(s=>s.group.updateMatrixWorld(true));const first=scenes[0];for(const other of scenes.slice(1))for(const [id,objects] of first.openingObjects){const comparison=other.openingObjects.get(id);assert.equal(comparison.length,objects.length);for(let i=0;i<objects.length;i++)assert.deepEqual(comparison[i].matrixWorld.toArray(),objects[i].matrixWorld.toArray(),`${id} does not move`);}}
 finally{scenes.forEach(s=>s.dispose());}
 const inspected=createKitchen({...settings,cabinetVisibility:'hidden',inspection:true,selected:'sink'});
 try{const unit=inspected.moduleGroups.get('sink');assert(unit.visible);unit.traverse(o=>{if(o.isMesh)assert(o.material.opacity>=.98||o.userData.part==='active-front');});assert(inspected.picks.every(objectVisible));assert.equal(inspected.electricalGroups.size,0);}finally{inspected.dispose();}
});

test('unlabelled socket selection respects opaque cabinets, sees through translucent cabinets and selects nearby points independently',()=>{
 const p=P.find(p=>p.label==='K06'),camera=cameraFor(p),pixel=pixelFor(p,camera);
 for(const mode of ['solid','translucent','hidden']){const scene=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:mode});try{scene.group.updateMatrixWorld(true);const hit=pickKitchenElectrical({model:scene,camera,bounds,...pixel});assert.equal(hit?.object.userData.electricalId,mode==='solid'?undefined:p.id,`${mode} visibility controls picking as well as rendering`);}finally{scene.dispose();}}
 const scene=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:'hidden'});
 try{scene.group.updateMatrixWorld(true);for(const p of P.filter(p=>['K02','K03'].includes(p.label))){const camera=cameraFor(p,[1.7,1.5,3.5]),hit=pickKitchenElectrical({model:scene,camera,bounds,...pixelFor(p,camera),radius:26});assert.equal(hit?.object.userData.electricalId,p.id);}
  const behindWall=cameraFor(p,[2,1.4,-1]);assert.equal(pickKitchenElectrical({model:scene,camera:behindWall,bounds,...pixelFor(p,behindWall)}),null,'the room wall still occludes a fixture');
 }finally{scene.dispose();}
});

test('physical sockets have recessed three-hole faces, the double cluster has two, and only the selected point is outlined',()=>{
 const selected='electrical-K07',scene=createKitchen({...DEFAULTS,showElectrical:true,selectedElectricalId:selected});
 try{for(const p of P){const node=scene.electricalGroups.get(p.id),holes=node.children.filter(o=>o.userData.part==='electrical-socket-hole'),faces=node.children.filter(o=>o.userData.part==='electrical-socket-face');assert.equal(faces.length,p.kind==='outlet'?(p.label==='K04'?2:1):0);assert.equal(holes.length,faces.length*3);assert.equal(node.children.filter(o=>o.userData.part==='electrical-highlight').length,p.id===selected?1:0);const hit=node.children.find(o=>o.userData.part==='electrical-annotation-hit');assert.equal(hit.material.opacity,0);assert.equal(hit.material.depthTest,true);}}
 finally{scene.dispose();}
 const focused=kitchenElectricalFocusSettings({...DEFAULTS,cabinetVisibility:'translucent',showElectricalLabels:false,openParts:['sink:door-left']},'electrical-K09');assert.equal(focused.cabinetVisibility,'translucent');assert.equal(focused.showElectricalLabels,false);assert.deepEqual(focused.openParts,['sink:door-left','oven:lift-up']);
});
