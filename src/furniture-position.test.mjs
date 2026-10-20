import test from 'node:test';
import assert from 'node:assert/strict';
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
