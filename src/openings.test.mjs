import test from 'node:test';
import assert from 'node:assert/strict';
import {OPENINGS,OPENING_IDS,getOpenings,changeOpening,normalizeOpenParts} from './openings.mjs';
test('each moving element has a distinct stable identifier',()=>{assert.equal(new Set(OPENING_IDS).size,OPENINGS.length);assert.equal(getOpenings('drawers-90').length,3);assert.equal(getOpenings('sink').length,2);assert.equal(getOpenings('pantry').length,2);});
test('a drawer toggle preserves the state of every other drawer',()=>{let state=['drawers-90:drawer-2'];state=changeOpening(state,'drawers-90:drawer-0').openParts;assert.deepEqual(state,['drawers-90:drawer-2','drawers-90:drawer-0']);state=changeOpening(state,'drawers-90:drawer-0').openParts;assert.deepEqual(state,['drawers-90:drawer-2']);});
test('internal drawer opens only its access door, not the other drawer',()=>{const r=changeOpening([],'storage-57:internal-0');assert.deepEqual(r.openParts,['storage-57:door','storage-57:internal-0']);assert.equal(r.blockedBy,null);const blocked=changeOpening(r.openParts,'storage-57:door');assert.equal(blocked.blockedBy,'storage-57:internal-0');assert.deepEqual(blocked.openParts,r.openParts);});
test('one island basket leaves the other two baskets closed',()=>{const r=changeOpening([],'island-0:basket-1');assert.deepEqual(r.openParts,['island-0:door','island-0:basket-1']);});
test('imported part states are deduplicated and unknown keys are discarded',()=>{assert.deepEqual(normalizeOpenParts(['sink:door-left','unknown','sink:door-left']),['sink:door-left']);});
