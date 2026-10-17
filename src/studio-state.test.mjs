import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_STORAGE,KITCHEN_STORAGE,readStudioSave,closeAllStudioOpenings} from './studio-state.mjs';
import {normalizeHomeSettings,DOORS,ALL_HOME_PARTS,openingPoint,collisionBoxes,canStand,clearStandingPosition} from './home-model.mjs';
import {DEFAULTS,snapshot} from './model.mjs';
import {OPENING_IDS} from './openings.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {SHUTTER_IDS} from './home-building-spec.mjs';

// Mock only texture painting; the door/drawer transforms are real Three.js data.
const context=new Proxy({}, {get:(obj,key)=>obj[key]||(()=>{}),set:(obj,key,value)=>(obj[key]=value,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};

test('close all persists both simulators while preserving unsaved active choices and saved finishes',()=>{
 const storage=memory(),home=normalizeHomeSettings({lang:'he',openDoors:DOORS.map(d=>d.id),openParts:ALL_HOME_PARTS.map(p=>p.id),rooms:{master:{wall:'sage'}}}),kitchen=snapshot({...DEFAULTS,base:'oak',openParts:[...OPENING_IDS]});
 storage.setItem(HOME_STORAGE,JSON.stringify(home));storage.setItem(KITCHEN_STORAGE,JSON.stringify(kitchen));
 const unsaved={...home,light:'evening'},next=closeAllStudioOpenings(storage,{home:unsaved});
 assert(next.persisted);assert.deepEqual(next.home.openDoors,[]);assert.deepEqual(next.home.openParts,[]);assert.deepEqual(next.home.closedShutters,SHUTTER_IDS);assert.deepEqual(next.kitchen.settings.openParts,[]);assert.equal(next.home.light,'evening');assert.deepEqual(next.home.rooms,home.rooms);assert.equal(next.kitchen.settings.base,'oak');assert.equal(next.kitchen.modelRevision,kitchen.modelRevision);
 assert.deepEqual(readStudioSave(storage,HOME_STORAGE),next.home);assert.deepEqual(readStudioSave(storage,KITCHEN_STORAGE),next.kitchen);
 const again=closeAllStudioOpenings(storage);assert.deepEqual(again,next,'closing again is idempotent');
 // Each rebuilt scene really returns to its closed transforms, not merely its label.
 const house=createHomeScene(next.home),rest=createHomeScene(normalizeHomeSettings({openDoors:[],closedShutters:SHUTTER_IDS})),closedKitchen=createKitchen({...DEFAULTS,...next.kitchen.settings}),restKitchen=createKitchen({...DEFAULTS,base:'oak'});
 try{
  assert.deepEqual(house.motions.map(m=>[m.id,m.target]),rest.motions.map(m=>[m.id,m.target]));
  for(const id of OPENING_IDS){const transforms=scene=>(scene.openingObjects.get(id)||[]).map(o=>[...o.position.toArray(),...o.rotation.toArray()]);assert.deepEqual(transforms(closedKitchen),transforms(restKitchen),id);}
 }finally{for(const scene of [house,rest,closedKitchen,restKitchen])scene.dispose();}
});

test('kitchen close all also clears home doors and survives absent or damaged old saves',()=>{
 const storage=memory();storage.setItem(HOME_STORAGE,'bad JSON');storage.setItem(KITCHEN_STORAGE,'null');
 const kitchen=snapshot({...DEFAULTS,lang:'he',openParts:['sink:door-left']}),next=closeAllStudioOpenings(storage,{kitchen});
 assert.deepEqual(next.home.openDoors,[]);assert.deepEqual(next.home.openParts,[]);assert.deepEqual(next.home.closedShutters,SHUTTER_IDS);assert.equal(next.kitchen.settings.lang,'he');assert.equal(next.kitchen.modelRevision,7);assert.deepEqual(next.kitchen.settings.openParts,[]);
});

test('closing every door from a doorway leaves the walking camera at a nearby clear point',()=>{
 const boxes=collisionBoxes([]);
 for(const door of DOORS){const from=openingPoint(door),to=clearStandingPosition(from,boxes);assert(to,door.id);assert(canStand(to,boxes),door.id);assert(Math.hypot(to[0]-from[0],to[1]-from[1])<.6,`${door.id} recovery stays local`);}
 const p=clearStandingPosition([5,2],boxes);assert(p);assert.deepEqual(clearStandingPosition(p,boxes),p,'a clear camera does not move');
});
