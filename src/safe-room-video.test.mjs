import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {existsSync} from 'node:fs';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings,DOORS,WALLS,HOUSE,WINDOWS} from './home-model.mjs';
import {SAFE_ROOM_VIDEO_SOURCE} from './safe-room-reference.mjs';
import {HOUSE_SOURCES} from './home-products.mjs';

test('video vents sit inside the door wall above the opening, independently of furniture',()=>{
 const scene=createHomeScene(normalizeHomeSettings({furniture:false,cutaway:false}),{mode:'walk',context:false,daylight:false});
 try{
  scene.group.updateMatrixWorld(true);
  const vents=scene.buildingGroups.get('safe-door-vents');assert(vents);
  const b=new THREE.Box3().setFromObject(vents),door=DOORS.find(d=>d.id==='safe'),wall=WALLS.find(w=>w.id===door.wallId);
  assert(b.min.z>wall.a[1]+wall.thickness/2,'fittings are inside the north wall');
  assert(b.min.y>door.height);assert(b.max.y<HOUSE.height);
  assert.equal(vents.userData.source,SAFE_ROOM_VIDEO_SOURCE.id);
  assert(scene.picks.some(m=>m.userData.buildingId==='safe-door-vents'));
  assert.equal(vents.children.filter(m=>m.userData.part==='safe-vent-bolt').length,6);
  assert.equal(vents.children.filter(m=>m.userData.part==='safe-vent-grille-slat').length,11);
 }finally{scene.dispose();}
 const cut=createHomeScene(normalizeHomeSettings({cutaway:true}),{context:false,daylight:false});
 try{assert(!cut.buildingGroups.has('safe-door-vents'));}finally{cut.dispose();}
});

test('protected window has two distinct tracks and the safe-room door leaves keep their documented operations',()=>{
 const scene=createHomeScene(normalizeHomeSettings({cutaway:false}),{context:false,daylight:false});
 try{
  let frame;scene.group.traverse(o=>{if(o.userData.windowId==='safe-window')frame=o;});
  const sashes=frame.children.filter(o=>o.userData.part==='window-sash');assert.equal(sashes.length,2);
  assert.notEqual(sashes[0].position.z,sashes[1].position.z);
  assert.equal(WINDOWS.find(w=>w.id==='safe-window').operation,'protected');
  for(const id of ['safe','safe-inner']){
   const door=scene.doorGroups.get(id);assert(door);
   const border=door.children.find(o=>o.userData.part==='door-frame');
   assert.equal(border.material.color.getHexString(),'f2f1ec');
  }
 }finally{scene.dispose();}
});

test('safe-room video and reference stills are available through the protected house source viewer',()=>{
 assert(HOUSE_SOURCES.some(s=>s.id===SAFE_ROOM_VIDEO_SOURCE.id));
 for(const path of [SAFE_ROOM_VIDEO_SOURCE.video,SAFE_ROOM_VIDEO_SOURCE.poster,...SAFE_ROOM_VIDEO_SOURCE.references.map(r=>r.image)]){
  assert(path.startsWith('/house/'));
  assert(existsSync(new URL('../public'+path,import.meta.url)),path);
 }
});
