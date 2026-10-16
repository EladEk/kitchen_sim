import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOM,LONG,SHORT,UPPERS,ISLAND,ISLAND_UNITS,clearance,getModule} from './model.mjs';
test('both wall module chains close at the drawing dimensions',()=>{assert.equal(LONG.reduce((n,m)=>n+m.w,0),5450);assert.equal(SHORT.reduce((n,m)=>n+m.w,0),3300);assert.equal(LONG.at(-1).x+LONG.at(-1).w,ROOM.long);assert.equal(SHORT.at(-1).z,0)});
test('upper cabinets begin after the window and meet the oven tower',()=>{assert.equal(UPPERS[0].x,1090);assert.equal(UPPERS.at(-1).x+UPPERS.at(-1).w,getModule('oven').x);});
test('island carcass, overhang and circulation stay consistent',()=>{assert.equal(ISLAND_UNITS.reduce((n,m)=>n+m.w,0),2400);assert.equal(ISLAND.width-ISLAND.baseWidth,40);assert.equal(clearance().workAisle,980);assert.ok(ISLAND.x+ISLAND.width<ROOM.long);assert.ok(ISLAND.z+ISLAND.depth<ROOM.short);});

test('technical order refines contents while conflicting upper width stays on the drawing', async()=>{
 const {ORDER,getSpecification,SPEC_CONFLICTS}=await import('./specifications.mjs');
 assert.equal(ORDER.laminate,'ZA01SM');assert.equal(ORDER.plinthHeight,120);assert.equal(getModule('island-0').baskets,3);assert.equal(getModule('storage-57').internalDrawers,2);
 assert.equal(getModule('upper-1').w,1000);assert.equal(getSpecification('upper-1').status,'conflict');assert.equal(SPEC_CONFLICTS.length,5);
});
