import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {normalizeHomeSettings,editHomeYard,yardForSettings,yardItem,gardenElement,GARDEN_LAYOUT,SERVICE_YARD,EXTERIOR_LAYOUT,PLOT,collisionBoxes,canStand,findWalkPath,getRoom} from './home-model.mjs';
import {createHomeScene} from './home-scene.js';
import {closeAllStudioOpenings} from './studio-state.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);
const edit=(s,id,command)=>{const result=editHomeYard(s,id,command);assert(!result.error,`${id}: ${result.error}`);return result.settings;};

test('yard choices save, import and close independently while source boundaries, chamber, AC and protected window stay fixed',()=>{
 const source=JSON.stringify([GARDEN_LAYOUT,SERVICE_YARD,EXTERIOR_LAYOUT,PLOT]);let s=normalizeHomeSettings({openParts:['garden-shed:door'],openDoors:['patio']});
 s=edit(s,'shed',{dimensions:{w:2.2,d:2.4,h:2.3}});s=edit(s,'pergola',{dimensions:{w:3,d:3,h:2.8}});s=edit(s,'pergola',{dz:.2});s=edit(s,'fence',{dimensions:{h:1.8},color:'#4a4a4a'});
 const saved=normalizeHomeSettings(JSON.parse(JSON.stringify(s)));assert.deepEqual(saved.yardDesign,s.yardDesign);assert.deepEqual(saved.openParts,s.openParts);
 const closed=closeAllStudioOpenings({getItem:()=>null,setItem(){}},{home:s}).home;assert.deepEqual(normalizeHomeSettings(closed).yardDesign,s.yardDesign);
 const {garden:g,service:y}=yardForSettings(saved);near(y.shed.w,2.2);near(y.shed.d,2.4);near(g.pergolaArea,9);near(g.fence.height,1.8);
 assert.deepEqual(y.manhole,SERVICE_YARD.manhole);assert.deepEqual(y.safeWindow,SERVICE_YARD.safeWindow);assert.deepEqual(g.fence.runs,GARDEN_LAYOUT.fence.runs);
 assert(gardenElement('garden-shed',saved).noteEn.includes('selected in the simulator'));assert.deepEqual(gardenElement('garden-pergola',saved).dimensions,[3,3,2.8]);
 assert.equal(JSON.stringify([GARDEN_LAYOUT,SERVICE_YARD,EXTERIOR_LAYOUT,PLOT]),source,'source layout is never mutated');
 for(const id of ['shed','pergola','fence'])s=edit(s,id,{reset:true});assert.deepEqual(s.yardDesign,{});
});

test('shed edits reject chamber, window and condenser reserves; pergola stays in its strip and invalid imports are discarded',()=>{
 const s=normalizeHomeSettings(),cases=[['shed',{position:SERVICE_YARD.manhole.position},'chamber'],['shed',{position:[8.1,12.8]},'window'],['shed',{position:[10.5,10.8]},'ac'],['shed',{position:[20,20]},'outside'],['shed',{dimensions:{w:1,d:2.5,h:2.2}},'size'],['pergola',{position:[5,5]},'paving'],['fence',{dimensions:{h:8}},'size']];
 for(const [id,command,error] of cases){const r=editHomeYard(s,id,command);assert.equal(r.error,error);assert.equal(r.settings,s,'failed edit preserves last valid state');}
 const bad=normalizeHomeSettings({yardDesign:{shed:{x:Infinity},pergola:{w:NaN},fence:{h:9,color:'url(x)'}}});assert.deepEqual(bad.yardDesign,{});
 const moved=edit(s,'shed',{dx:-.2}),back=yardForSettings(moved).service;assert(back.shed.passage<SERVICE_YARD.shed.passage);
 const route=findWalkPath(getRoom('laundry').walk,SERVICE_YARD.manhole.position,true,[],{},moved.yardDesign);assert(route?.length,'updated obstacles still allow a route to the chamber');
});

test('actual shed walls, appliances, pergola posts/roof and fence meshes use the saved dimensions and navigation geometry',()=>{
 let s=normalizeHomeSettings();s=edit(s,'shed',{dimensions:{w:2.2,d:2.4,h:2.3}});s=edit(s,'shed',{dx:-.15});s=edit(s,'pergola',{dimensions:{w:3,d:3,h:2.8}});s=edit(s,'fence',{dimensions:{h:1.8},color:'#4a4a4a'});
 const layout=yardForSettings(s),scene=createHomeScene(s,{mode:'walk'}),boxes=collisionBoxes([],true,[],[],s.furnitureLayout,s.yardDesign);
 try{
  scene.group.updateMatrixWorld(true);const shed=scene.gardenGroups.get('garden-shed'),walls=shed.children.filter(o=>o.userData.part==='shed-wall'),bounds=new THREE.Box3().setFromObject(shed);
  near(bounds.min.x,layout.service.shed.minX);near(bounds.max.x,layout.service.shed.maxX);near(bounds.max.y,2.3);assert.equal(walls.length,5);
  for(const a of layout.service.shed.appliances){const p=scene.gardenGroups.get(a.id);near(p.position.x,a.x);near(p.position.z,a.z);assert(!canStand([a.x,a.z],boxes));}
  const roof=scene.gardenGroups.get('garden-pergola'),rb=new THREE.Box3().setFromObject(roof);near(rb.max.y,2.8);near(rb.min.x,layout.garden.bounds.minX);near(rb.max.z,layout.garden.bounds.maxZ);
  for(const p of layout.garden.posts)assert(!canStand([p.x,p.z],boxes));
  for(const run of layout.garden.fence.runs){const b=new THREE.Box3().setFromObject(scene.gardenGroups.get(run.id));near(b.max.y,run.style==='shared-wall'?1.5:1.8);}
 }finally{scene.dispose();}
});
