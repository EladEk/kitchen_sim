import test from 'node:test';
import assert from 'node:assert/strict';
import {newHistory,commitDesign,stepHistory} from './design-history.mjs';
import {readVariants,writeVariants,saveVariant,variantDifferences,variantBackup,mergeVariantBackup,VARIANT_STORAGE} from './design-variants.mjs';
import {normalizeHomeSettings,getFurniture,furnitureBounds,getRoom,LIGHTING_LAYOUT} from './home-model.mjs';
import {DEFAULTS} from './model.mjs';
import {cleanDesignPair,normalizeKitchenDesign} from './planning-pair.mjs';
import {assistedFurnitureMove,furnitureClearances} from './furniture-assistance.mjs';
import {normalizeLightControls,lightOutput} from './lighting-controls.mjs';
import {designEvidence} from './design-evidence.mjs';
import {planningReport} from './planning-report.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});globalThis.document={createElement:()=>({getContext:()=>context})};

test('undo and redo restore full home/kitchen alternatives without changing the visible language or clearing a valid redo on UI changes',()=>{
 const original={...normalizeHomeSettings(),kitchenDraft:{...DEFAULTS}},changed={...original,yardDesign:{fence:{h:1.8,color:'#223344'}},kitchenDraft:{...DEFAULTS,base:'oak'}};
 let h=commitDesign(newHistory(original),changed);assert.equal(h.past.length,1);
 h=commitDesign(h,{...h.present,lang:'en',cleanView:true});assert.equal(h.past.length,1);
 h=stepHistory(h,'undo');assert.deepEqual(h.present.yardDesign,{});assert.equal(h.present.kitchenDraft.base,DEFAULTS.base);assert.equal(h.present.lang,'en');assert(h.present.cleanView);
 h=commitDesign(h,{...h.present,cleanView:false});assert.equal(h.future.length,1);
 h=stepHistory(h,'redo');assert.equal(h.present.kitchenDraft.base,'oak');assert.equal(h.present.yardDesign.fence.color,'#223344');assert.equal(h.present.cleanView,false);
 h=stepHistory(h,'undo');h=commitDesign(h,{...h.present,light:'evening'});assert.equal(h.future.length,0);
});
test('continuous drag/colour updates form one undo step, distinct gestures remain independent and history stays bounded',()=>{
 let h=newHistory({value:0});for(let i=1;i<40;i++)h=commitDesign(h,{value:i},{group:'drag:bed',time:i*10});assert.equal(h.past.length,1);assert.equal(stepHistory(h,'undo').present.value,0);
 h=commitDesign(h,{value:40},{group:'drag:bed',time:2000});assert.equal(h.past.length,2);
 for(let i=41;i<130;i++)h=commitDesign(h,{value:i});assert.equal(h.past.length,50);assert.equal(stepHistory(h,'undo').present.value,128);
});
test('named alternatives survive storage, can be updated/deleted, preserve independent snapshots and support an importable backup',()=>{
 const pair=cleanDesignPair(normalizeHomeSettings(),DEFAULTS),memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 let r=saveVariant([],{...pair,name:'Small shed'},1),first=r.item;r.items[0].home.yardDesign.fence={h:1.6,color:'#aabbcc'};assert.deepEqual(pair.home.yardDesign,{});
 let items=r.items;r=saveVariant(items,{...pair,name:'Large shed'},2);items=r.items;assert.equal(items.length,2);
 assert(variantDifferences(items[0],items[1]).find(p=>p.id==='yard').changed);
 r=saveVariant(items,{...pair,id:first.id,name:'Renamed'},3);items=r.items;assert.equal(items.length,2);assert.equal(items[0].name,'Renamed');
 writeVariants(storage,items);assert.deepEqual(readVariants(storage),items);assert.deepEqual(mergeVariantBackup([],variantBackup(items)),items);assert.deepEqual(mergeVariantBackup(items,variantBackup(items)),items,'import does not silently duplicate existing IDs');
 assert.throws(()=>mergeVariantBackup(items,{items:[]}));assert.equal(saveVariant(items,{...pair,name:'  '}).error,'name');
 storage.setItem(VARIANT_STORAGE,'bad json');assert.deepEqual(readVariants(storage),[]);
 const full=Array.from({length:12},(_,i)=>({...first,id:String(i)}));assert.equal(saveVariant(full,{...pair,name:'extra'}).error,'limit');
});
test('smart snapping aligns the actual bed footprint near a wall, can be disabled, and never accepts a collision as a snap',()=>{
 const settings=normalizeHomeSettings(),f=getFurniture('bed-a',settings),position=[f.position[0]+.07,f.position[1]+.06];
 const snapped=assistedFurnitureMove(settings,f.id,{position});assert(!snapped.error);assert(snapped.snapped);const b=furnitureBounds(getFurniture(f.id,snapped.settings));assert(Math.abs(b.minX-.02)<.002&&Math.abs(b.minZ-getRoom(f.roomId).polygon[0][1]-.02)<.002);
 const free=assistedFurnitureMove({...settings,furnitureSnap:false},f.id,{position});assert(!free.error);assert.deepEqual(getFurniture(f.id,free.settings).position,position.map(v=>Math.round(v*1000)/1000));
 const collision=assistedFurnitureMove(settings,'safe-storage',{position:getFurniture('safe-bed',settings).position});assert(collision.error);assert.equal(collision.settings,settings);
});
test('clearance guides and panel data use rotated furniture footprints, room walls and actual opening spans in centimetres',()=>{
 const settings=normalizeHomeSettings(),item=getFurniture('bed-a'),c=furnitureClearances(settings,item.id),b=furnitureBounds(item);
 assert(Math.abs(c.directions.left.gap-b.minX)<1e-8);assert(c.door.gap>0);assert(c.window.gap>=0);assert(c.nearestFurniture.id);
 for(const value of Object.values(c.directions).filter(Boolean)){assert(value.gap>=0);assert(Math.abs(Math.hypot(value.from[0]-value.to[0],value.from[1]-value.to[1])-value.gap)<1e-8);}
});
test('evidence distinguishes photographed fittings from estimated coordinates and user-selected furniture sizes',()=>{
 assert.deepEqual(designEvidence(LIGHTING_LAYOUT.points[0]),{basis:'photo',position:'estimate',dimensions:'estimate'});
 const f=getFurniture('bed-a'),changed={...f,userDimensions:true};assert.equal(designEvidence(f).basis,'estimate');assert.equal(designEvidence(changed).dimensions,'user');assert.equal(designEvidence({...f,ordered:true}).dimensions,'estimate','a product reference does not establish all model dimensions');assert.equal(designEvidence({source:'site-photos',dimensionsInferred:true}).basis,'photo');
});
test('per-light choices survive both home/kitchen imports and change only the selected physical light output',()=>{
 const id=LIGHTING_LAYOUT.points.find(p=>p.roomId==='kitchen').id,lightControls={[id]:{enabled:true,brightness:35,kelvin:2700}},settings=normalizeHomeSettings({light:'night',lightControls});
 assert.deepEqual(normalizeKitchenDesign({...DEFAULTS,lightControls}).lightControls,settings.lightControls);assert.equal(normalizeLightControls({unknown:{enabled:true}}).unknown,undefined);
 const base=createHomeScene(normalizeHomeSettings({light:'evening'})),edited=createHomeScene(settings),disabled=createKitchen({...DEFAULTS,light:'evening',lightControls:{[id]:{enabled:false}}});
 try{for(const p of LIGHTING_LAYOUT.points){const a=base.gardenGroups.get(p.id).children.find(c=>c.userData.fixtureLight),b=edited.gardenGroups.get(p.id).children.find(c=>c.userData.fixtureLight);if(p.id===id){assert(Math.abs(b.intensity-18*35/75)<1e-8);assert.notEqual(a.color.getHexString(),b.color.getHexString());}else{assert.equal(a.intensity,b.intensity);assert.equal(a.color.getHexString(),b.color.getHexString());}}assert(!disabled.lightingGroups.get(id).children.some(c=>c.userData.fixtureLight));}finally{base.dispose();edited.dispose();disabled.dispose();}
 assert.equal(lightOutput({...settings,light:'day'},id).power,35/75);assert.equal(lightOutput({light:'day'},id).power,1);assert.equal(lightOutput({light:'night',lampsOn:false},id).power,0);
});
test('planning sheet is self-contained, reflects selected dimensions and service evidence and escapes text before printing',()=>{
 const home=normalizeHomeSettings({yardDesign:{fence:{h:1.8,color:'#abcdef'}}}),html=planningReport({home,kitchen:{...DEFAULTS,base:'<script>alert(1)</script>'},planSvg:'<svg aria-label="current plan"></svg>',date:new Date('2026-10-21T09:00:00Z')});
 assert(html.includes('<svg aria-label="current plan">'));assert(html.includes('window.print()'));assert(html.includes('@media print'));assert(html.includes('#abcdef'));assert(html.includes('180 cm'));assert(html.includes('electrical')===false);assert(html.includes('K01'));assert(html.includes('S-L01'));assert(html.includes('≈'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>alert'));assert(!html.includes('<link'));assert(!html.includes('src="http'));
});
