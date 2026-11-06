import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {createDistrictDoorController,publicDoorCatalog} from '../public-view/district-doors.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {destinationStandingPose,safeTourDestination} from '../public-view/tour-tools.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';
const load=async n=>JSON.parse(await readFile('dist/client/baseline/'+n+'.json','utf8'));

test('actual exported service doors block and open at the lower floor; both rooms and the return stair work in all eight buildings',async()=>{
 const [json,site,nav]=await Promise.all(['building','site','navigation'].map(load)),model=await new THREE.ObjectLoader().parseAsync(json),catalog=publicDoorCatalog(model),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 const doors=createDistrictDoorController({model,onChange:({building,source})=>world.refreshDoors(building,source)});
 try{
  for(const id of ['bd-0-4','bd-0-5']){const pivot=catalog.get(id);assert(pivot,id+' survives the production allowlist');assert.equal(pivot.userData.tourDoor.defaultOpen,false);assert.equal(pivot.position.y,-1.05);}
  for(const b of DISTRICT){
   doors.activate(b.id);
   const matrix=buildingTransform(b),inverse=matrix.clone().invert(),p=new THREE.Vector3(19.1,1.645,-4).applyMatrix4(matrix),local=()=>p.clone().applyMatrix4(inverse);
   for(const x of [18.7,19.1,19.55])for(const edge of [-5.85,-6.12,-6.39,-6.66,-6.93,-7.20])for(const dz of [-.001,0,.001]){
    ray.set(new THREE.Vector3(x,.35,edge+dz).applyMatrix4(matrix),new THREE.Vector3(0,-1,0));ray.far=1.6;
    const floor=world.firstHit(ray,{floor:true});assert(floor,`${b.id}: supported stair seam ${x},${edge+dz}`);assert(floor.point.y<.10&&floor.point.y> -1.10);
   }
   const toggle=id=>assert(doors.onSelect({action:'district-door',doorId:id},b.id));
   const walk=goal=>{const delta=new THREE.Vector3(goal[0]-local().x,0,goal[1]-local().z),length=delta.length();if(length<1e-5)return;const steps=Math.ceil(length/.025),d=delta.transformDirection(matrix).multiplyScalar(length/steps);for(let i=0;i<steps;i++)assert(stepWalker(p,d.x,d.z,world,ray),`${b.id} walk towards ${goal} at ${local().toArray()}`);};
   walk([19.1,-7.65]);assert(Math.abs(local().y-.595)<.04,`${b.id}: descent finishes before the meter door`);
   // Independent closed-door probes at shin and torso height.
   for(const [id,x,z,dx] of [['bd-0-4',19.35,-7.75,1],['bd-0-5',18.8,-8.4,-1]])for(const y of [-.55,.15]){
    ray.set(new THREE.Vector3(x,y,z).applyMatrix4(matrix),new THREE.Vector3(dx,0,0).transformDirection(matrix));ray.far=.75;
    assert.equal(world.firstHit(ray)?.object.userData.doorId,id,b.id+': closed service door is physical');
   }
   toggle('bd-0-4');
   for(const goal of [[21,-7.65],[21,-7],[21,-7.65],[19.1,-7.65]])walk(goal);
   toggle('bd-0-4'); // Its documented outward swing must clear the pump route.
   walk([19.1,-8.4]);toggle('bd-0-5');
   for(const goal of [[17.85,-8.4],[17.85,-6.25],[17.4,-6.25],[17.85,-6.25],[17.85,-8.4],[19.1,-8.4]])walk(goal);
   toggle('bd-0-5');walk([19.1,-4]);assert(Math.abs(local().y-1.645)<.03,`${b.id}: returns to lobby floor`);
   for(const id of ['pump','meters']){const destination=nav.destinations.find(d=>d.id===id);assert(destination,id);const spawn=destinationStandingPose(destination,nav,b,world);assert(spawn,`${b.id}: safe spawn ${id}`);assert(spawn.position.y<.65);assert(stepWalker(spawn.position,.01,0,world,ray)||stepWalker(spawn.position,0,.01,world,ray));}
   assert(safeTourDestination(nav,{building:b.id,floor:0,unit:4},DISTRICT,world));
  }
  assert.equal(doors.stats.overrides,0);
 }finally{doors.dispose();world.dispose();district.dispose();disposeObjectResources(model);}
});
