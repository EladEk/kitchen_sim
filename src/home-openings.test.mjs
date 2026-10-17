import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DOORS,WINDOWS,SHUTTERS,WALLS,normalizeHomeSettings,openingPoint,getRoom,collisionBoxes,canStand,findWalkPath,doorsOnPath,movePlayer} from './home-model.mjs';
import {SHUTTER_IDS} from './home-building-spec.mjs';
import {createHomeScene} from './home-scene.js';
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} ≈ ${b}`);

test('changed door hinges sit at the drawn endpoint and leaves swing into the correct side',()=>{
 const scene=createHomeScene(normalizeHomeSettings({openDoors:DOORS.map(d=>d.id)}),{mode:'walk'});
 try{
  scene.group.updateMatrixWorld(true);
  for(const [id,hingeEnd,axis,direction] of [['bed-a','end','x',-1],['powder','start','z',-1],['bath','end','x',1],['utility','start','x',1],['safe','end','z',-1],['safe-inner','end','z',1]]){
   const door=DOORS.find(d=>d.id===id),motion=scene.motions.find(m=>m.id===`door:${id}`),pivot=new THREE.Vector3(),leaf=new THREE.Vector3(),center=openingPoint(door);
   motion.object.getWorldPosition(pivot);motion.object.children[0].getWorldPosition(leaf);
   near(door.vertical?pivot.z:pivot.x,hingeEnd==='end'?door.end:door.start);
   assert(direction*(leaf[axis]-center[axis==='x'?0:1])>.25,`${id} swings to the drawn side`);
  }
 }finally{scene.dispose();}
});

test('two independent safe-room leaves share one wall opening and both must open for walking',()=>{
 const p=openingPoint(DOORS.find(d=>d.id==='safe'));
 assert(!canStand(p,collisionBoxes(['safe'],false)),'inner wood leaf blocks when steel is open');
 assert(!canStand(p,collisionBoxes(['safe-inner'],false)),'outer steel leaf blocks when wood is open');
 assert(canStand(p,collisionBoxes(['safe','safe-inner'],false)));
 const route=doorsOnPath(findWalkPath(getRoom('living').walk,getRoom('safe-room').walk));assert(route.includes('safe'));assert(route.includes('safe-inner'));
 const closed=createHomeScene(normalizeHomeSettings({openDoors:[]})),woodOnly=createHomeScene(normalizeHomeSettings({openDoors:['safe-inner']}));
 try{
  const targets=new Map(closed.motions.map(m=>[m.id,m.target]));for(const m of woodOnly.motions){if(m.id==='door:safe-inner')assert.notEqual(m.target,targets.get(m.id));else assert.equal(m.target,targets.get(m.id));}
  closed.group.updateMatrixWorld(true);const spans=[];
  closed.group.traverse(o=>{if(o.userData.part==='architectural-wall'&&o.userData.wallId==='safe-north'){const b=new THREE.Box3().setFromObject(o);spans.push([...b.min.toArray(),...b.max.toArray()].map(x=>x.toFixed(4)).join(','));assert(!b.containsPoint(new THREE.Vector3(p[0],1,p[1])),'the construction hole is clear of wall geometry');}});
  assert.equal(new Set(spans).size,spans.length,'shared hole does not duplicate wall segments');
 }finally{closed.dispose();woodOnly.dispose();}
});

test('six specified shutters are individually clickable and lowering one leaves every other part alone',()=>{
 assert.equal(SHUTTERS.length,6);assert(!SHUTTER_IDS.includes('safe-window'));assert(!SHUTTER_IDS.includes('utility-window'));
 const raised=createHomeScene(normalizeHomeSettings({cutaway:false})),lowered=createHomeScene(normalizeHomeSettings({cutaway:false,closedShutters:['bed-a-window']}));
 try{
  assert.equal(raised.shutterGroups.size,6);for(const id of SHUTTER_IDS)assert(raised.picks.some(o=>o.userData.action==='shutter'&&o.userData.shutterId===id));
  const targets=new Map(raised.motions.map(m=>[m.id,m.target]));for(const m of lowered.motions){if(m.id==='shutter:bed-a-window')assert.notEqual(m.target,targets.get(m.id));else assert.equal(m.target,targets.get(m.id));}
  for(const [scene,height] of [[raised,.01875],[lowered,1.25]]){scene.group.updateMatrixWorld(true);const curtain=scene.motions.find(m=>m.id==='shutter:bed-a-window').object,size=new THREE.Box3().setFromObject(curtain).getSize(new THREE.Vector3());near(size.y,height);}
 }finally{raised.dispose();lowered.dispose();}
});

test('closed terrace shutter blocks an open slider; a guided garden route raises only its necessary shutter',()=>{
 const patio=DOORS.find(d=>d.id==='patio'),wall=WALLS.find(w=>w.id===patio.wallId),p=[wall.a[0],patio.start+patio.width*.25];
 assert(canStand(p,collisionBoxes(['patio'],false,[])));assert(!canStand(p,collisionBoxes(['patio'],false,['patio'])));
 const start=getRoom('living').walk,end=getRoom('terrace').walk,path=findWalkPath(start,end),ids=doorsOnPath(path),remaining=SHUTTER_IDS.filter(id=>!ids.includes(id));assert(ids.includes('patio'));assert(remaining.includes('bed-a-window'));
 const boxes=collisionBoxes(ids,true,remaining);let position=[...start];
 for(const target of path){let steps=0;while(Math.hypot(position[0]-target[0],position[1]-target[1])>.045&&steps++<100){const delta=[target[0]-position[0],target[1]-position[1]],length=Math.hypot(...delta),step=Math.min(.03,length);position=movePlayer(position,delta.map(n=>n/length*step),boxes);}assert(steps<100);}
 assert(Math.hypot(position[0]-end[0],position[1]-end[1])<.05);
});

test('double glazing is modeled at living/bedroom/kitchen openings, while wet and protected windows remain single',()=>{
 const scene=createHomeScene(normalizeHomeSettings({cutaway:false})),panes=new Map();
 try{
  scene.group.traverse(o=>{if(o.userData.glazing){const id=o.userData.openingId;panes.set(id,[...(panes.get(id)||[]),o.userData.glazing]);}});
  for(const id of ['bed-a-window','bed-b-window','master-window','bed-c-window','kitchen-window'])assert.deepEqual(panes.get(id),['double','double','double','double']);
  assert.deepEqual(panes.get('patio'),['double','double','double','double']);
  for(const id of ['ensuite-window','utility-window','safe-window'])assert.deepEqual(panes.get(id),['single']);
 }finally{scene.dispose();}
 const settings=normalizeHomeSettings({closedShutters:['bed-a-window','bad','bed-a-window'],openDoors:['safe-inner'],openParts:['wardrobe-b:left']});
 assert.deepEqual(settings.closedShutters,['bed-a-window']);assert.deepEqual(settings.openDoors,['safe-inner']);assert.deepEqual(settings.openParts,['wardrobe-b:left']);
});
