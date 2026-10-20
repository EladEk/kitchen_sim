import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OBB} from 'three/addons/math/OBB.js';
import {FURNITURE,WALLS,DOORS,WINDOWS,getRoom,getFurniture,furnitureParts,insidePolygon,polygonBounds,normalizeHomeSettings,findWalkPath,doorsOnPath,collisionBoxes,canStand,movePlayer} from './home-model.mjs';
import {createHomeScene} from './home-scene.js';

const bedrooms=[{suffix:'a',roomId:'bedroom-a',wallId:'bed-a-east-upper'},{suffix:'b',roomId:'bedroom-b',wallId:'bed-b-east'}];
function meshBoxes(group){
 const boxes=[];group.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();boxes.push(new OBB().fromBox3(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));}});return boxes;
}

test('safe-room wardrobe side meets the bed wall, with its doors and drawers clear of the bed and protected window',()=>{
 const wardrobe=getFurniture('safe-storage'),wall=WALLS.find(w=>w.id==='safe-south'),wallFace=wall.a[1]-wall.thickness/2,window=WINDOWS.find(w=>w.id==='safe-window'),parts=furnitureParts(wardrobe).map(p=>p.id);
 for(const openParts of [[],...parts.map(id=>[id]),parts]){
  const scene=createHomeScene(normalizeHomeSettings({openParts}),{mode:'walk'});
  try{
   scene.group.updateMatrixWorld(true);
   const group=scene.furnitureGroups.get(wardrobe.id),bounds=new THREE.Box3().setFromObject(group),front=new THREE.Vector3(0,0,1).transformDirection(group.matrixWorld);
   assert(front.x>.99,'wardrobe keeps facing into the room from the west wall');
   const gap=wallFace-bounds.max.z;assert(gap>.005&&gap<.025,'side reaches the bed wall with only skirting/hinge clearance');
   assert(bounds.max.x<window.start,'the protected window is unobstructed');
   for(const f of FURNITURE.filter(f=>f.roomId==='safe-room'&&f.id!==wardrobe.id))assert(!bounds.intersectsBox(new THREE.Box3().setFromObject(scene.furnitureGroups.get(f.id))),`wardrobe clears ${f.id} with ${openParts.join(',')||'closed fronts'}`);
   for(const id of ['safe','safe-inner']){
    const motion=scene.motions.find(m=>m.id===`door:${id}`);
    for(let step=0;step<=48;step++){
     motion.object.rotation.y=motion.openTarget*step/48;scene.group.updateMatrixWorld(true);
     const leaf=new THREE.Box3().setFromObject(motion.object);assert(bounds.min.z-leaf.max.z>.9,`${id}: wardrobe stays well beyond the entire door swing`);
    }
   }
  }finally{scene.dispose();}
 }
});

test('moving the safe-room wardrobe frees the entrance landing and keeps the walking route usable',()=>{
 const room=getRoom('safe-room'),wardrobe=getFurniture('safe-storage'),path=findWalkPath(getRoom('living').walk,room.walk);assert(path?.length);
 const boxes=collisionBoxes(doorsOnPath(path)),door=DOORS.find(d=>d.id==='safe'),wall=WALLS.find(w=>w.id===door.wallId),landing=[wardrobe.position[0],wall.a[1]+1.2];
 assert(canStand(landing,boxes),'the old wardrobe position is a clear entrance landing');
 assert(!canStand(wardrobe.position,boxes),'walking collision bounds follow the moved wardrobe');
 let position=[...getRoom('living').walk];
 for(const target of path){
  let steps=0;
  while(Math.hypot(position[0]-target[0],position[1]-target[1])>.045&&steps++<100){const delta=[target[0]-position[0],target[1]-position[1]],length=Math.hypot(...delta),step=Math.min(.03,length);position=movePlayer(position,delta.map(n=>n/length*step),boxes);}
  assert(steps<100,'the actual walking route does not get stuck');
 }
 assert(Math.hypot(position[0]-room.walk[0],position[1]-room.walk[1])<.05);
});

