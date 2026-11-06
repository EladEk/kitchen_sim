import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {polygonContains} from './building-geometry.mjs';
import {groundInverse,groundFurnitureBoxes} from './ground-apartments.mjs';
import {registeredLivingGuides,upperLivingContext,groundLivingContext} from '../scripts/revise-living-r102.mjs';

const inLivingZone=(p,polygon)=>p[0]>=Math.min(...polygon.map(v=>v[0]))-.36&&p[0]<=Math.max(...polygon.map(v=>v[0]))+.36&&p[1]>=Math.min(...polygon.map(v=>v[1]))-.36&&p[1]<=Math.max(...polygon.map(v=>v[1]))+.36;
const living=new Set(['sofa','coffee','media']),corners=b=>[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]];
test('the 16 corrected upper lounges stay in source-registered living areas and leave doors, glazing and approaches free',()=>{
 const guides=registeredLivingGuides();assert.equal(guides.length,16);
 for(const g of guides){const room=upperLivingContext(g),all=APARTMENT_FURNITURE.filter(r=>r.floor===g.floor&&r.unit===g.unit),set=all.filter(r=>living.has(r.kind)),fixed=all.filter(r=>!living.has(r.kind)).map(r=>r.box);assert.equal(set.length,g.unit===23&&g.floor===4?4:3);
  for(const r of set){assert(corners(r.box).every(p=>inLivingZone(p,g.polygon)),r.id+' is in the living zone rather than dining or kitchen');assert(room.valid(r.box,fixed),r.id+' clears walls, door sweeps and glazing');}
  assert(room.routesClear([...fixed,...set.map(r=>r.box)]),`unit ${g.unit} keeps connected approaches`);
 }
});
test('all three standard ground lounges share the corrected seating zone after reflection, with the kitchen kept clear',()=>{
 const config=JSON.parse(readFileSync(new URL('../scripts/living-room-zones-r102.json',import.meta.url))),room=groundLivingContext();
 for(const unit of [1,2,3]){const set=GROUND_APARTMENT_FURNITURE.filter(r=>r.unit===unit&&living.has(r.kind));assert.equal(set.length,3);for(const r of set){const [x,z]=groundInverse(unit,[r.x,r.z]);assert(polygonContains([x,z],config.ground.polygon));assert(r.layoutRevision>=102);}const standard=set.map(r=>{const points=corners(r.box).map(p=>groundInverse(unit,p));return {minX:Math.min(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxX:Math.max(...points.map(p=>p[0])),maxZ:Math.max(...points.map(p=>p[1]))};});assert(room.routesClear([...groundFurnitureBoxes(4),...standard]));}
 assert(!GROUND_APARTMENT_FURNITURE.some(r=>r.unit===4),'saved owner furnishings stay independent');
});
