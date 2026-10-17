import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FURNITURE,GARDEN_PLANTS,getFurniture,getRoom,normalizeHomeSettings,findWalkPath,collisionBoxes,canStand,DOORS,WINDOWS} from './home-model.mjs';
import {furnitureMeasurements} from './home-measurements.mjs';
import {createHomeScene} from './home-scene.js';

test('every selectable room item has positive centimetre dimensions in its own axes',()=>{
 for(const f of FURNITURE){const rows=furnitureMeasurements(f);assert.equal(rows.length,3);for(const r of rows)assert(Number.isFinite(r.cm)&&r.cm>0,`${f.id} ${r.key}`);}
 const desk=getFurniture('desk-c');assert.equal(desk.rotation,-Math.PI/2);const sizes=Object.fromEntries(furnitureMeasurements(desk).map(r=>[r.key,r.cm]));assert.equal(sizes.width,140);assert.equal(sizes.depth,65);
});

test('assumed dimensions are never presented as documented measurements',()=>{
 const rows=id=>Object.fromEntries(furnitureMeasurements(getFurniture(id)).map(r=>[r.key,r]));
 assert.equal(rows('bed-a').width.origin,'user');assert.equal(rows('bed-b').depth.approximate,false);assert.equal(rows('bed-a').height.approximate,true);
 assert.equal(rows('bath-vanity').width.origin,'document');assert.equal(rows('bath-vanity').depth.approximate,true);assert.equal(rows('bath-tub').depth.origin,'document');
 assert.equal(rows('outdoor-kitchen').width.approximate,false);assert.equal(rows('outdoor-kitchen').depth.approximate,true);assert.equal(rows('outdoor-kitchen').height.approximate,true);
 assert.equal(rows('safe-bed').width.cm,140);assert.equal(rows('safe-bed').depth.cm,190);assert.equal(rows('safe-bed').width.approximate,true);
});

test('safe-room double bed fits below the window and leaves a usable indoor route',()=>{
 assert(!FURNITURE.some(f=>f.roomId==='safe-room'&&f.kind==='sofa'));
 const room=getRoom('safe-room'),path=findWalkPath(getRoom('living').walk,room.walk);assert(path?.length);assert(canStand(room.walk,collisionBoxes(DOORS.map(d=>d.id))));
 const scene=createHomeScene(normalizeHomeSettings());scene.group.updateMatrixWorld(true);const bed=scene.furnitureGroups.get('safe-bed');let mattress;bed.traverse(o=>{if(o.userData.part==='mattress')mattress=o;});
 const size=new THREE.Box3().setFromObject(mattress).getSize(new THREE.Vector3());assert(Math.abs(size.x-1.4)<.001);assert(Math.abs(size.z-1.9)<.001);const bounds=new THREE.Box3().setFromObject(bed);assert(bounds.max.y<WINDOWS.find(w=>w.id==='safe-window').sill);scene.dispose();
});

test('only the outdoor-kitchen-side tree is removed and every furniture mesh supports item inspection',()=>{
 const kitchen=getFurniture('outdoor-kitchen');assert.equal(GARDEN_PLANTS.length,4);assert(GARDEN_PLANTS.every(p=>Math.abs(p.position[1]-kitchen.position[1])>2));
 const scene=createHomeScene(normalizeHomeSettings()),picks=new Set(scene.picks);let plants=0;
 scene.group.traverse(o=>{if(o.userData.plantId)plants++;});assert.equal(plants,4);
 for(const [id,g] of scene.furnitureGroups)g.traverse(o=>{if(o.isMesh){assert(picks.has(o),`${id} visible mesh has a selection target`);assert.equal(o.userData.furnitureId,id);}});scene.dispose();
});