test('both 120 × 190 cm beds tuck against two walls with skirting clearance; the office stays an office',()=>{
 const scene=createHomeScene(normalizeHomeSettings());
 try{
  scene.group.updateMatrixWorld(true);
  for(const {suffix,roomId} of bedrooms){
   const bed=getFurniture(`bed-${suffix}`),bounds=new THREE.Box3().setFromObject(scene.furnitureGroups.get(bed.id)),room=polygonBounds(getRoom(roomId).polygon);
   assert.equal(bed.w,1.2);assert.equal(bed.d,1.9);
   for(const gap of [bounds.min.x-room.minX,bounds.min.z-room.minZ])assert(gap>=.015&&gap<.03,'frame/headboard are next to the two corner walls, clear of skirting');
   for(const f of FURNITURE.filter(f=>f.roomId===roomId&&f.id!==bed.id))assert(!bounds.intersectsBox(new THREE.Box3().setFromObject(scene.furnitureGroups.get(f.id))),`${bed.id} clears ${f.id}`);
  }
  assert.equal(getRoom('bedroom-c').kind,'office');assert(!FURNITURE.some(f=>f.roomId==='bedroom-c'&&f.kind==='bed'));
 }finally{scene.dispose();}
});

test('bedroom wardrobes follow the entrance wall, face inward and fit with each part open',()=>{
 for(const opened of [false,true]){
  const openParts=opened?bedrooms.flatMap(({suffix})=>furnitureParts(getFurniture(`wardrobe-${suffix}`)).map(p=>p.id)):[];
  const scene=createHomeScene(normalizeHomeSettings({openParts}),{mode:'walk'});
  try{
   scene.group.updateMatrixWorld(true);
   for(const {suffix,roomId,wallId} of bedrooms){
    const f=getFurniture(`wardrobe-${suffix}`),g=scene.furnitureGroups.get(f.id),bounds=new THREE.Box3().setFromObject(g),room=getRoom(roomId),door=DOORS.find(d=>d.id===`bed-${suffix}`),wall=WALLS.find(w=>w.id===wallId);
    const front=new THREE.Vector3(0,0,1).transformDirection(g.matrixWorld);assert(front.x<-.99,'wardrobe fronts face west into the room');
    const backGap=wall.a[0]-wall.thickness/2-bounds.max.x;assert(backGap>=0&&backGap<.025,'wardrobe back follows the east entrance wall');
    const doorGap=suffix==='a'?door.start-bounds.max.z:bounds.min.z-door.end;assert(doorGap>.05&&doorGap<.2,'wardrobe sits beside, and outside, the doorway');
    for(const x of [bounds.min.x,bounds.max.x])for(const z of [bounds.min.z,bounds.max.z])assert(insidePolygon([x,z],room.polygon),`${f.id} stays inside the room, including opened fronts`);
    for(const other of FURNITURE.filter(o=>o.roomId===roomId&&o.id!==f.id))assert(!bounds.intersectsBox(new THREE.Box3().setFromObject(scene.furnitureGroups.get(other.id))),`${f.id} clears ${other.id}`);
   }
  }finally{scene.dispose();}
 }
});

test('both bedroom entrance doors sweep clear of furniture after the room 2 desk swap',()=>{
 const desk=getFurniture('desk-b'),wardrobe=getFurniture('wardrobe-b');assert(desk.position[1]<wardrobe.position[1],'computer desk occupies the former north-wall wardrobe area');
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);
  for(const {suffix,roomId} of bedrooms){
   const furniture=FURNITURE.filter(f=>f.roomId===roomId).map(f=>({id:f.id,boxes:meshBoxes(scene.furnitureGroups.get(f.id))}));
   const motion=scene.motions.find(m=>m.id===`door:bed-${suffix}`),pivot=motion.object;
   // Oriented boxes avoid false collisions from a diagonal leaf's empty corners.
   for(let step=0;step<=96;step++){
    pivot.rotation.y=motion.openTarget*step/96;scene.group.updateMatrixWorld(true);
    for(const leaf of meshBoxes(pivot))for(const item of furniture)assert(!item.boxes.some(box=>leaf.intersectsOBB(box)),`door ${suffix} clears ${item.id} throughout its swing`);
   }
  }
 }finally{scene.dispose();}
});
