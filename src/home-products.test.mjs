import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FURNITURE,ROOMS,getFurniture,point,openingPoint,DOORS,PLOT,polygonBounds,normalizeHomeSettings,furnitureParts} from './home-model.mjs';
import {HOME_PRODUCTS,OUTDOOR_KITCHEN,productById,productsForRoom} from './home-products.mjs';
import {createHomeScene} from './home-scene.js';
const near=(a,b,epsilon=.001)=>assert(Math.abs(a-b)<epsilon,`${a} ≈ ${b}`);

test('cancelled furniture is removed and the two bedrooms have real 120 × 190 cm mattresses',()=>{
 assert(!ROOMS.some(r=>r.id==='dining'));assert(!FURNITURE.some(f=>f.id==='dining-table'||f.id==='garden-lounge'||f.id==='bed-c'));assert.equal(ROOMS.find(r=>r.id==='bedroom-c').kind,'office');assert(FURNITURE.some(f=>f.roomId==='bedroom-c'&&f.kind==='desk'));assert(FURNITURE.some(f=>f.roomId==='bedroom-c'&&f.kind==='office-chair'));
 const scene=createHomeScene(normalizeHomeSettings());scene.group.updateMatrixWorld(true);
 for(const id of ['bed-a','bed-b']){const g=scene.furnitureGroups.get(id);let mattress;g.traverse(o=>{if(o.userData.part==='mattress')mattress=o;});assert(mattress);const size=new THREE.Box3().setFromObject(mattress).getSize(new THREE.Vector3());near(size.x,1.2);near(size.z,1.9);}
 scene.dispose();
});

test('living sofa and TV face each other; master bed follows the requested half-turn with its television opposite',()=>{
 const sofa=getFurniture('living-sofa'),console=getFurniture('living-console'),bed=getFurniture('master-bed'),tv=getFurniture('master-tv');
 near(sofa.rotation,0);near(console.rotation,Math.PI);assert(sofa.position[1]<console.position[1]);near(bed.rotation,Math.PI);near(tv.rotation,0);assert(tv.position[0]+tv.w/2<2);assert(tv.position[1]<bed.position[1]);
 const scene=createHomeScene(normalizeHomeSettings());scene.group.updateMatrixWorld(true);
 const sofaBox=new THREE.Box3().setFromObject(scene.furnitureGroups.get(sofa.id)),bedBox=new THREE.Box3().setFromObject(scene.furnitureGroups.get(bed.id)),consoleBox=new THREE.Box3().setFromObject(scene.furnitureGroups.get(console.id));
 near(sofaBox.min.z,point(798,45.7)[1],.003);near(consoleBox.max.z,point(798,300.82)[1],.005);near(bedBox.max.z,point(680,921.58)[1]-.035,.002);assert(bedBox.min.x>=0,'bed and bedside tables stay inside the west wall');scene.dispose();
});

test('Harash products replace the defaults, and legacy saves migrate without losing individual openings',()=>{
 const s=normalizeHomeSettings({schema:1,rooms:{master:{floor:'oak',wood:'dark'}},openParts:['wardrobe-a:left','guest-basin:left']});
 assert.equal(s.schema,2);for(const id of ['living','kitchen','bedroom-a','bedroom-b','bedroom-c','master','safe-room','hall'])assert.equal(s.rooms[id].floor,'ordered-white');
 for(const id of ['bathroom','ensuite','powder']){assert.equal(s.rooms[id].floor,'ordered-wet');assert.equal(s.rooms[id].wall,'ordered-mona');}assert.equal(s.rooms.laundry.floor,'ordered-wet');assert.equal(s.rooms.terrace.floor,'ordered-terrace');assert.equal(s.rooms.master.wood,'dark');assert.deepEqual(s.openParts,['wardrobe-a:left']);
 assert.equal(getFurniture('bath-tub').w,1.6);assert.equal(getFurniture('bath-tub').d,.7);for(const id of ['bath-vanity','ensuite-vanity']){assert.equal(getFurniture(id).w,.82);assert(getFurniture(id).ordered);}
 assert.equal(getFurniture('guest-basin').kind,'wall-basin');assert.equal(furnitureParts(getFurniture('guest-basin')).length,0);assert.equal(FURNITURE.filter(f=>f.kind==='wall-toilet').length,3);assert(!getFurniture('bath-shower'));
 for(const f of FURNITURE)for(const p of f.products||[])assert(productById(p),`${f.id}: ${p}`);
 assert(productById('bath-vanity').ambiguous);assert(productsForRoom('kitchen').some(p=>p.sku==='VR001221'));assert.equal(productById('shower-head').dimensions[0],.2);assert(HOME_PRODUCTS.every(p=>p.source&&p.page>0));
});

test('Hercules has the documented module chain, faces the slider from the opposite fence and opens independently',()=>{
 near(OUTDOOR_KITCHEN.sinkWidth+OUTDOOR_KITCHEN.grillWidth+OUTDOOR_KITCHEN.fridgeWidth,3.1);const f=getFurniture('outdoor-kitchen'),slider=openingPoint(DOORS.find(d=>d.id==='patio')),bounds=polygonBounds(PLOT);near(f.position[1],slider[1],.001);near(f.position[0]-.35,bounds.minX+.07,.005);near(f.rotation,Math.PI/2);
 const closed=createHomeScene(normalizeHomeSettings()),g=closed.furnitureGroups.get(f.id);const widths=[];g.traverse(o=>{if(o.userData.moduleWidth)widths.push(o.userData.moduleWidth);});assert.deepEqual(widths,[.8,1.5,.8]);assert.equal(furnitureParts(f).length,9);
 for(const key of ['outdoor-kitchen:fridge','outdoor-kitchen:grill-lid']){const opened=createHomeScene(normalizeHomeSettings({openParts:[key]})),targets=new Map(closed.motions.map(m=>[m.id,m.target]));for(const m of opened.motions){if(m.id===key)assert.notEqual(m.target,targets.get(m.id));else assert.equal(m.target,targets.get(m.id));}opened.dispose();}
 closed.dispose();
});

test('actual room floors and tiled walls carry the scheduled metric sizes',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'}),floors=new Map();let wallTiles=0,mirrors=0;scene.group.traverse(o=>{if(o.userData.floorFinish)floors.set(o.userData.roomId,o.userData.tile);if(o.userData.wallTile){wallTiles++;assert.deepEqual(o.userData.wallTile,[.75,.25]);}if(o.userData.productId==='mirror')mirrors++;});
 assert.deepEqual(floors.get('master'),[1,1]);assert.deepEqual(floors.get('bathroom'),[.3,.3]);assert.deepEqual(floors.get('terrace'),[.15,.6]);assert(wallTiles>10);assert.equal(mirrors,2);scene.dispose();
});
