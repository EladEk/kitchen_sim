import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings,HOME_FINISHES,ROOMS,ALL_HOME_PARTS} from './home-model.mjs';
import {INTERIOR_WHITE,WALL_PAINT_VERSION} from './interior-finish.mjs';
import {createMotionCopy} from '../public-view/model-motions.mjs';
import {batchPersonalTour} from './personal-tour-batching.mjs';

test('dry interior walls start white, migrate the legacy ivory default once, and preserve subsequent chosen colours',()=>{
 const settings=normalizeHomeSettings({schema:2,rooms:{kitchen:{wall:'ivory'},living:{wall:'sage'}}});
 assert.equal(settings.rooms.kitchen.wall,'white');assert.equal(settings.rooms.master.wall,'white');assert.equal(settings.rooms.living.wall,'sage');assert.equal(settings.rooms.bathroom.wall,'ordered-mona');
 assert.equal(HOME_FINISHES.find(f=>f.id==='white').color,INTERIOR_WHITE);
 assert.equal(normalizeHomeSettings({...settings,wallPaintVersion:WALL_PAINT_VERSION,rooms:{...settings.rooms,kitchen:{wall:'ivory'}}}).rooms.kitchen.wall,'ivory');
});
test('neighbouring ground-storey veneers never protrude into the kitchen or living room',()=>{
 const home=createHomeScene(normalizeHomeSettings(),{mode:'walk',context:true,daylight:false});
 try{
  home.group.updateMatrixWorld(true);const walls=[];home.group.traverse(o=>{if(o.isMesh&&[o.material].flat().some(m=>['plaster','limestone'].includes(m.userData.surfaceKind)))walls.push(o);});
  for(const room of ROOMS.filter(r=>['kitchen','living'].includes(r.id)))for(const z of [2.6,3.1,3.8,4.5,5.2]){
   const origin=new THREE.Vector3(room.walk[0],1.7,z),hit=new THREE.Raycaster(origin,new THREE.Vector3(1,0,0),0,7).intersectObjects(walls,false)[0];assert(hit);assert.equal([hit.object.material].flat()[hit.face.materialIndex].userData.surfaceKind,'plaster',room.id+':'+z);
  }
 }finally{home.dispose();}
});
test('every cabinet leaf and drawer uses the same opening pose in the editable scene and the batched walking display',()=>{
 const settings=normalizeHomeSettings({cutaway:false,openParts:[],openDoors:[]}),closed=createHomeScene(settings,{mode:'walk',context:false,daylight:false}),opened=createHomeScene({...settings,openParts:ALL_HOME_PARTS.map(p=>p.id)},{mode:'walk',context:false,daylight:false});
 try{
  const parts=closed.motions.filter(m=>ALL_HOME_PARTS.some(p=>p.id===m.id));assert(parts.length>30);
  for(const m of parts){const reference=opened.motions.find(o=>o.id===m.id);assert(reference,m.id);assert.equal(m.openTarget,reference.target,m.id+' must use its hinge direction and full travel');m.object.userData.tourMotionId=m.id;}
  batchPersonalTour(closed);closed.group.updateMatrixWorld(true);
  for(const m of parts){const copy=createMotionCopy(m.object,closed.group),count=()=>{let n=0;copy.group.traverseVisible(o=>{if(o.isMesh)n++;});return n;},before=count();assert(before>0,m.id);m.object[m.axis][m.property]=m.openTarget;copy.sync();assert.equal(count(),before,m.id+' remains visible');assert(Math.abs(copy.group.children[0][m.axis][m.property]-m.openTarget)<1e-10);copy.dispose();}
 }finally{closed.dispose();opened.dispose();}
});
