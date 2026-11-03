import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {destinationStandingPose,safeTourDestination} from '../public-view/tour-tools.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';
const load=async n=>JSON.parse(await readFile('dist/client/baseline/'+n+'.json','utf8'));

test('the real district floor rays descend, reach both service rooms and climb back in all eight buildings',async()=>{
 const [json,site,nav]=await Promise.all(['building','site','navigation'].map(load)),model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 try{
  for(const b of DISTRICT){const matrix=buildingTransform(b),inverse=matrix.clone().invert(),p=new THREE.Vector3(19.05,1.645,-4).applyMatrix4(matrix);
   const local=()=>p.clone().applyMatrix4(inverse),walk=goal=>{const delta=new THREE.Vector3(goal[0]-local().x,0,goal[1]-local().z),length=delta.length(),steps=Math.ceil(length/.025),d=delta.transformDirection(matrix).multiplyScalar(length/steps);for(let i=0;i<steps;i++){assert(stepWalker(p,d.x,d.z,world,ray),`${b.id} can walk towards ${goal} at ${local().toArray()}`);}};
   walk([19.05,-8.4]);assert(local().y<.65,`${b.id}: no grass bridges the service void`);
   for(const route of [[[17.85,-8.4],[17.85,-6.25],[17.4,-6.25],[17.85,-6.25],[17.85,-8.4],[19.05,-8.4]],[[19.05,-7.7],[21,-7.7],[21,-7],[21,-7.7],[19.05,-7.7],[19.05,-8.4]]])for(const goal of route)walk(goal);
   walk([19.05,-4]);assert(Math.abs(local().y-1.645)<.03,`${b.id}: returns to lobby floor`);
   for(const id of ['pump','meters']){const destination=nav.destinations.find(d=>d.id===id||id==='meters'&&/meter/.test(d.id));assert(destination,id);const spawn=destinationStandingPose(destination,nav,b,world);assert(spawn,`${b.id}: safe spawn ${id}`);assert(spawn.position.y<.65);assert(stepWalker(spawn.position,.01,0,world,ray)||stepWalker(spawn.position,0,.01,world,ray));}
   assert(safeTourDestination(nav,{building:b.id,floor:0,unit:4},DISTRICT,world));
  }
 }finally{world.dispose();district.dispose();disposeObjectResources(model);}
});
