import test from 'node:test';
import assert from 'node:assert/strict';
import {measurementNote,furnitureMeasurements} from './home-measurements.mjs';
import {createHomeScene} from './home-scene.js';
import {FURNITURE,getFurniture,editableFurniture,furnitureBounds,normalizeHomeSettings,moveHomeFurniture,collisionBoxes,canStand} from './home-model.mjs';

test('bedroom/safe-room furniture moves persist through normalization and update actual meshes and walking obstacles',()=>{
 const initial=normalizeHomeSettings({openDoors:['safe'],openParts:['safe-storage:left']}),original=getFurniture('safe-storage'),result=moveHomeFurniture(initial,original.id,{dx:.6});assert(!result.error);
 const saved=normalizeHomeSettings(JSON.parse(JSON.stringify(result.settings))),item=getFurniture(original.id,saved);assert(item.position[0]>original.position[0]+.59);assert.deepEqual(saved.openDoors,initial.openDoors);assert.deepEqual(saved.openParts,initial.openParts);assert.deepEqual(getFurniture(original.id).position,original.position);
 const scene=createHomeScene(saved);try{const group=scene.furnitureGroups.get(item.id);assert(Math.abs(group.position.x-item.position[0])<.001);assert(Math.abs(group.position.z-item.position[1])<.001);}finally{scene.dispose();}
 const boxes=collisionBoxes(['safe','safe-inner'],true,[],[],saved.furnitureLayout);assert(!canStand(item.position,boxes));assert(canStand(original.position,boxes));
 const reset=moveHomeFurniture(saved,item.id,{reset:true}).settings;assert.deepEqual(getFurniture(item.id,reset),original);assert.deepEqual(reset.openParts,initial.openParts);
});

test('furniture editor restricts changes to requested rooms, keeps rotated footprints inside the room and rejects overlaps/doorways',()=>{
 const initial=normalizeHomeSettings();assert(FURNITURE.filter(editableFurniture).every(f=>['bed','desk','wardrobe','office-cabinet'].includes(f.kind)));assert(!editableFurniture(getFurniture('living-sofa')));
 assert.equal(moveHomeFurniture(initial,'living-sofa',{dx:.2}).error,'unsupported');
 let rotations=0,moves=0;
 for(const f of FURNITURE.filter(editableFurniture)){
  for(const command of [{dx:.1},{dx:-.1},{dz:.1},{dz:-.1},{rotate:true}]){const result=moveHomeFurniture(initial,f.id,command);if(!result.error){const item=getFurniture(f.id,result.settings),bounds=furnitureBounds(item);assert(bounds.minX<bounds.maxX);assert.deepEqual(normalizeHomeSettings(result.settings).furnitureLayout,result.settings.furnitureLayout);command.rotate?rotations++:moves++;}else assert(['outside','door','furniture'].includes(result.error));}
 }
 assert(moves>10);assert(rotations>0);
 const collision=moveHomeFurniture(initial,'safe-storage',{dx:1.2});assert.equal(collision.error,'furniture');assert.equal(collision.settings,initial);
 const invalid=normalizeHomeSettings({furnitureLayout:{'safe-bed':{position:[NaN,8],rotation:0},'living-sofa':{position:[1,1],rotation:0},'desk-a':{position:[1e10,1],rotation:0}}});assert.deepEqual(invalid.furnitureLayout,{});
});

test('custom furniture dimensions resize the actual body and obstacles, survive saves and movement, and reset independently',()=>{
 const initial=normalizeHomeSettings({openParts:['wardrobe-a:left']}),original=getFurniture('bed-a'),size={w:1.4,d:2,h:.55};
 const resized=moveHomeFurniture(initial,original.id,{dimensions:size});assert(!resized.error);
 let saved=normalizeHomeSettings(JSON.parse(JSON.stringify(resized.settings))),item=getFurniture(original.id,saved);
 assert.deepEqual([item.w,item.d,item.h],[size.w,size.d,size.h]);assert.equal(item.nightstands,false,'resizing does not invent bedside tables');assert(item.userDimensions);
 assert(furnitureMeasurements(item).every(m=>m.origin==='user'&&!m.approximate));assert(measurementNote(item,'en').includes('not verified'));
 const scene=createHomeScene(saved);try{const group=scene.furnitureGroups.get(item.id),mattress=group.children.find(o=>o.userData.part==='mattress');assert.equal(mattress.geometry.parameters.width,size.w);assert.equal(mattress.geometry.parameters.depth,size.d);assert.equal(group.scale.y,size.h/original.h);}finally{scene.dispose();}
 const obstacle=collisionBoxes([],true,[],[],saved.furnitureLayout).find(b=>b.furnitureId===item.id);assert(Math.abs(obstacle.maxX-obstacle.minX-size.w)<1e-6);
 const moved=moveHomeFurniture(saved,item.id,{dx:.1});assert(!moved.error);saved=moved.settings;assert.deepEqual(saved.furnitureLayout[item.id].dimensions,size);
 const position=getFurniture(item.id,saved).position,reset=moveHomeFurniture(saved,item.id,{resetDimensions:true});assert(!reset.error);assert.deepEqual(getFurniture(item.id,reset.settings).position,position);assert.equal(getFurniture(item.id,reset.settings).w,original.w);assert.deepEqual(reset.settings.openParts,initial.openParts);
 for(const dimensions of [{w:NaN,d:2,h:.5},{w:10,d:2,h:.5},{w:1.4,d:2,h:2}]){const result=moveHomeFurniture(initial,item.id,{dimensions});assert.equal(result.error,'size');assert.equal(result.settings,initial);}
 const bad=normalizeHomeSettings({furnitureLayout:{[original.id]:{position:original.position,rotation:0,dimensions:{w:1e9,d:2,h:.5}}}});assert.deepEqual(bad.furnitureLayout,{});
 assert.equal(getFurniture(original.id).w,1.2,'original supplied bed width is immutable');
});
