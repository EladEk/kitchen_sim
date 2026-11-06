import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {SERVICE_ACCESS as A,SERVICE_DOOR_IDS,serviceTreads,serviceFloorHeight} from './service-access.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {publicDoorCatalog} from '../public-view/district-doors.mjs';

test('the registered PDF nosings and both source doorways have one coherent lower floor',()=>{
 const t=serviceTreads();
 assert.equal(A.steps,6);assert.equal(t.length,5);
 // Independent registered controls from PDF paths 38022–38026, not a ramp.
 for(const z of [-6.12,-6.39,-6.66,-6.93,-7.20])assert([...t.map(v=>v.topZ),A.bottomZ].some(v=>Math.abs(v-z)<.002));
 assert.equal(serviceFloorHeight([19.1,-5.7]),null);
 for(const z of [-7.3,-7.75,-8.4,-8.8])assert.equal(serviceFloorHeight([19.1,z]),-1.05,'flat in front of both portals');
 for(const p of [[17.4,-6.25],[21,-7]])assert.equal(serviceFloorHeight(p),-1.05);
});

test('actual service walls continue below ground; both door leaves, handles and lintels register to that floor',()=>{
 const group=new T.Group(),resources=[],settings=normalizeHomeSettings({cutaway:false,buildingLevel:0,closedBuildingDoors:SERVICE_DOOR_IDS});
 buildBuildingContext({group,resources,settings,mode:'walk',interactiveDoors:true});group.updateMatrixWorld(true);
 try{
  const catalog=publicDoorCatalog(group),ray=new T.Raycaster(),down=new T.Vector3(0,-1,0),all=[];
  group.traverse(o=>{if(o.isMesh)all.push(o);});
  for(const id of SERVICE_DOOR_IDS){const pivot=catalog.get(id);assert(pivot,id);assert.equal(pivot.position.y,-1.05);assert.equal(pivot.userData.tourDoor.kind,'service');assert.equal(pivot.userData.tourDoor.defaultOpen,false);}
  for(const [x,z] of [[19.1,-5.95],[19.1,-6.5],[19.1,-7.0],[19.1,-7.55],[19.1,-8.1],[17.4,-6.25],[21,-7]]){
   ray.set(new T.Vector3(x,.3,z),down);ray.far=1.6;
   const hit=ray.intersectObjects(all,false).find(h=>Math.abs(h.face?.normal.y)>.65);
   assert(hit,'solid floor '+[x,z]);assert(Math.abs(hit.point.y-(serviceFloorHeight([x,z])??0))<.04,'source floor height agrees with mesh '+[x,z]);
  }
  for(const [x,z,dx,dz] of [[18.05,-6.4,1,0],[20.20,-8.65,-1,0]]){
   ray.set(new T.Vector3(x,-.6,z),new T.Vector3(dx,0,dz));ray.far=.65;
   assert(ray.intersectObjects(all,false).some(h=>h.object.name==='service-lower-wall'),'no missing lower wall beside a door');
  }
  for(const name of ['service-landing-cover','service-landing-controller','service-landing-round-light','meter-room-raised-floor-base','meter-room-floor-panel'])assert(group.getObjectByName(name),name);
 }finally{for(const r of resources)r.dispose?.();}
});
