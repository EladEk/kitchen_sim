import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';

const load=async name=>JSON.parse(await readFile('dist/client/baseline/'+name+'.json','utf8'));
function flight(level){const [a,b]=BUILDING_INTERIORS.floors[level].stairs.rect,mx=(a[0]+b[0])/2;return {west:(a[0]+mx-.12)/2,east:(b[0]+mx+.12)/2,entry:a[1]+1.15,turn:b[1]-.69,mx,mid:(a[1]+1.55+b[1]-1.14)/2};}

test('the exported district permits continuous common-stair ascent and descent through all nine floors in every rotated and reflected building',async()=>{
 const [json,site]=await Promise.all(['building','site'].map(load)),model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 try{
  for(const building of DISTRICT){const matrix=buildingTransform(building),inverse=matrix.clone().invert(),start=flight(0),p=new THREE.Vector3(start.west,1.61,start.entry).applyMatrix4(matrix),local=()=>p.clone().applyMatrix4(inverse);
   // A few millimetres of registration difference between adjacent source
   // sheets must not leave a hole whose failure depends on step timing.
   for(let level=1;level<=8;level++){const lower=flight(level-1),upper=flight(level);for(let z=Math.min(lower.entry,upper.entry)+.39;z<=Math.max(lower.entry,upper.entry)+.41;z+=.0005){const origin=new THREE.Vector3(lower.east,BUILDING_FLOORS[level].elevation+.32,z).applyMatrix4(matrix);ray.set(origin,new THREE.Vector3(0,-1,0));ray.far=.72;const hit=world.firstHit(ray,{floor:true});assert(hit&&Math.abs(hit.point.y-BUILDING_FLOORS[level].elevation)<.025,`${building.id} continuous support at landing ${level}, z=${z}`);}}
   // 5 cm is the maximum physical substep used by fast walking and WebXR.
   const stride=building.id==='3461'?.05:.025;
   const walk=goal=>{const here=local(),delta=new THREE.Vector3(goal[0]-here.x,0,goal[1]-here.z),length=delta.length(),count=Math.ceil(length/stride);if(!count)return;const d=delta.transformDirection(matrix).multiplyScalar(length/count);for(let i=0;i<count;i++){const before=p.y;assert(stepWalker(p,d.x,d.z,world,ray),`${building.id} blocked at ${local().toArray()} towards ${goal}`);assert(Math.abs(p.y-before)<.20,'each move follows a tread without jumping a floor');if(i%8===0){ray.set(p.clone().add(new THREE.Vector3(0,-1.60,0)),new THREE.Vector3(0,1,0));ray.far=1.95;assert(!world.firstHit(ray,{any:true}),`${building.id} needs standing headroom at ${local().toArray()}`);}}};
   const atFloor=level=>assert(Math.abs(local().y-1.62-BUILDING_FLOORS[level].elevation)<.035,`${building.id} reaches floor ${level}`);
   atFloor(0);
   for(let level=0;level<8;level++){const f=flight(level);walk([f.west,f.entry]);walk([f.west,f.turn]);walk([f.east,f.turn]);walk([f.east,f.entry]);atFloor(level+1);}
   for(let level=7;level>=0;level--){const f=flight(level);walk([f.east,f.entry]);walk([f.east,f.turn]);walk([f.west,f.turn]);walk([f.west,f.entry]);atFloor(level);}
   // The fix must retain the physical centre guard, rather than bypass it.
   const f=flight(0);walk([f.west,f.mid]);const across=new THREE.Vector3(1,0,0).transformDirection(matrix).multiplyScalar(.025);let blocked=false;for(let i=0;i<65;i++)if(!stepWalker(p,across.x,across.z,world,ray)){blocked=true;break;}assert(blocked&&local().x<f.mx,'the guard still separates the two flights');
  }
  assert.equal(world.stats.collisionCopies,1,'the buildings retain their shared collision index');
 }finally{world.dispose();district.dispose();disposeObjectResources(model);}
});
