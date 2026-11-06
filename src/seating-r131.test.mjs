import test from 'node:test';
import assert from 'node:assert/strict';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {groundInverse,groundFurnitureBoxes} from './ground-apartments.mjs';
import {seatingRoom} from '../scripts/revise-seating-r131.mjs';
import {groundLivingContext} from '../scripts/revise-living-r102.mjs';
const kinds=new Set(['sofa','coffee','media']);
// Apartment 23 uses the owner's L-shaped seating instead of the generic
// straight sofa/TV axis; its wall/door and approach checks are in R138 tests.
test('every upper sofa has an opposing TV console, real wall support and connected door/window approaches',()=>{
 const sofas=APARTMENT_FURNITURE.filter(r=>r.kind==='sofa'&&!(r.floor===4&&r.unit===23));assert.equal(sofas.length,38);
 for(const sofa of sofas){const set=APARTMENT_FURNITURE.filter(r=>r.floor===sofa.floor&&r.unit===sofa.unit&&kinds.has(r.kind)),media=set.find(r=>r.kind==='media'),fixed=APARTMENT_FURNITURE.filter(r=>r.floor===sofa.floor&&r.unit===sofa.unit&&!kinds.has(r.kind)).map(r=>r.box),room=seatingRoom(sofa);assert(media,sofa.id);assert(sofa.wallBacked&&sofa.backGap<.065,sofa.id);assert.equal(media.support,'floor-console');if(media.wallBacked)assert(media.backGap<.2,media.id);const dx=media.x-sofa.x,dz=media.z-sofa.z;assert(dx*Math.sin(sofa.angle)+dz*Math.cos(sofa.angle)>1.8);assert(Math.abs(dx*Math.cos(sofa.angle)-dz*Math.sin(sofa.angle))<.002);assert(Math.cos(sofa.angle-media.angle)<-.99);for(const r of set)assert(room.valid(r.box,fixed),r.id);assert(room.routesClear([...fixed,...set.map(r=>r.box)]),sofa.id);}
});
test('all ground seating copies retain wall gaps and facing TV pairs after reflection',()=>{
 const room=groundLivingContext();for(const unit of [1,2,3]){const set=GROUND_APARTMENT_FURNITURE.filter(r=>r.unit===unit&&kinds.has(r.kind));assert.equal(set.length,3);for(const r of set.filter(r=>r.kind==='sofa'))assert(r.wallBacked&&r.backGap<.065);assert.equal(set.find(r=>r.kind==='media').support,'floor-console');const boxes=set.map(r=>{const p=[[r.box.minX,r.box.minZ],[r.box.maxX,r.box.maxZ]].map(p=>groundInverse(unit,p));return {minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))};});assert(room.routesClear([...groundFurnitureBoxes(4),...boxes]));}
});
