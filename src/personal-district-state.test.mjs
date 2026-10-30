import test from 'node:test';import assert from 'node:assert/strict';
import {readPersonalDistrictDesign,personalTourView,personalTourUrl,saveBeforeDistrictTour} from './personal-district-state.mjs';
import {HOME_STORAGE,KITCHEN_STORAGE} from './studio-state.mjs';
import {normalizeHomeSettings} from './home-model.mjs';
import {normalizeKitchenDesign} from './planning-pair.mjs';
class Store{constructor(){this.data=new Map();}getItem(k){return this.data.get(k)||null;}setItem(k,v){this.data.set(k,v);}}
test('opening the district preserves saved home, yard and kitchen choices and starts at noon',()=>{
 const storage=new Store(),home=normalizeHomeSettings({openDoors:['entry'],openParts:['garden-shed:door'],rooms:{living:{wall:'sage'}}}),kitchen=normalizeKitchenDesign({base:'cream'});saveBeforeDistrictTour(storage,home,kitchen);const before=storage.getItem(HOME_STORAGE),design=readPersonalDistrictDesign(storage);assert.deepEqual(design.home.openDoors,home.openDoors);assert.deepEqual(design.home.yardDesign,home.yardDesign);assert.deepEqual(design.home.furnitureLayout,home.furnitureLayout);assert.deepEqual(design.kitchen,normalizeKitchenDesign(kitchen));assert.equal(design.home.solar.minutes,720);assert.equal(design.home.solar.live,false);assert.equal(storage.getItem(HOME_STORAGE),before);assert(storage.getItem(KITCHEN_STORAGE));
});
test('editor tours route to the protected shared viewer with the selected apartment or floor',()=>{
 const apartment=personalTourUrl('unit:5:1');assert(apartment.startsWith('/_personal/district.html?'));const view=personalTourView(new URL(apartment,'https://example.test').search,{});assert.equal(view.mode,'walk');assert.equal(view.target,'unit:5:1');assert.equal(view.level,1);const floor=personalTourView('?tour=1&target=floor%3A3',{});assert.equal(floor.level,3);assert.equal(floor.target,'');const initial=personalTourView('',{});assert.equal(initial.mode,'building');assert.equal(initial.building,'4102');assert.equal(initial.level,9);
});
